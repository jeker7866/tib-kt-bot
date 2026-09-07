import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("BTK proxy configuration", () => {
  it("reaches the BTK CAPTCHA page through the configured proxy", async () => {
    const proxy = process.env.BTK_PROXY_URL?.trim();
    if (!proxy) throw new Error("BTK_PROXY_URL test ortamında tanımlı değil.");
    const { stdout } = await execFileAsync("curl", ["-k", "-sS", "-L", "--max-time", "20", "--proxy", proxy, "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code}", "https://internet.btk.gov.tr/sitesorgu/"], { timeout: 25_000 });
    expect(stdout.trim()).toBe("200");
  }, 30_000);
});
