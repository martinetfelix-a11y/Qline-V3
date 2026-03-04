import { API_BASE } from "../config";

export async function getKpis(token: string, commerceId: string, day: string) {
  const url = new URL(`${API_BASE}/stats/kpis`);
  url.searchParams.set("commerceId", commerceId);
  url.searchParams.set("day", day);
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("kpis_failed");
  return r.json();
}

export async function getTimeseries(token: string, commerceId: string, day: string) {
  const url = new URL(`${API_BASE}/stats/timeseries`);
  url.searchParams.set("commerceId", commerceId);
  url.searchParams.set("day", day);
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("timeseries_failed");
  return r.json();
}

export async function getDistribution(token: string, commerceId: string, day: string) {
  const url = new URL(`${API_BASE}/stats/distribution`);
  url.searchParams.set("commerceId", commerceId);
  url.searchParams.set("day", day);
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) throw new Error("distribution_failed");
  return r.json();
}
