import { API_BASE } from "../config";

export async function fetchCommerces(token: string) {
  try {
    const r = await fetch(`${API_BASE}/commerces`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) throw new Error(`commerces_failed_${r.status}`);
    return r.json();
  } catch (e) {
    throw new Error(`commerces_failed_${String(e)}`);
  }
}

export async function fetchPublicCommerces() {
  try {
    const r = await fetch(`${API_BASE}/commerces/public`);
    if (!r.ok) throw new Error(`commerces_public_failed_${r.status}`);
    return r.json();
  } catch (e) {
    throw new Error(`commerces_public_failed_${String(e)}`);
  }
}
