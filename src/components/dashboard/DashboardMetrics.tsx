import { Users, Briefcase, TrendingUp, CalendarClock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountUp } from "@/hooks/useCountUp";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DashboardData } from "@/hooks/useDashboardData";
import { useNavigate } from "react-router-dom";

interface Props { loading: boolean; data: DashboardData; }

function KpiCard({
  icon: Icon, value, suffix, label, trend, trendDir, emptyText, emptyAction, onAction,
}: {
  icon: React.ElementType;
  value: number;
  suffix?: string;
  label: string;
  trend?: string;
  trendDir?: "up" | "down" | "neutral";
  emptyText?: string;
  emptyAction?: string;
  onAction?: () => void;
}) {
  const animated = useCountUp(value);
  const isEmpty = value === 0 && emptyText;
  const TrendIcon = trendDir === "down" ? ArrowDownRight : ArrowUpRight;
  const trendColor =
    trendDir === "down" ? "text-[#DC2626]" :
    trendDir === "up" ? "text-[#16A34A]" : "text-[#64748B]";

  return (
    <div className="kpi-card hover:border-[#CBD5E1] transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-md bg-[#F1F5F9] flex items-center justify-center">
          <Icon className="w-[18px] h-[18px] text-[#334155]" aria-hidden="true" />
        </div>
        {trend && !isEmpty && (
          <span className={cn("inline-flex items-center gap-0.5 text-xs font-semibold", trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            {trend}
          </span>
        )}
      </div>
      {isEmpty ? (
        <div className="space-y-2">
          <p className="text-sm text-[#64748B]">{emptyText}</p>
          {emptyAction && (
            <Button variant="outline" size="sm" onClick={onAction} className="h-8 text-xs">
              {emptyAction}
            </Button>
          )}
        </div>
      ) : (
        <>
          <p className="kpi-value">{animated}{suffix}</p>
          <p className="kpi-label mt-2">{label}</p>
        </>
      )}
    </div>
  );
}

export function DashboardMetrics({ loading, data }: Props) {
  const navigate = useNavigate();
  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-[140px] rounded-lg" />)}
    </div>
  );

  const cumplimiento = data.itemsPlanMejora.total > 0
    ? Math.round((data.itemsPlanMejora.completados / data.itemsPlanMejora.total) * 100) : 0;
  const totalDocsAlerta = data.docsProximosVencer + data.docsVencidos;
  const alertaDocs = data.docsVencidos > 0 ? `${data.docsVencidos} vencidos` : data.docsProximosVencer > 0 ? `${data.docsProximosVencer} por vencer` : undefined;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={Users}
        value={data.totalTrabajadores} label="Trabajadores activos"
        trend={data.trabajadoresAprobados > 0 ? `${data.trabajadoresAprobados}` : data.trabajadoresPendientes > 0 ? `${data.trabajadoresPendientes}` : undefined}
        trendDir={data.trabajadoresPendientes > 0 ? "down" : "up"}
        emptyText="Aún sin trabajadores" emptyAction="Agregar"
        onAction={() => navigate("/trabajadores")}
      />
      <KpiCard
        icon={Briefcase}
        value={data.totalContratistas} label="Contratistas activos"
        emptyText="Sin contratistas" emptyAction="Agregar"
        onAction={() => navigate("/contratistas")}
      />
      <KpiCard
        icon={TrendingUp}
        value={cumplimiento} suffix="%" label="Cumplimiento plan"
        trend={data.itemsPlanMejora.total > 0 ? `${data.itemsPlanMejora.completados}/${data.itemsPlanMejora.total}` : undefined}
        trendDir="up"
        emptyText="Sin plan de mejora" emptyAction="Crear plan"
      />
      <KpiCard
        icon={CalendarClock}
        value={totalDocsAlerta} label="Documentos por atender"
        trend={alertaDocs} trendDir={data.docsVencidos > 0 ? "down" : "neutral"}
        emptyText="Documentos al día"
      />
    </div>
  );
}
