import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { nanoid } from "nanoid";
import { startTelegramMonitor } from "./telegram";

const execFileAsync = promisify(execFile);
export const WATCH_INTERVALS = [30, 60, 300, 600] as const;
export type WatchInterval = (typeof WATCH_INTERVALS)[number];
type Watch = { id: string; primaryUrl: string; intervalSeconds: WatchInterval; timer: NodeJS.Timeout; createdAt: number; lastResolvedUrl?: string; lastError?: string };
const watches = new Map<string, Watch>();

function validateUrl(value: string) {
  const url = new URL(value.trim());
  if (!/^https?:$/.test(url.protocol)) throw new Error("Yalnızca http veya https linkleri izlenebilir.");
  if (url.username || url.password) throw new Error("Kullanıcı adı ve şifre içeren linkler izlenemez.");
  if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(url.hostname) || url.hostname.endsWith(".local")) throw new Error("Yerel ağ linkleri izlenemez.");
  return url.toString();
}

async function resolveRedirect(url: string) {
  const { stdout } = await execFileAsync("curl", ["-k", "-sS", "-L", "--max-time", "15", "-o", "/dev/null", "-w", "%{url_effective}", url], { timeout: 20_000, maxBuffer: 4096 });
  return validateUrl(stdout.trim() || url);
}

async function runWatch(watch: Watch) {
  try {
    const resolved = await resolveRedirect(watch.primaryUrl);
    watch.lastResolvedUrl = resolved;
    watch.lastError = undefined;
    const urls = Array.from(new Set([watch.primaryUrl, resolved]));
    const baseUrl = process.env.PUBLIC_BASE_URL?.trim() || "";
    for (const target of urls) {
      await startTelegramMonitor(new URL(target).hostname, baseUrl);
    }
  } catch (error) {
    watch.lastError = error instanceof Error ? error.message : "İzleme sırasında hata oluştu.";
  }
}

export async function createLinkWatch(primaryUrl: string, intervalSeconds: number) {
  const url = validateUrl(primaryUrl);
  if (!WATCH_INTERVALS.includes(intervalSeconds as WatchInterval)) throw new Error("Geçersiz kontrol periyodu.");
  const id = nanoid(10);
  const watch = { id, primaryUrl: url, intervalSeconds: intervalSeconds as WatchInterval, timer: undefined as unknown as NodeJS.Timeout, createdAt: Date.now() };
  watch.timer = setInterval(() => { void runWatch(watch); }, watch.intervalSeconds * 1000);
  watch.timer.unref?.();
  watches.set(id, watch);
  await runWatch(watch);
  return publicWatch(watch);
}

export function stopLinkWatch(id: string) {
  const watch = watches.get(id);
  if (!watch) return false;
  clearInterval(watch.timer);
  watches.delete(id);
  return true;
}

export function listLinkWatches() { return Array.from(watches.values()).map(publicWatch); }
function publicWatch(watch: Watch) { return { id: watch.id, primaryUrl: watch.primaryUrl, resolvedUrl: watch.lastResolvedUrl ?? null, intervalSeconds: watch.intervalSeconds, createdAt: watch.createdAt, lastError: watch.lastError ?? null }; }
