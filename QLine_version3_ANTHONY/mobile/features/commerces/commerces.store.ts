import { useEffect, useState } from "react";
import { fetchCommerces } from "./commerces.api";
import { useAuth } from "../auth/AuthProvider";

export type Commerce = { id: string; name: string };

export function useCommerces() {
  const { auth } = useAuth();
  const [commerces, setCommerces] = useState<Commerce[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth?.token) return;
    setLoading(true);
    fetchCommerces(auth.token)
      .then((data) => setCommerces(data.commerces || []))
      .finally(() => setLoading(false));
  }, [auth?.token]);

  return { commerces, loading };
}
