import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STORAGE_KEY = "sstlink:onboarding:dismissed";

interface Step {
  done: boolean;
  label: string;
  to: string;
  cta: string;
}

export function OnboardingChecklist() {
  const { empresa } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [trabajadoresCount, setTrabajadoresCount] = useState<number | null>(null);
  const [usuariosCount, setUsuariosCount] = useState<number | null>(null);

  useEffect(() => {
    if (!empresa?.id || dismissed) return;
    let cancelled = false;
    (async () => {
      const [tw, us] = await Promise.all([
        (supabase as any)
          .from("trabajadores")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresa.id),
        (supabase as any)
          .from("usuarios")
          .select("id", { count: "exact", head: true })
          .eq("empresa_id", empresa.id),
      ]);
      if (cancelled) return;
      setTrabajadoresCount(tw.count ?? 0);
      setUsuariosCount(us.count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [empresa?.id, dismissed]);

  if (dismissed || !empresa) return null;

  const plan = (empresa as any).plan;
  const isFreePlan = !plan || plan === "free";
  if (!isFreePlan) return null;
  if (trabajadoresCount === null) return null;
  if (trabajadoresCount > 0) return null;

  const empresaComplete = Boolean(
    (empresa as any).sector_industria && (empresa as any).nombre && (empresa as any).nit
  );

  const steps: Step[] = [
    {
      done: empresaComplete,
      label: "Completa los datos de tu empresa",
      to: "/empresa",
      cta: "Completar",
    },
    {
      done: (trabajadoresCount ?? 0) > 0,
      label: "Agrega tu primer trabajador",
      to: "/trabajadores",
      cta: "Agregar",
    },
    {
      done: (usuariosCount ?? 1) > 1,
      label: "Invita a un colega a tu equipo",
      to: "/empresa?tab=usuarios",
      cta: "Invitar",
    },
  ];

  const handleClose = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <div className="relative rounded-[14px] border border-[#E2E8F0] bg-gradient-to-br from-[#FFF7ED] to-white p-5 pr-10">
      <button
        type="button"
        onClick={handleClose}
        aria-label="Cerrar tarjeta de bienvenida"
        className="absolute top-3 right-3 w-7 h-7 rounded-md flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#F97316] flex items-center justify-center shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-[#0F172A]">
            ¡Bienvenido a SSTLink!
          </h2>
          <p className="text-xs text-[#64748B] mt-0.5">
            Completa estos primeros pasos para empezar a gestionar tu SG-SST.
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.to}
            className="flex items-center justify-between gap-3 rounded-md bg-white border border-[#E2E8F0] px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-[#CBD5E1] shrink-0" />
              )}
              <span
                className={
                  "text-[13px] truncate " +
                  (step.done ? "text-[#94A3B8] line-through" : "text-[#0F172A]")
                }
              >
                {step.label}
              </span>
            </div>
            {!step.done && (
              <Link
                to={step.to}
                className="text-[11px] font-medium text-[#F97316] hover:text-[#EA6C00] shrink-0"
              >
                {step.cta} →
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
