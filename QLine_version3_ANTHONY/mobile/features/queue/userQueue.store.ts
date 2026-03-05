import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import type { Eta, QueueItem, TicketStatus } from "./queue.types";
import { cancelQueueTicket, joinQueue, getQueueState } from "./queue.api";
import { loadTicket, saveTicket, clearTicket } from "./queue.storage";

type JoinSummary = {
  ticketId: string;
  position: number | null;
  joinedAt: string | null;
  eta: Eta | null;
  serverTime: string | null;
  status: TicketStatus;
};

export function useUserQueue() {
  const { auth } = useAuth();
  const token = auth?.token;

  const [commerceId, setCommerceId] = useState("c1");
  const [ticketId, setTicketId] = useState<string | null>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [nowServing, setNowServing] = useState<QueueItem | null>(null);
  const [position, setPosition] = useState<number | null>(null);
  const [eta, setEta] = useState<Eta | null>(null);
  const [status, setStatus] = useState<TicketStatus | null>(null);
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [calledAt, setCalledAt] = useState<string | null>(null);
  const [servedAt, setServedAt] = useState<string | null>(null);
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastJoin, setLastJoin] = useState<JoinSummary | null>(null);

  useEffect(() => {
    (async () => {
      const t = await loadTicket();
      if (t) {
        setCommerceId(t.commerceId);
        setTicketId(t.ticketId);
      }
    })();
  }, []);

  const applyMy = (my: any | null) => {
    if (!my) {
      setPosition(null);
      setEta(null);
      setStatus(null);
      setJoinedAt(null);
      setUpdatedAt(null);
      setCalledAt(null);
      setServedAt(null);
      setCancelledAt(null);
      return;
    }

    setPosition(typeof my.position === "number" ? my.position : null);
    setEta(my.eta ?? null);
    setStatus((my.status || "unknown") as TicketStatus);
    setJoinedAt(my.joinedAt ?? null);
    setUpdatedAt(my.updatedAt ?? null);
    setCalledAt(my.calledAt ?? null);
    setServedAt(my.servedAt ?? null);
    setCancelledAt(my.cancelledAt ?? null);
  };

  const refresh = async () => {
    if (!token) return;
    try {
      const data = await getQueueState(token, commerceId, ticketId);
      setError(null);
      setQueue(data.queue || []);
      setNowServing(data.nowServing ?? null);
      setServerTime(data.serverTime ?? null);
      applyMy(data.my ?? null);
    } catch {
      setError("Synchronisation impossible.");
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
    setNotice(null);

    try {
      const data = await joinQueue(token, cid);
      setCommerceId(cid);
      setTicketId(data.ticketId);
      await saveTicket({ commerceId: cid, ticketId: data.ticketId });

      setLastJoin({
        ticketId: data.ticketId,
        position: typeof data.position === "number" ? data.position : null,
        joinedAt: data.joinedAt ?? null,
        eta: data.eta ?? null,
        serverTime: data.serverTime ?? null,
        status: (data.status || "active") as TicketStatus,
      });
      setNotice(data.alreadyInQueue ? "Vous avez deja un rendez-vous actif." : "Rendez-vous confirme.");

      await refresh();
    } catch (e: any) {
      const code = e?.code || e?.message;
      if (code === "queue_closed") setError("File fermee. Impossible de prendre un rendez-vous.");
      else if (code === "queue_paused") setError("File en pause. Reessaie plus tard.");
      else if (code === "already_has_ticket") setError("Vous avez deja un rendez-vous actif dans une autre file.");
      else setError("Impossible de rejoindre la file.");
    }
  };

  const cancel = async () => {
    if (!token || !ticketId) return;
    setError(null);
    setNotice(null);

    try {
      await cancelQueueTicket(token, commerceId, ticketId);
      await clearTicket();
      setTicketId(null);
      setLastJoin(null);
      setNotice("Rendez-vous annule.");
      await refresh();
    } catch (e: any) {
      const code = e?.code || e?.message;
      if (code === "ticket_not_found") setError("Rendez-vous introuvable.");
      else setError("Annulation impossible.");
    }
  };

  const clearLocal = async () => {
    setTicketId(null);
    setPosition(null);
    setEta(null);
    setStatus(null);
    setJoinedAt(null);
    setUpdatedAt(null);
    setCalledAt(null);
    setServedAt(null);
    setCancelledAt(null);
    await clearTicket();
  };

  return {
    commerceId,
    setCommerceId,
    ticketId,
    queue,
    nowServing,
    position,
    eta,
    status,
    joinedAt,
    updatedAt,
    calledAt,
    servedAt,
    cancelledAt,
    serverTime,
    notice,
    error,
    lastJoin,
    join,
    cancel,
    refresh,
    clearLocal,
  };
}
