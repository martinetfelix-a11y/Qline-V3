import { API_BASE } from "../config";

export async function joinQueue(token: string, commerceId: string) {
  const r = await fetch(`${API_BASE}/queue/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error("join_failed"), { code: j.error || "join_failed" });
  }
  return r.json();
}

export async function getQueueState(token: string, commerceId: string, ticketId?: string | null) {
  const url = new URL(`${API_BASE}/queue/state`);
  url.searchParams.set("commerceId", commerceId);
  if (ticketId) url.searchParams.set("ticketId", ticketId);
  const r = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw new Error("state_failed");
  return r.json();
}

export async function cancelQueueTicket(token: string, commerceId: string, ticketId?: string) {
  const r = await fetch(`${API_BASE}/queue/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId, ...(ticketId ? { ticketId } : {}) }),
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw Object.assign(new Error("cancel_failed"), { code: j.error || "cancel_failed" });
  }
  return r.json();
}

export async function merchantNext(token: string, commerceId: string, durationSec?: number) {
  const r = await fetch(`${API_BASE}/queue/next`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId, durationSec }),
  });
  if (!r.ok) throw new Error("next_failed");
  return r.json();
}

export async function merchantClose(token: string, commerceId: string) {
  const r = await fetch(`${API_BASE}/queue/close`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId }),
  });
  if (!r.ok) throw new Error("close_failed");
  return r.json();
}

export async function merchantOpen(token: string, commerceId: string) {
  const r = await fetch(`${API_BASE}/queue/open`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId }),
  });
  if (!r.ok) throw new Error("open_failed");
  return r.json();
}

export async function merchantPause(token: string, commerceId: string, paused: boolean) {
  const r = await fetch(`${API_BASE}/queue/pause`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId, paused }),
  });
  if (!r.ok) throw new Error("pause_failed");
  return r.json();
}

export async function merchantSetAvg(token: string, commerceId: string, avgMin: number) {
  const r = await fetch(`${API_BASE}/queue/model`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ commerceId, avgMin }),
  });
  if (!r.ok) throw new Error("model_failed");
  return r.json();
}
