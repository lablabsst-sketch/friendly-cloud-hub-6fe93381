import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePlan, type PlanName } from "@/lib/planLimits";

export function useEmpresaPlan(): PlanName {
  const { empresa } = useAuth();
  const [plan, setPlan] = useState<PlanName>("free");

  useEffect(() => {
    if (!empresa?.id) { setPlan("free"); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("empresas")
          .select("plan")
          .eq("id", empresa.id)
          .maybeSingle();
        if (!cancelled) setPlan(normalizePlan(data?.plan));
      } catch {
        if (!cancelled) setPlan("free");
      }
    })();
    return () => { cancelled = true; };
  }, [empresa?.id]);

  return plan;
}
