import { ReactNode, useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmpresaPlan } from "@/hooks/useEmpresaPlan";
import { isRouteLockedForPlan } from "@/lib/planLimits";

interface Props {
  children: ReactNode;
}

export function PlanGuard({ children }: Props) {
  const { pathname } = useLocation();
  const plan = useEmpresaPlan();
  const locked = isRouteLockedForPlan(pathname, plan);

  useEffect(() => {
    if (locked) {
      toast("Este módulo está disponible desde el Plan Pyme", {
        action: { label: "Ver planes", onClick: () => { window.location.href = "/planes"; } },
      });
    }
  }, [locked]);

  if (locked) return <Navigate to="/planes" replace />;
  return <>{children}</>;
}
