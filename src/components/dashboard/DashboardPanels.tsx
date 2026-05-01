import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, GraduationCap, Layers, CheckSquare, FileWarning, ClipboardCheck, Truck } from "lucide-react";
import { DashboardData } from "@/hooks/useDashboardData";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { loading: boolean; data: DashboardData; }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS   = ["L","M","X","J","V","S","D"];
const MESES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const MESES_SHORT = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

type EventTipo = "tarea" | "capacitacion" | "plan_anual" | "documento";

const TIPO_DOT: Record<EventTipo, string> = {
  tarea:        "bg-blue-500",
  capacitacion: "bg-green-500",
  plan_anual:   "bg-indigo-500",
  documento:    "bg-red-500",
};

const PRIORIDAD_COLOR: Record<string, string> = {
  alta:  "bg-red-100 text-red-700 border-red-200",
  media: "bg-yellow-100 text-yellow-700 border-yellow-200",
  baja:  "bg-green-100 text-green-700 border-green-200",
};

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

const startOfWeek = (d: Date) => {
  const diff = d.getDay() === 0 ? 6 : d.getDay() - 1;
  const s = new Date(d);
  s.setDate(d.getDate() - diff);
  return s;
};

const getMonthDays = (current: Date) => {
  const year = current.getFullYear(), month = current.getMonth();
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const start = startOfWeek(first);
  const days: Date[] = [];
  const d = new Date(start);
  while (d <= last || days.length % 7 !== 0) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
    if (days.length >= 42) break;
  }
  return days;
};

interface TareaItem {
  id: string;
  titulo: string;
  fecha: string;
  prioridad: string;
  estado: string;
  responsable: string | null;
}

// ─── StatusRow ────────────────────────────────────────────────────────────────

