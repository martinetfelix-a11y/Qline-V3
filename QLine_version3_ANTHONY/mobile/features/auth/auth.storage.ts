import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "qline_auth_v2";

export type AuthState = {
  token: string;
  role: "user" | "merchant";
  email: string;
  commerceId?: string | null;
};

export async function saveAuth(state: AuthState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(state));
}

export async function loadAuth(): Promise<AuthState | null> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as AuthState) : null;
}

export async function clearAuth() {
  await AsyncStorage.removeItem(KEY);
}
