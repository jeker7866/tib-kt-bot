import { randomUUID } from "node:crypto";
import { createMonitorChallenge, querySource, type Source, cleanupMonitorChallenges, type SourceResult } from "./monitor";

type TelegramResponse<T> = { ok: boolean; result?: T; description?: string };
type TelegramUpdate = { message?: { message_id: number; chat?: { id: number | string }; text?: string; reply_to_message?: { message_id?: number } } };
type Pending = { challengeId: string; domain: string; source: Source; messageId: number; createdAt: number };
const token = () => process.env.TELEGRAM_BOT_TOKEN?.trim();
const chatId = () => process.env.TELEGRAM_CHAT_ID?.trim();
const apiBase = () => token() ? `https://api.telegram.org/bot${token()}` : "";
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() || randomUUID().replaceAll("-", "");
const pending = new Map<string, Pending>();
const results = new Map<string, { domain: string; items: SourceResult[]; createdAt: number }>();
async function call<T>(method: string, init: RequestInit): Promise<TelegramResponse<T>> {
  if (!apiBase()) throw new Error("Telegram bot tokenu ayarlanmamış.");
  const response = await fetch(`${apiBase()}/${method}`, { ...init, signal: AbortSignal.timeout(30000) });
  const payload = await response.json() as TelegramResponse<T>;
  if (!response.ok || !payload.ok) throw new Error(payload.description || `Telegram ${method} başarısız.`);
  return payload;
}
export function telegramConfigured() { return Boolean(token() && chatId()); }
export function isTelegramWebhookAuthorized(received: string | undefined) { return Boolean(received && received === webhookSecret); }
export async function ensureTelegramWebhook(publicBaseUrl: string) {
  if (!telegramConfigured()) return false;
  await call("setWebhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: `${publicBaseUrl.replace(/\/$/, "")}/api/telegram/webhook`, allowed_updates: ["message"], secret_token: webhookSecret }) });
  return true;
}
async function sendMessage(text: string) {
  if (!telegramConfigured()) return { sent: false as const, reason: "not_configured" as const };
  await call("sendMessage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId(), text, disable_web_page_preview: true }) });
  return { sent: true as const };
}
async function sendCaptcha(item: { image: string; domain: string; source: Source; challengeId: string }) {
  if (!telegramConfigured()) return { sent: false as const, reason: "not_configured" as const };
  const match = item.image.match(/^data:(image\/[^;]+);base64,(.+)$/); if (!match) throw new Error("CAPTCHA görseli geçersiz.");
  const form = new FormData(); form.append("chat_id", chatId()!); form.append("caption", `SİNYAL ${item.source === "btk" ? "BTK" : "GÜVENLİNET"} CAPTCHA\nDomain: ${item.domain}\nKod için: /kod ${item.source} <kod>\nBu görseli yanıtlayarak da kod gönderebilirsiniz.`); form.append("photo", new Blob([Buffer.from(match[2], "base64")], { type: match[1] }), `${item.source}-captcha.png`);
  const result = await call<{ message_id: number }>("sendPhoto", { method: "POST", body: form });
  if (result.result?.message_id) pending.set(String(result.result.message_id), { challengeId: item.challengeId, domain: item.domain, source: item.source, messageId: result.result.message_id, createdAt: Date.now() });
  return { sent: true as const, messageId: result.result?.message_id };
}
export async function startTelegramMonitor(domain: string, publicBaseUrl: string) {
  const challenge = await createMonitorChallenge(domain);
  const sent = { btk: false, guvenlinet: false }; let telegramError = telegramConfigured() ? "" : "Telegram bot ayarları eksik; CAPTCHA görselleri yalnızca bu ekranda gösterilebilir.";
  try {
    if (telegramConfigured()) {
      await ensureTelegramWebhook(publicBaseUrl);
      const btk = challenge.sources.btk;
      if (btk) sent.btk = (await sendCaptcha({ ...btk, domain: challenge.domain, source: "btk" })).sent;
      const guvenlinet = challenge.sources.guvenlinet;
      if (guvenlinet) sent.guvenlinet = (await sendCaptcha({ ...guvenlinet, domain: challenge.domain, source: "guvenlinet" })).sent;
    }
  } catch (error) { telegramError = error instanceof Error ? error.message : "Telegram gönderimi başarısız."; }
  return { ...challenge, telegramSent: sent.btk && sent.guvenlinet, telegramError };
}
function parseCode(text: string) { const match = text.trim().match(/^\/?kod\s+(btk|guvenlinet)\s+([^\s]+)$/i) || text.trim().match(/^\/?(btk|guvenlinet)\s+([^\s]+)$/i); return match ? { source: match[1].toLowerCase() as Source, code: match[2] } : null; }
export async function handleTelegramUpdate(update: TelegramUpdate) {
  cleanupMonitorChallenges(); const message = update.message; if (!message?.chat || !chatId() || String(message.chat.id) !== chatId()) return { handled: false as const };
  const parsed = message.text ? parseCode(message.text) : null; if (!parsed) return { handled: false as const };
  const reply = message.reply_to_message?.message_id; const item = reply ? pending.get(String(reply)) : Array.from(pending.values()).sort((a, b) => b.createdAt - a.createdAt).find((x) => x.source === parsed.source); if (!item || item.source !== parsed.source || Date.now() - item.createdAt > 5 * 60 * 1000) { await sendMessage("Bekleyen CAPTCHA bulunamadı. Önce yeni domain kontrolü başlatın."); return { handled: true as const, status: "no_challenge" as const }; }
  try { const result = await querySource({ challengeId: item.challengeId, domain: item.domain, securityCode: parsed.code }); pending.delete(String(item.messageId)); const current = results.get(item.domain) || { domain: item.domain, items: [], createdAt: Date.now() }; current.items = [...current.items.filter((x) => x.source !== result.source), result]; current.createdAt = Date.now(); results.set(item.domain, current); const label = result.status === "blocked" ? "ENGEL VAR" : result.status === "clear" ? "ENGEL YOK" : result.status === "captcha_invalid" ? "CAPTCHA HATALI" : "İNCELEME GEREKLİ"; await sendMessage(`SİNYAL ${item.source === "btk" ? "BTK" : "GÜVENLİNET"}\nDomain: ${item.domain}\nDurum: ${label}\n${result.verdict}`); return { handled: true as const, status: result.status }; } catch (error) { await sendMessage(`Sorgu tamamlanamadı: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`); return { handled: true as const, status: "error" as const }; }
}
export function getMonitorResults(domain: string) { const result = results.get(domain); return result && Date.now() - result.createdAt < 5 * 60 * 1000 ? result.items : null; }
export type { TelegramUpdate };
