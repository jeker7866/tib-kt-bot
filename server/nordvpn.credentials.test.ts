import { describe, expect, it } from "vitest";

describe("NordVPN service credentials", () => {
  it("loads the supplied secret and reaches NordVPN server recommendations without exposing it", async () => {
    const username = process.env.NORDVPN_SERVICE_USERNAME?.trim();
    const password = process.env.NORDVPN_SERVICE_PASSWORD?.trim();
    if (!username || !password) throw new Error("NordVPN Service Credentials tanımlı değil.");
    const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    const response = await fetch("https://api.nordvpn.com/v1/servers/recommendations", {
      headers: { accept: "application/json", authorization },
      signal: AbortSignal.timeout(15_000),
    });
    expect(response.status).toBe(200);
    const body = await response.json() as unknown;
    expect(Array.isArray(body)).toBe(true);
  }, 20_000);
});