function StatusRow({ icon: Icon, label, value, okText, alertColor, okColor = "#6B7280", onClick }: {
  icon: React.ElementType; label: string; value: number;
  okText: string; alertColor: string; okColor?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-2 border-b last:border-0 hover:opacity-80 transition-opacity text-left">
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <span className="text-[11px] font-medium" style={{ color: value === 0 ? okColor : alertColor }}>
        {value === 0 ? okText : `${value} pendiente${value > 1 ? "s" : ""}`}
      </span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardPanels({ loading, data }: Props) {
  const navigate = useNavigate();
  const { empresa } = useAuth();
  const today = toDateStr(new Date());

  const [miniCurrent, setMiniCurrent] = useState(new Date());
  // date -> list of event tipos
  const [eventDates, setEventDates] = useState<Record<string, EventTipo[]>>({});
  const [tareas, setTareas] = useState<TareaItem[]>([]);

  // ── Fetch mini-calendar events ─────────────────────────────────────────────

  useEffect(() => {
    if (!empresa?.id) return;
    const year  = miniCurrent.getFullYear();
    const month = miniCurrent.getMonth() + 1;
    const rangeStart = toDateStr(new Date(year, miniCurrent.getMonth(), 1));
    const rangeEnd   = toDateStr(new Date(year, miniCurrent.getMonth() + 1, 0));
    const today30    = toDateStr(new Date(Date.now() + 30 * 86400000));

    Promise.all([
      (supabase as any).from("tareas").select("fecha").eq("empresa_id", empresa.id).gte("fecha", rangeStart).lte("fecha", rangeEnd),
      (supabase as any).from("capacitaciones").select("fecha").eq("empresa_id", empresa.id).gte("fecha", rangeStart).lte("fecha", rangeEnd),
      (supabase as any).from("actividades_plan_anual").select("meses").eq("empresa_id", empresa.id).contains("meses", [month]),
      (supabase as any).from("documentos_empresa").select("fecha_vencimiento").eq("empresa_id", empresa.id).eq("tiene_vencimiento", true).gte("fecha_vencimiento", today).lte("fecha_vencimiento", today30),
      (supabase as any).from("documentos_sgsst").select("fecha_vencimiento").eq("empresa_id", empresa.id).eq("tiene_vencimiento", true).gte("fecha_vencimiento", today).lte("fecha_vencimiento", today30),
    ]).then(([{ data: t }, { data: c }, { data: pa }, { data: de }, { data: ds }]) => {
      const map: Record<string, EventTipo[]> = {};
      const add = (date: string, tipo: EventTipo) => { (map[date] = map[date] ?? []).push(tipo); };
      (t ?? []).forEach((x: any) => add(x.fecha, "tarea"));
      (c ?? []).forEach((x: any) => add(x.fecha, "capacitacion"));
      (pa ?? []).forEach((x: any) => {
        (x.meses ?? []).forEach((m: number) => {
          if (m === month) add(`${year}-${String(m).padStart(2,"0")}-01`, "plan_anual");
        });
      });
      [...(de ?? []), ...(ds ?? [])].forEach((x: any) => { if (x.fecha_vencimiento) add(x.fecha_vencimiento, "documento"); });
      setEventDates(map);
    });
  }, [empresa?.id, miniCurrent]);

  // ── Fetch upcoming tasks ───────────────────────────────────────────────────

  useEffect(() => {
    if (!empresa?.id) return;
    (supabase as any)
      .from("tareas")
      .select("id,titulo,fecha,prioridad,estado,responsable")
      .eq("empresa_id", empresa.id)
      .in("estado", ["pendiente", "en-proceso"])
      .gte("fecha", today)
      .order("fecha", { ascending: true })
      .limit(10)
      .then(({ data: t }: any) => setTareas(t ?? []));
  }, [empresa?.id, today]);

  if (loading) return (
    <div className="grid lg:grid-cols-[2fr_1fr] gap-3">
      <Skeleton className="h-[320px] rounded-xl" />
      <Skeleton className="h-[320px] rounded-xl" />
    </div>
  );

  const monthDays = getMonthDays(miniCurrent);
  const miniTitle = `${MESES[miniCurrent.getMonth()]} ${miniCurrent.getFullYear()}`;

  const navigateMini = (dir: 1 | -1) => {
    const d = new Date(miniCurrent);
    d.setMonth(d.getMonth() + dir);
    setMiniCurrent(d);
  };

  return (
    <div className="space-y-3">
      {/* Top row: Calendar + Tasks */}
      <div className="grid lg:grid-cols-[2fr_1fr] gap-3">

        {/* ── Mini Calendar ── */}
        <div className="bg-surface rounded-xl border-[0.5px] border-border p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-medium">Calendario SST</h3>
            <button
              onClick={() => navigate("/calendario")}
              className="flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              Ver completo <ExternalLink className="h-3 w-3" />
            </button>
          </div>

          {/* Month nav */}
          <div className="flex items-center gap-1 mb-3">
            <button onClick={() => navigateMini(-1)} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => navigateMini(1)} className="p-1 rounded hover:bg-muted transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <span className="text-[12px] font-semibold ml-1">{miniTitle}</span>
            <button
              onClick={() => setMiniCurrent(new Date())}
              className="ml-auto text-[10px] px-2 py-0.5 border rounded hover:bg-muted transition-colors text-muted-foreground"
            >
              Hoy
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DIAS.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-0.5">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {monthDays.map((day, i) => {
              const ds = toDateStr(day);
              const isCurrent = day.getMonth() === miniCurrent.getMonth();
              const isToday   = ds === today;
              const tipos     = eventDates[ds] ?? [];
              const uniqueTipos = [...new Set(tipos)] as EventTipo[];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex flex-col items-center py-1 rounded-lg cursor-pointer hover:bg-muted/40 transition-colors",
                    !isCurrent && "opacity-25"
                  )}
                  onClick={() => navigate("/calendario")}
                >
                  <span className={cn(
                    "text-[11px] font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                  )}>
                    {day.getDate()}
                  </span>
                  {uniqueTipos.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {uniqueTipos.slice(0, 3).map(tipo => (
                        <span key={tipo} className={cn("w-1.5 h-1.5 rounded-full", TIPO_DOT[tipo])} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2.5 mt-3 pt-3 border-t">
            {([
              { tipo: "tarea" as EventTipo, label: "Tarea", icon: CheckSquare },
              { tipo: "capacitacion" as EventTipo, label: "Capacitación", icon: GraduationCap },
              { tipo: "plan_anual" as EventTipo, label: "Plan Anual", icon: Layers },
              { tipo: "documento" as EventTipo, label: "Doc. vence", icon: FileWarning },
            ]).map(({ tipo, label, icon: Icon }) => (
              <span key={tipo} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", TIPO_DOT[tipo])} />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Centro de Tareas ── */}
        <div className="bg-surface rounded-xl border-[0.5px] border-border p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[13px] font-medium">Centro de Tareas</h3>
            <button onClick={() => navigate("/calendario")} className="text-[11px] text-primary hover:underline">
              Ver todas →
            </button>
          </div>

          {tareas.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-8 text-center gap-2">
              <CheckSquare className="w-7 h-7 text-muted-foreground/30" />
              <p className="text-[12px] text-muted-foreground">Sin tareas próximas</p>
            </div>
          ) : (
            <div className="space-y-1 flex-1 overflow-y-auto max-h-[260px] pr-1">
              {tareas.map(t => {
                const fecha = new Date(t.fecha + "T00:00:00");
                const isOverdue = t.fecha < today;
                const isHoy = t.fecha === today;
                return (
                  <div key={t.id} className="flex items-start gap-2 py-1.5 border-b last:border-0">
                    <div className={cn(
                      "text-[10px] font-medium min-w-[38px] text-center pt-0.5",
                      isOverdue ? "text-red-500" : isHoy ? "text-primary font-semibold" : "text-muted-foreground"
                    )}>
                      <div>{fecha.getDate()}</div>
                      <div>{MESES_SHORT[fecha.getMonth()]}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium leading-snug truncate">{t.titulo}</p>
                      {t.responsable && (
                        <p className="text-[10px] text-muted-foreground truncate">{t.responsable}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] h-4 px-1 shrink-0", PRIORIDAD_COLOR[t.prioridad] ?? "")}
                    >
                      {t.prioridad}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: Estado SST */}
      <div className="bg-surface rounded-xl border-[0.5px] border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-medium">Estado SST</h3>
          <button onClick={() => navigate("/sgsst")} className="text-[11px] text-primary hover:underline">Ver SG-SST →</button>
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-0">
          {/* PHVA bars */}
          <div>
            {data.cumplimientoPhva && data.cumplimientoPhva.fases.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {[
                  { key: "PLANEAR", color: "#3B82F6" },
                  { key: "HACER",   color: "#F59E0B" },
                  { key: "VERIFICAR", color: "#8B5CF6" },
                  { key: "ACTUAR",  color: "#22C55E" },
                ].map(f => {
                  const fase = data.cumplimientoPhva!.fases.find(x => x.fase === f.key);
                  if (!fase) return null;
                  return (
                    <div key={f.key} className="flex items-center gap-2">
                      <span className="text-[10px] w-16 text-muted-foreground">{f.key}</span>
                      <Progress value={fase.porcentaje} className="h-1 flex-1" style={{ "--progress-color": f.color } as React.CSSProperties} />
                      <span className="text-[10px] font-medium w-8 text-right">{fase.porcentaje}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Status rows */}
          <div className="space-y-0.5">
            <StatusRow icon={BookOpen} label="Capacitaciones pendientes" value={data.capacitacionesPendientes} okText="Al día ✓" alertColor="#F59E0B" onClick={() => navigate("/capacitaciones")} />
            <StatusRow icon={AlertTriangle} label="Docs próximos a vencer" value={data.docsProximosVencer} okText="Sin alertas ✓" alertColor="#EF4444" onClick={() => navigate("/documentos")} />
            <StatusRow icon={CheckCircle2} label="Accidentes este año" value={data.accidentesAnio} okText="Sin accidentes ✓" alertColor="#EF4444" okColor="#16A34A" onClick={() => navigate("/accidentalidad")} />
            <StatusRow icon={CheckCircle2} label="Pendientes plan de mejora" value={data.itemsPlanMejora.total - data.itemsPlanMejora.completados} okText="Plan al día ✓" alertColor="#F59E0B" onClick={() => navigate("/plan-mejora")} />
            <StatusRow icon={ClipboardCheck} label="Inspecciones abiertas" value={data.inspeccionesPendientes} okText="Sin pendientes ✓" alertColor="#F59E0B" onClick={() => navigate("/inspecciones")} />
            <StatusRow icon={Truck} label="Contratos proveedores vencen pronto" value={data.proveedoresExpirando} okText="Contratos vigentes ✓" alertColor="#F59E0B" onClick={() => navigate("/proveedores")} />
          </div>
        </div>
      </div>
    </div>
  );
}
