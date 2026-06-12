import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check, X, Lock, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { normalizePlan, type PlanName } from "@/lib/planLimits";

interface PlanRow {
  key: PlanName;
  name: string;
  priceMonthly: number; // COP/mes
  desc: string;
  highlighted?: boolean;
  badge?: string;
}

const PLANS: PlanRow[] = [
  { key: "free",        name: "Free",        priceMonthly: 0,      desc: "Para empezar a digitalizar tu SST" },
  { key: "pyme",        name: "Pyme",        priceMonthly: 22000,  desc: "Para pequeñas empresas en crecimiento" },
  { key: "empresarial", name: "Empresarial", priceMonthly: 44000,  desc: "El más elegido por equipos SST", highlighted: true, badge: "Más popular" },
  { key: "corporativo", name: "Corporativo", priceMonthly: 132000, desc: "Para empresas medianas y grandes" },
  { key: "premium",     name: "Premium",     priceMonthly: 198000, desc: "Cobertura total y soporte premium" },
];

const ANNUAL_DISCOUNT = 0.2; // 20% de descuento anual
const fmtCOP = (n: number) => `$${n.toLocaleString("es-CO")}`;

// columnas: free, pyme, empresarial, corporativo, premium
type Cell = string | boolean | "locked";
interface FeatureRow {
  label: string;
  values: [Cell, Cell, Cell, Cell, Cell];
}

const FEATURES: FeatureRow[] = [
  { label: "Trabajadores",        values: ["10", "10", "50", "200", "500"] },
  { label: "Proveedores",         values: ["5", "20", "30", "50", "100"] },
  { label: "Clientes",            values: ["5", "20", "30", "50", "100"] },
  { label: "Capacitaciones",      values: ["1/mes", "Ilimitadas", "Ilimitadas", "Ilimitadas", "Ilimitadas"] },
  { label: "Exámenes médicos",    values: [true, true, true, true, true] },
  { label: "Portal proveedor",    values: [true, true, true, true, true] },
  { label: "Solicitudes de enlace", values: [true, true, true, true, true] },
  { label: "Accidentalidad",      values: ["locked", true, true, true, true] },
  { label: "Ausentismo",          values: ["locked", true, true, true, true] },
  { label: "Inspecciones",        values: ["locked", true, true, true, true] },
  { label: "Plan anual SGSST",    values: ["locked", true, true, true, true] },
  { label: "Perfiles Sociodemográficos", values: ["locked", true, true, true, true] },
];

function CellRender({ value }: { value: Cell }) {
  if (value === true) return <Check className="w-4 h-4 text-emerald-600 inline" aria-label="Incluido" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/60 inline" aria-label="No incluido" />;
  if (value === "locked") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center text-muted-foreground/70" aria-label="Bloqueado en Free">
            <Lock className="w-3.5 h-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Disponible desde Plan Pyme
        </TooltipContent>
      </Tooltip>
    );
  }
  return <span className="text-xs text-foreground">{value}</span>;
}

