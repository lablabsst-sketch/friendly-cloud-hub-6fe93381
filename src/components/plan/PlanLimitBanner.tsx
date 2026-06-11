import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PLAN_LABELS, type PlanName } from "@/lib/planLimits";

interface Props {
  plan: PlanName;
  resource: "trabajadores" | "proveedores" | "clientes";
  count: number;
  limit: number;
}

const RESOURCE_LABELS: Record<Props["resource"], string> = {
  trabajadores: "trabajadores",
  proveedores: "proveedores",
  clientes: "clientes",
};

export function PlanLimitBanner({ plan, resource, count, limit }: Props) {
  if (count < limit) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900"
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 text-xs">
        <p className="font-medium">
          Has alcanzado el límite de tu plan {PLAN_LABELS[plan]}.
        </p>
        <p className="text-amber-800/80">
          Actualiza para añadir más {RESOURCE_LABELS[resource]} ({count}/{limit}).
        </p>
      </div>
      <Button asChild size="sm" variant="outline" className="h-7 text-xs border-amber-400 bg-white hover:bg-amber-100">
        <Link to="/planes">Ver planes</Link>
      </Button>
    </div>
  );
}
