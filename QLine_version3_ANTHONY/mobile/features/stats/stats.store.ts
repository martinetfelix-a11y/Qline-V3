import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getKpis, getTimeseries } from "./stats.api";

export function useStats(commerceId: string) {
  const { auth } = useAuth();
  const token = auth?.token;
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const [kpis, setKpis] = useState<any>(null);
  const [series, setSeries] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getKpis(token, commerceId, day),
      getTimeseries(token, commerceId, day)
    ])
      .then(([k, s]) => {
        setKpis(k);
        setSeries(s);
      })
      .finally(() => setLoading(false));
  }, [token, commerceId]);

  return { day, kpis, series, loading };
}
