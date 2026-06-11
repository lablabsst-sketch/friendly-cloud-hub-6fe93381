// Plan limits enforcement helpers
export type PlanName = "free" | "pyme" | "empresarial" | "corporativo" | "premium";

export interface PlanLimits {
  trabajadores: number;
  proveedores: number;
  clientes: number;
}

export const PLAN_LIMITS: Record<PlanName, PlanLimits> = {
  free:        { trabajadores: 10,  proveedores: 5,   clientes: 5   },
  pyme:        { trabajadores: 10,  proveedores: 20,  clientes: 20  },
  empresarial: { trabajadores: 50,  proveedores: 30,  clientes: 30  },
  corporativo: { trabajadores: 200, proveedores: 50,  clientes: 50  },
  premium:     { trabajadores: 500, proveedores: 100, clientes: 100 },
};

export const PLAN_LABELS: Record<PlanName, string> = {
  free: "Free",
  pyme: "PYME",
  empresarial: "Empresarial",
  corporativo: "Corporativo",
  premium: "Premium",
};

// Módulos bloqueados en Free
export const FREE_LOCKED_MODULES = [
  "accidentalidad",
  "ausentismo",
  "inspecciones",
  "plan-anual",
  "estadisticas",
] as const;

// Rutas bloqueadas para plan Free
export const FREE_LOCKED_ROUTES: ReadonlyArray<string> = [
  "/accidentalidad",
  "/ausentismo",
  "/inspecciones",
  "/plan-anual",
  "/estadisticas",
];

export function isRouteLockedForPlan(route: string, plan: string | null | undefined): boolean {
  return normalizePlan(plan) === "free" && FREE_LOCKED_ROUTES.includes(route);
}


export function normalizePlan(plan: string | null | undefined): PlanName {
  const p = (plan ?? "").toLowerCase().trim();
  if (p === "pyme" || p === "empresarial" || p === "corporativo" || p === "premium") return p;
  return "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export function isFreePlan(plan: string | null | undefined): boolean {
  return normalizePlan(plan) === "free";
}
