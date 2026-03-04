import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { getKpis, getTimeseries, getDistribution } from "./stats.api";

export function useStats(commerceId: string) {
  const { auth } = useAuth();
  const token = auth?.token;
  const day = new Date().toISOString().slice(0, 10);

  const [kpis, setKpis] = useState<any>(null);
  const [series, setSeries] = useState<any>(null);
  const [hist, setHist] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getKpis(token, commerceId, day),
      getTimeseries(token, commerceId, day),
      getDistribution(token, commerceId, day)
    ])
      .then(([k, s, h]) => {
        setKpis(k);
        setSeries(s);
        setHist(h);
      })
      .finally(() => setLoading(false));
  }, [token, commerceId]);

  return { day, kpis, series, hist, loading };
}