export default function Planes() {
  const { empresa } = useAuth();
  const currentPlan = normalizePlan((empresa as any)?.plan);
  const [contactOpen, setContactOpen] = useState(false);
  const [billing, setBilling] = useState<"mensual" | "anual">("mensual");

  return (
    <AppLayout>
      <TooltipProvider delayDuration={150}>
        <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <h1 className="text-xl md:text-2xl font-semibold text-foreground">Planes y precios</h1>
              <p className="text-sm text-muted-foreground">
                Elige el plan que mejor se adapta a tu empresa. Tu plan actual es{" "}
                <span className="font-medium text-foreground">{PLANS.find(p => p.key === currentPlan)?.name ?? "Free"}</span>.
              </p>
            </div>

            {/* Toggle mes / año */}
            <div className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setBilling("mensual")}
                aria-pressed={billing === "mensual"}
                className={`px-3 h-7 rounded-md transition-colors ${billing === "mensual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setBilling("anual")}
                aria-pressed={billing === "anual"}
                className={`px-3 h-7 rounded-md transition-colors inline-flex items-center gap-1.5 ${billing === "anual" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Anual
                <span className="text-[10px] text-emerald-600 font-medium">-{Math.round(ANNUAL_DISCOUNT * 100)}%</span>
              </button>
            </div>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.key === currentPlan;
              const isFree = plan.key === "free";
              const monthlyShown = billing === "anual"
                ? Math.round(plan.priceMonthly * (1 - ANNUAL_DISCOUNT))
                : plan.priceMonthly;
              const annualTotal = monthlyShown * 12;
              return (
                <div
                  key={plan.key}
                  className={`relative rounded-xl border p-4 flex flex-col bg-card transition-shadow ${
                    plan.highlighted
                      ? "border-primary ring-2 ring-primary/20 shadow-sm"
                      : "border-border"
                  }`}
                >
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-primary-foreground bg-primary px-2 py-0.5 rounded-full whitespace-nowrap inline-flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> {plan.badge}
                    </span>
                  )}
                  <h3 className="text-sm font-medium text-foreground">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-xl font-semibold text-foreground">{fmtCOP(monthlyShown)}</span>
                    {!isFree && <span className="text-[11px] text-muted-foreground">/mes</span>}
                  </div>
                  {!isFree && billing === "anual" && (
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      {fmtCOP(annualTotal)} facturado anual
                    </p>
                  )}
                  {!isFree && billing === "mensual" && (
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5">Facturación mensual</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed min-h-[32px]">{plan.desc}</p>


                  <div className="mt-4">
                    {isCurrent ? (
                      <Button size="sm" variant="outline" className="w-full text-xs h-8" disabled>
                        Plan actual
                      </Button>
                    ) : isFree ? (
                      <Button size="sm" variant="outline" className="w-full text-xs h-8" disabled>
                        Gratis
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant={plan.highlighted ? "default" : "outline"}
                        className="w-full text-xs h-8"
                        onClick={() => setContactOpen(true)}
                      >
                        Cambiar a {plan.name}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-medium text-foreground">Comparativa de funcionalidades</p>
            </div>

            {/* Desktop / tablet */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40 text-left">
                    <th className="px-4 py-2.5 text-xs font-medium text-muted-foreground w-1/3">Funcionalidad</th>
                    {PLANS.map((p) => (
                      <th key={p.key} className={`px-3 py-2.5 text-xs font-medium text-center ${p.key === currentPlan ? "text-primary" : "text-muted-foreground"}`}>
                        {p.name}
                        {p.key === currentPlan && <span className="block text-[10px] text-primary/80 font-normal">Tu plan</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((row, i) => (
                    <tr key={row.label} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-4 py-2.5 text-xs text-foreground">{row.label}</td>
                      {row.values.map((v, idx) => (
                        <td key={idx} className="px-3 py-2.5 text-center">
                          <CellRender value={v} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: stacked per plan */}
            <div className="md:hidden divide-y divide-border">
              {PLANS.map((p, planIdx) => (
                <details key={p.key} open={p.key === currentPlan} className="group">
                  <summary className="px-4 py-3 flex items-center justify-between cursor-pointer list-none">
                    <span className="text-sm font-medium text-foreground">
                      {p.name}
                      {p.key === currentPlan && <span className="ml-2 text-[10px] text-primary">· Tu plan</span>}
                    </span>
                    <span className="text-xs text-muted-foreground group-open:rotate-180 transition-transform">▾</span>
                  </summary>
                  <div className="px-4 pb-3 space-y-1.5">
                    {FEATURES.map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-xs py-1">
                        <span className="text-muted-foreground">{row.label}</span>
                        <CellRender value={row.values[planIdx]} />
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Precios en pesos colombianos (COP) por mes. Sin contratos a largo plazo.
          </p>
        </div>
      </TooltipProvider>

      {/* Modal cambio de plan */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Mail className="w-4 h-4 text-primary" /> Cambiar de plan
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Para cambiar de plan escríbenos a{" "}
              <a href="mailto:soporte@sstlink.co" className="text-primary font-medium hover:underline">
                soporte@sstlink.co
              </a>{" "}
              y un asesor te ayudará con la actualización.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setContactOpen(false)}>Cerrar</Button>
            <Button asChild>
              <a href="mailto:soporte@sstlink.co?subject=Cambio%20de%20plan%20SSTLink">Escribir a soporte</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
