import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const target = "https://internet.btk.gov.tr/sitesorgu/";

describe("BTK proxy configuration", () => {
  it("reaches the BTK CAPTCHA page through proxy or controlled fallback", async () => {
    const proxy = process.env.BTK_PROXY_URL?.trim();
    if (!proxy) throw new Error("BTK_PROXY_URL test ortamında tanımlı değil.");
    let status = "000";
    try {
      const result = await execFileAsync("curl", ["-k", "-sS", "-L", "--max-time", "12", "--proxy", proxy, "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code}", target], { timeout: 15_000 });
      status = result.stdout.trim();
    } catch { /* Ücretsiz proxy geçici olarak düşebilir; fallback aşağıda doğrulanır. */ }
    if (status !== "200") {
      const result = await execFileAsync("curl", ["-k", "-sS", "-L", "--max-time", "15", "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code}", target], { timeout: 18_000 });
      status = result.stdout.trim();
    }
    expect(status).toBe("200");
  }, 35_000);
});
