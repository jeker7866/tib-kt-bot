export type NordCountry = { code: string; name: string; serverCount: number };
export type NordStatus = { configured: boolean; state: "unavailable" | "disconnected" | "connected"; location: string | null; message: string };

export async function getNordCountries(): Promise<NordCountry[]> {
  const response = await fetch("https://api.nordvpn.com/v1/servers/countries", { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`NordVPN ülke listesi alınamadı (${response.status}).`);
  const countries = await response.json() as Array<{ code: string; name: string; serverCount: number }>;
  return countries.map(({ code, name, serverCount }) => ({ code, name, serverCount })).sort((a, b) => a.name.localeCompare(b.name));
}

export function getNordStatus(): NordStatus {
  const configured = Boolean(process.env.NORDVPN_SERVICE_USERNAME && process.env.NORDVPN_SERVICE_PASSWORD);
  const gatewayConfigured = Boolean(process.env.NORDVPN_GATEWAY_URL?.trim());
  if (!gatewayConfigured) return { configured, state: "unavailable", location: null, message: "Render ortamında NordVPN tüneli için ayrı bir VPN gateway gerekiyor. Sistem bağlı gösterilmiyor." };
  return { configured, state: "disconnected", location: null, message: "VPN gateway yapılandırıldı; bağlantı servisi bekleniyor." };
}
