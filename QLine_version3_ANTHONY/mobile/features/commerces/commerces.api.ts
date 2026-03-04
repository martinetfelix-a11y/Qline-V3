import { API_BASE } from "../config";

export async function fetchCommerces(token: string) {
  const r = await fetch(`${API_BASE}/commerces`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("commerces_failed");
  return r.json();
}

export async function fetchPublicCommerces() {
  const r = await fetch(`${API_BASE}/commerces/public`);
  if (!r.ok) throw new Error("commerces_public_failed");
  return r.json();
}
