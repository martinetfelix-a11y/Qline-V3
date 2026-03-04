import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import type { Eta, QueueItem } from "./queue.types";
import { joinQueue, getQueueState } from "./queue.api";
import { loadTicket, saveTicket, clearTicket } from "./queue.storage";

export function useUserQueue() {
  const { auth } = useAuth();
  const token = auth?.token;

  const [commerceId, setCommerceId] = useState("c1");
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [position, setPosition] = useState<number | null>(null);
  const [eta, setEta] = useState<Eta | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const t = await loadTicket();
      if (t) {
        setCommerceId(t.commerceId);
        setTicketId(t.ticketId);
      }
    })();
  }, []);

  const refresh = async () => {
    if (!token) return;
    try {
      const data = await getQueueState(token, commerceId, ticketId);
      setQueue(data.queue || []);
      setPosition(data.my?.position ?? null);
      setEta(data.eta ?? null);
      setServerTime(data.serverTime ?? null);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2500);
    return () => clearInterval(id);
  }, [token, commerceId, ticketId]);

  const join = async (overrideCommerceId?: string) => {
    if (!token) return;
    const cid = overrideCommerceId || commerceId;
    setError(null);
    try {
      const data = await joinQueue(token, cid);
      setCommerceId(cid);
      setTicketId(data.ticketId);
      await saveTicket({ commerceId: cid, ticketId: data.ticketId });
      await refresh();
    } catch (e: any) {
      const code = e?.code || e?.message;
      if (code === "queue_closed") setError("File fermée. Impossible de prendre un ticket.");
      else if (code === "queue_paused") setError("File en pause. Réessaie plus tard.");
      else setError("Impossible de rejoindre la file.");
    }
  };

  const clearLocal = async () => {
    setTicketId(null);
    setPosition(null);
    setEta(null);
    await clearTicket();
  };

  return {
    commerceId,
    setCommerceId,
    ticketId,
    queue,
    position,
    eta,
    serverTime,
    error,
    join,
    refresh,
    clearLocal
  };
}
