import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SavedTicket } from "./queue.types";

const KEY = "qline_ticket_v2";

export async function saveTicket(t: SavedTicket) {
  await AsyncStorage.setItem(KEY, JSON.stringify(t));
}

export async function loadTicket(): Promise<SavedTicket | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as SavedTicket) : null;
}

export async function clearTicket() {
  await AsyncStorage.removeItem(KEY);
}
