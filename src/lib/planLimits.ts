// Plan limits enforcement helpers
export type PlanName = "pyme" | "empresarial" | "corporativo" | "premium";

export interface PlanLimits {
  trabajadores: number;
  proveedores: number;
  clientes: number;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  pyme:        { trabajadores: 10,  proveedores: 20,  clientes: 20  },
  empresarial: { trabajadores: 50,  proveedores: 30,  clientes: 30  },
  corporativo: { trabajadores: 200, proveedores: 50,  clientes: 50  },
  premium:     { trabajadores: 500, proveedores: 100, clientes: 100 },
};

export const PLAN_LABELS: Record<PlanName, string> = {
  pyme: "PYME",
  empresarial: "Empresarial",
  corporativo: "Corporativo",
  premium: "Premium",
};

export function normalizePlan(plan: string | null | undefined): PlanName {
  const p = (plan ?? "").toLowerCase().trim();
  if (p === "empresarial" || p === "corporativo" || p === "premium") return p;
  return "pyme";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}
