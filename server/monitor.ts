import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

type Source = "btk" | "guvenlinet";
type ChallengeState = { source: Source; cookie: string; queryUrl: string; createdAt: number };
export type SourceResult = { source: Source; status: "blocked" | "clear" | "review" | "captcha_invalid"; verdict: string; evidence: string; sourceUrl: string };
export type ChallengeImage = { challengeId: string; image: string };
export type MonitorChallenge = { domain: string; sources: Partial<Record<Source, ChallengeImage>>; sourceErrors: Partial<Record<Source, string>>; expiresIn: number };
type OpenedChallenge = { source: Source; image: string; cookie: string; queryUrl: string };

const BTK_BASES = ["https://internet.btk.gov.tr", "https://internet2.btk.gov.tr"];
const GUVENLINET_URL = "https://www.guvenlinet.org.tr/sorgula";
const TTL = 5 * 60 * 1000;
const challenges = new Map<string, ChallengeState>();

type SiteResponse = { ok: boolean; status: number; headers: { get: (name: string) => string | null; getSetCookie: () => string[] }; text: () => Promise<string>; arrayBuffer: () => Promise<ArrayBuffer> };
const TRUSTED_SOURCE_HOSTS = new Set(["internet.btk.gov.tr", "internet2.btk.gov.tr", "www.guvenlinet.org.tr"]);

