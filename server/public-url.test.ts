import { describe, expect, it } from "vitest";

describe("public webhook URL", () => {
  it("uses HTTPS when configured", () => {
    const baseUrl = process.env.PUBLIC_BASE_URL?.trim();
    if (!baseUrl) throw new Error("PUBLIC_BASE_URL test ortamında tanımlı değil.");
    expect(new URL(baseUrl).protocol).toBe("https:");
  });
});
