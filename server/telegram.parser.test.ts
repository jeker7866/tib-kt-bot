import { describe, expect, it } from "vitest";
import { parseCode } from "./telegram";

describe("Telegram CAPTCHA code parser", () => {
  it("accepts a plain code when replying to a BTK CAPTCHA", () => {
    expect(parseCode("AbC123", "btk")).toEqual({ source: "btk", code: "AbC123" });
  });

  it("accepts a plain code when replying to a GüvenliNet CAPTCHA", () => {
    expect(parseCode("9xY7z", "guvenlinet")).toEqual({ source: "guvenlinet", code: "9xY7z" });
  });

  it("keeps explicit source commands working", () => {
    expect(parseCode("/kod btk KOD42")).toEqual({ source: "btk", code: "KOD42" });
  });

  it("removes copy-format brackets around an explicit code", () => {
    expect(parseCode("/kod btk <dMWEG>")).toEqual({ source: "btk", code: "dMWEG" });
  });

  it("does not treat arbitrary text as a CAPTCHA code", () => {
    expect(parseCode("merhaba dünya!", "btk")).toBeNull();
  });
});
