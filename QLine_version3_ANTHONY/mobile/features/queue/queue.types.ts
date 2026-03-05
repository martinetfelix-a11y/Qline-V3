export type Eta = { mean: number; low: number; high: number; avgServiceSec: number };
export type TicketStatus = "active" | "called" | "served" | "cancelled" | "unknown";
export type QueueItem = { id: string; joinedAt: string; waitSec?: number; userEmail?: string | null };
export type SavedTicket = { commerceId: string; ticketId: string };
