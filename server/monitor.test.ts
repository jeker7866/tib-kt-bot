import { describe, expect, it } from "vitest";
import { classifySourceText, createMonitorChallenge } from "./monitor";

describe("monitor source responses", () => {
  it("detects an access-block decision", () => {
    expect(classifySourceText("Bu alan adına erişim engellenmiştir.")).toBe("blocked");
  });

  it("detects a clear decision", () => {
    expect(classifySourceText("Uygulanan bir karar bulunamadı.")).toBe("clear");
  });

  it("detects an invalid captcha response", () => {
    expect(classifySourceText("Güvenlik kodunu yanlış girdiniz.")).toBe("captcha_invalid");
  });

  it("does not mark a normal page containing the word captcha as invalid", () => {
    expect(classifySourceText("Güvenlik kodu doğrulandı. CAPTCHA bölümü kapatıldı. Engel bulunamadı.")).toBe("clear");
  });

  it("rejects invalid domains before contacting a source", async () => {
    await expect(createMonitorChallenge("not a domain")).rejects.toThrow("Geçerli bir domain");
  });
});
