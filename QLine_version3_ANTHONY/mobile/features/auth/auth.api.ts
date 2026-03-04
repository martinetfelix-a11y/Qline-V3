import { API_BASE } from "../config";

export async function apiLogin(email: string, password: string) {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) throw new Error("login_failed");
  return r.json();
}

export async function apiSignup(params: { email: string; password: string; role: "user" | "merchant"; commerceId?: string }) {
  const r = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error("signup_failed"), { code: j.error || "signup_failed" });
  }
  return r.json();
}
