import { Redirect } from "expo-router";
import { useAuth } from "../features/auth/AuthProvider";

export default function Index() {
  const { auth } = useAuth();

  if (!auth?.token) return <Redirect href="/login" />;
  if (auth.role === "merchant") return <Redirect href="/(merchant)/dashboard" />;
  return <Redirect href="/(user)/commerces" />;
}