const execFileAsync = promisify(execFile);
async function siteRequest(url: string, init: { method?: string; headers?: Record<string, string>; body?: string | URLSearchParams; timeoutMs: number }): Promise<SiteResponse> {
  const parsed = new URL(url);
  if (!TRUSTED_SOURCE_HOSTS.has(parsed.hostname)) throw new Error("İzin verilmeyen kaynak hostu.");
  const directory = await mkdtemp(path.join(os.tmpdir(), "sinyal-source-"));
  const headerFile = path.join(directory, "headers.txt");
  const bodyFile = path.join(directory, "body.bin");
  try {
    const args = ["-k", "-sS", "-L", "--max-time", String(Math.ceil(init.timeoutMs / 1000)), "-D", headerFile, "-o", bodyFile, "-X", init.method ?? "GET"];
    const btkProxy = process.env.BTK_PROXY_URL?.trim();
    if (parsed.hostname.includes("btk.gov.tr") && btkProxy) args.push("--proxy", btkProxy);
    for (const [key, value] of Object.entries(init.headers ?? {})) args.push("-H", `${key}: ${value}`);
    if (init.body !== undefined) args.push("--data-raw", typeof init.body === "string" ? init.body : init.body.toString());
    await execFileAsync("curl", [...args, url], { timeout: init.timeoutMs + 3000, maxBuffer: 1024 * 1024 });
    const rawHeaders = await readFile(headerFile, "utf8");
    const blocks = rawHeaders.split(/\r?\n\r?\n/).filter((block) => /^HTTP\//m.test(block));
    const finalHeaders = blocks.at(-1) ?? "";
    const status = Number(finalHeaders.match(/^HTTP\/\S+\s+(\d+)/m)?.[1] ?? 500);
    const headerMap = new Map<string, string>();
    const setCookies: string[] = [];
    for (const line of finalHeaders.split(/\r?\n/).slice(1)) {
      const separator = line.indexOf(":");
      if (separator < 1) continue;
      const key = line.slice(0, separator).toLowerCase();
      const value = line.slice(separator + 1).trim();
      if (key === "set-cookie") setCookies.push(value); else headerMap.set(key, value);
    }
    const body = await readFile(bodyFile);
    return { ok: status >= 200 && status < 300, status, headers: { get: (name) => headerMap.get(name.toLowerCase()) ?? null, getSetCookie: () => setCookies }, text: async () => body.toString("utf8"), arrayBuffer: async () => { const copy = new Uint8Array(body.byteLength); copy.set(body); return copy.buffer; } };
  } catch (error) {
    if (error instanceof Error && (error.message.includes("timed out") || error.message.includes("TIMEOUT"))) throw new Error("Kaynak zaman aşımı.");
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

function cookies(response: SiteResponse) {
  const values = response.headers.getSetCookie?.() ?? [];
  return values.map((value) => value.split(";", 1)[0]).join("; ");
}
function mergeCookies(...headers: string[]) {
  const map = new Map<string, string>();
  for (const header of headers) for (const pair of header.split(";").map((part) => part.trim()).filter(Boolean)) {
    const separator = pair.indexOf("=");
    if (separator > 0) map.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
  return Array.from(map.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
}
function cleanDomain(value: string) {
  return value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/", 1)[0].toLowerCase();
}
function textOnly(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}
function errorMessage(error: unknown, source: Source) {
  if (error instanceof Error && error.name === "TimeoutError") return `${source === "btk" ? "BTK" : "GüvenliNet"} kaynağı zaman aşımına uğradı.`;
  return error instanceof Error ? error.message : `${source === "btk" ? "BTK" : "GüvenliNet"} kaynağına ulaşılamadı.`;
}
function statusFromText(text: string): SourceResult["status"] {
  if (/güvenlik kodunu\s+(yanlış|hatalı|geçersiz)|(?:captcha|security code).{0,40}(yanlış|hatalı|geçersiz|invalid|incorrect)/i.test(text)) return "captcha_invalid";
  if (/erişime engellenmiştir|erişim engeli|engellenmiştir|has been blocked|uygulanmakta olan kararlar|erişilmemektedir|erişilmesin|zararlı içerik/i.test(text)) return "blocked";
  if (/karar bulunamadı|uygulanan bir karar bulunamadı|herhangi bir karar bulunamadı|engel bulunamadı|profil dışında/i.test(text)) return "clear";
  return "review";
}
export const classifySourceText = statusFromText;
function verdict(status: SourceResult["status"], source: Source) {
  const name = source === "btk" ? "BTK" : "GüvenliNet";
  return status === "blocked" ? `${name}: erişim/profil engeli kaydı bulundu.` : status === "clear" ? `${name}: engel kaydı bulunamadı.` : status === "captcha_invalid" ? `${name}: CAPTCHA doğrulanamadı.` : `${name}: yanıt alındı; ayrıntılı inceleme gerekli.`;
}
function imageResult(source: Source, response: SiteResponse, pageCookie: string, queryUrl: string): Promise<OpenedChallenge> {
  return response.arrayBuffer().then((bytes) => {
    const type = response.headers.get("content-type")?.split(";", 1)[0] || "image/png";
    if (!type.startsWith("image/")) throw new Error(`${source === "btk" ? "BTK" : "GüvenliNet"} CAPTCHA görseli alınamadı.`);
    return { source, image: `data:${type};base64,${Buffer.from(bytes).toString("base64")}`, cookie: mergeCookies(pageCookie, cookies(response)), queryUrl };
  });
}
async function openBtk() {
  let lastError: unknown = new Error("BTK kaynağına ulaşılamadı.");
  for (const base of BTK_BASES) {
    const queryUrl = `${base}/sitesorgu/`;
    try {
      const page = await siteRequest(queryUrl, { headers: { "User-Agent": "Sinyal/1.0" }, timeoutMs: 9000 });
      if (!page.ok) throw new Error(`BTK sayfası HTTP ${page.status} döndürdü`);
      const html = await page.text();
      const pageCookie = cookies(page);
      const path = html.match(/<div[^>]*class=["'][^"']*arama_captcha[^"']*["'][\s\S]*?<img[^>]+src=["']([^"']+)["']/i)?.[1]?.replaceAll("&amp;", "&") ?? "/sitesorgu/captcha.php";
      const imageUrl = new URL(path, queryUrl).toString();
      const image = await siteRequest(imageUrl, { headers: { Cookie: pageCookie, Referer: queryUrl, "User-Agent": "Sinyal/1.0" }, timeoutMs: 9000 });
      if (!image.ok) throw new Error(`BTK CAPTCHA HTTP ${image.status} döndürdü`);
      return await imageResult("btk", image, pageCookie, queryUrl);
    } catch (error) { lastError = error; }
  }
  throw new Error(errorMessage(lastError, "btk"));
}
async function openGuvenli() {
  const page = await siteRequest(GUVENLINET_URL, { headers: { "User-Agent": "Sinyal/1.0" }, timeoutMs: 30000 });
  if (!page.ok) throw new Error(`GüvenliNet sayfası HTTP ${page.status} döndürdü`);
  const html = await page.text();
  const pageCookie = cookies(page);
  const path = html.match(/<img[^>]+src=["']([^"']*captcha\/get_captcha\.php[^"']*)["']/i)?.[1] ?? "/captcha/get_captcha.php";
  const imageUrl = new URL(path, GUVENLINET_URL).toString();
  const image = await siteRequest(imageUrl, { headers: { Cookie: pageCookie, Referer: GUVENLINET_URL, "User-Agent": "Sinyal/1.0" }, timeoutMs: 30000 });
  if (!image.ok) throw new Error(`GüvenliNet CAPTCHA HTTP ${image.status} döndürdü`);
  return await imageResult("guvenlinet", image, pageCookie, GUVENLINET_URL);
}

export async function createMonitorChallenge(domain: string): Promise<MonitorChallenge> {
  const clean = cleanDomain(domain);
  if (!clean || !/^[a-z0-9.-]+$/i.test(clean)) throw new Error("Geçerli bir domain girin.");
  const [btk, guvenlinet] = await Promise.allSettled([openBtk(), openGuvenli()]);
  const sources: Partial<Record<Source, ChallengeImage>> = {};
  const sourceErrors: Partial<Record<Source, string>> = {};
  const opened: OpenedChallenge[] = [];
  if (btk.status === "fulfilled") opened.push(btk.value); else sourceErrors.btk = errorMessage(btk.reason, "btk");
  if (guvenlinet.status === "fulfilled") opened.push(guvenlinet.value); else sourceErrors.guvenlinet = errorMessage(guvenlinet.reason, "guvenlinet");
  for (const item of opened) {
    const challengeId = randomUUID();
    challenges.set(challengeId, { source: item.source, cookie: item.cookie, queryUrl: item.queryUrl, createdAt: Date.now() });
    sources[item.source] = { challengeId, image: item.image };
  }
  if (opened.length === 0) throw new Error(Object.values(sourceErrors).join(" ") || "Hiçbir sorgu kaynağına ulaşılamadı.");
  return { domain: clean, sources, sourceErrors, expiresIn: TTL / 1000 };
}

export async function querySource(input: { challengeId: string; domain: string; securityCode: string }): Promise<SourceResult> {
  cleanupMonitorChallenges();
  const challenge = challenges.get(input.challengeId);
  if (!challenge || Date.now() - challenge.createdAt > TTL) throw new Error("CAPTCHA oturumu sona erdi; yeni sorgu başlatın.");
  const domain = cleanDomain(input.domain);
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) throw new Error("Geçerli bir domain girin.");
  const body = challenge.source === "btk" ? new URLSearchParams({ deger: domain, ipw: "", kat: "", tr: "", eg: "", ayrintili: "0", submit: "Sorgula", security_code: input.securityCode.trim() }) : new URLSearchParams({ domain_name: domain, security_code: input.securityCode.trim(), sorgula: "Sorgula" });
  const endpoint = challenge.source === "guvenlinet" ? "https://www.guvenlinet.org.tr/ajax/sorgu/sorgula.php" : challenge.queryUrl;
  const response = await siteRequest(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: challenge.cookie, Host: new URL(challenge.queryUrl).host, Referer: challenge.queryUrl, Origin: new URL(challenge.queryUrl).origin, "User-Agent": "Sinyal/1.0" }, body, timeoutMs: 20000 });
  const raw = await response.text();
  challenges.delete(input.challengeId);
  const evidence = textOnly(raw).slice(0, 1200);
  const status = statusFromText(evidence);
  return { source: challenge.source, status, verdict: verdict(status, challenge.source), evidence, sourceUrl: challenge.queryUrl };
}

export function cleanupMonitorChallenges() {
  const now = Date.now();
  for (const [id, item] of Array.from(challenges.entries())) if (now - item.createdAt > TTL) challenges.delete(id);
}
export type { Source };
