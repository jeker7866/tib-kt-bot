import { describe, expect, it } from "vitest";
import { createLinkWatch } from "./watcher";

describe("link watcher configuration", () => {
  it("rejects unsupported protocols", async () => {
    await expect(createLinkWatch("ftp://example.com/file", 30)).rejects.toThrow("http veya https");
  });

  it("rejects unsupported intervals", async () => {
    await expect(createLinkWatch("https://example.com", 45)).rejects.toThrow("Geçersiz kontrol periyodu");
  });

  it("rejects local network targets", async () => {
    await expect(createLinkWatch("http://127.0.0.1:3000", 30)).rejects.toThrow("Yerel ağ");
  });
});
