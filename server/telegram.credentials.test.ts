import { describe, expect, it } from "vitest";

describe("Telegram bot credentials", () => {
  it("accepts the configured bot token", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN test ortamında tanımlı değil.");
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(15000) });
    const payload = await response.json() as { ok: boolean };
    expect(response.ok).toBe(true);
    expect(payload.ok).toBe(true);
  }, 20_000);
});
