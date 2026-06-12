import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Printer, Users, TrendingUp, BarChart2, Heart, RefreshCw } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ── Color palettes ─────────────────────────────────────────────────────────────
const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#3b82f6", "#a855f7", "#14b8a6", "#f97316", "#ec4899"];

// ── Label maps ─────────────────────────────────────────────────────────────────
const LABELS: Record<string, Record<string, string>> = {
  genero: { M: "Masculino", F: "Femenino", otro: "Otro" },
  estado_civil: { soltero: "Soltero/a", casado: "Casado/a", union_libre: "Unión libre", separado: "Separado/a", divorciado: "Divorciado/a", viudo: "Viudo/a" },
  nivel_escolaridad: { ninguno: "Ninguno", primaria: "Primaria", bachillerato: "Bachillerato", tecnico: "Técnico", tecnologo: "Tecnólogo", profesional: "Profesional", especializacion: "Especialización", maestria: "Maestría", doctorado: "Doctorado" },
  estrato_socioeconomico: { "1": "Estrato 1", "2": "Estrato 2", "3": "Estrato 3", "4": "Estrato 4", "5": "Estrato 5", "6": "Estrato 6" },
  personas_a_cargo: { "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5+": "5+" },
  tipo_vivienda: { propia: "Propia", arrendada: "Arrendada", familiar: "Familiar" },
  jornada_trabajo: { diurno: "Diurno", nocturno: "Nocturno", mixto: "Mixto", rotativo: "Rotativo" },
  rango_salarial: { "1_smlv": "1 SMLV", "1_2_smlv": "1-2 SMLV", "2_3_smlv": "2-3 SMLV", "3_5_smlv": "3-5 SMLV", "+5_smlv": "+5 SMLV" },
  tipo_contrato: { indefinido: "Indefinido", fijo: "Término fijo", obra: "Obra/labor", aprendiz: "Aprendiz", prestacion: "Prest. servicios", prestacion_servicios: "Prest. servicios" },
  estado_vacunacion: { completo: "Completo", incompleto: "Incompleto", sin_informacion: "Sin info" },
  actividad_fisica: { nunca: "Nunca", ocasional: "Ocasional", "2_3_semana": "2-3/sem", diario: "Diario" },
  consumo_tabaco: { no: "No consume", ex_fumador: "Ex fumador", si: "Sí consume" },
  consumo_alcohol: { no: "No consume", ocasional: "Ocasional", frecuente: "Frecuente" },
};

function label(field: string, val: string) {
  return LABELS[field]?.[val] ?? val;
}

// ── Distribution builder ───────────────────────────────────────────────────────
function dist(arr: string[], field: string) {
  const counts: Record<string, number> = {};
  arr.forEach(v => { if (v) counts[v] = (counts[v] || 0) + 1; });
  return Object.entries(counts)
    .map(([key, value]) => ({ name: label(field, key), value, key }))
    .sort((a, b) => b.value - a.value);
}

// ── Age range ─────────────────────────────────────────────────────────────────
function ageRange(birthDate: string): string {
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age < 25) return "Menos de 25";
  if (age < 35) return "25 – 34";
  if (age < 45) return "35 – 44";
  if (age < 55) return "45 – 54";
  return "55 o más";
}

const AGE_ORDER = ["Menos de 25", "25 – 34", "35 – 44", "45 – 54", "55 o más"];

// ── Tenure range ──────────────────────────────────────────────────────────────
function tenureRange(date: string): string {
  const months = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
  if (months < 6)  return "< 6 meses";
  if (months < 12) return "6 – 12 meses";
  if (months < 24) return "1 – 2 años";
  if (months < 60) return "2 – 5 años";
  return "Más de 5 años";
}
const TENURE_ORDER = ["< 6 meses", "6 – 12 meses", "1 – 2 años", "2 – 5 años", "Más de 5 años"];

// ── Chart components ──────────────────────────────────────────────────────────
function MiniPie({ data, title }: { data: { name: string; value: number }[]; title: string }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <EmptyChart title={title} />;
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v} (${((v / total) * 100).toFixed(1)}%)`, "Total"]} />
        </PieChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function MiniBar({ data, title, color = "#6366f1" }: { data: { name: string; value: number }[]; title: string; color?: string }) {
  if (data.length === 0) return <EmptyChart title={title} />;
  return (
    <ChartCard title={title}>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 4 }}>
          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={40} />
          <YAxis tick={{ fontSize: 9 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" name="Trabajadores" fill={color} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold text-foreground mb-3">{title}</p>
      {children}
    </div>
  );
}

function EmptyChart({ title }: { title: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-semibold text-foreground mb-2">{title}</p>
      <div className="h-[150px] flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Sin datos suficientes</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color: string }) {
  return (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${color}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Estadisticas() {
  const { empresa } = useAuth();
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("trabajadores")
      .select("fecha_nacimiento, genero, fecha_ingreso, tipo_contrato, cargo, estado, perfil_sociodemografico")
      .eq("empresa_id", empresa.id)
      .neq("estado", "inactivo");
    setWorkers(data || []);
    setLoading(false);
  }, [empresa?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handlePrint = () => window.print();

  // ── Derived stats ────────────────────────────────────────────────────────────
  const total = workers.length;
  const withPerfil = workers.filter(w => {
    const p = w.perfil_sociodemografico ?? {};
    return Object.values(p).some(v => v);
  }).length;
  const perfilPct = total > 0 ? Math.round((withPerfil / total) * 100) : 0;

  const ages = workers.filter(w => w.fecha_nacimiento).map(w =>
    Math.floor((Date.now() - new Date(w.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  );
  const avgAge = ages.length > 0 ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : null;

  const generos = dist(workers.map(w => w.genero).filter(Boolean), "genero");
  const femeninas = workers.filter(w => w.genero === "F").length;
  const femPct = total > 0 ? Math.round((femeninas / total) * 100) : 0;

  // perfil fields
  const pf = (field: string) => workers.map(w => w.perfil_sociodemografico?.[field]).filter(Boolean);

  const ageRanges = (() => {
    const counts: Record<string, number> = {};
    workers.filter(w => w.fecha_nacimiento).forEach(w => {
      const r = ageRange(w.fecha_nacimiento);
      counts[r] = (counts[r] || 0) + 1;
    });
    return AGE_ORDER.map(r => ({ name: r, value: counts[r] || 0 })).filter(r => r.value > 0);
  })();

  const tenureRanges = (() => {
    const counts: Record<string, number> = {};
    workers.filter(w => w.fecha_ingreso).forEach(w => {
      const r = tenureRange(w.fecha_ingreso);
      counts[r] = (counts[r] || 0) + 1;
    });
    return TENURE_ORDER.map(r => ({ name: r, value: counts[r] || 0 })).filter(r => r.value > 0);
  })();

  const estadoCivil    = dist(pf("estado_civil"),           "estado_civil");
  const escolaridad    = dist(pf("nivel_escolaridad"),      "nivel_escolaridad");
  const estrato        = dist(pf("estrato_socioeconomico"), "estrato_socioeconomico");
  const personasCargo  = dist(pf("personas_a_cargo"),       "personas_a_cargo");
  const vivienda       = dist(pf("tipo_vivienda"),          "tipo_vivienda");
  const jornada        = dist(pf("jornada_trabajo"),        "jornada_trabajo");
  const rangoSalarial  = dist(pf("rango_salarial"),         "rango_salarial");
  const tipoContrato   = dist(workers.map(w => w.tipo_contrato).filter(Boolean), "tipo_contrato");
  const vacunacion     = dist(pf("estado_vacunacion"),      "estado_vacunacion");
  const actividadFis   = dist(pf("actividad_fisica"),       "actividad_fisica");
  const tabaco         = dist(pf("consumo_tabaco"),         "consumo_tabaco");
  const alcohol        = dist(pf("consumo_alcohol"),        "consumo_alcohol");

  // personas a cargo con carga: 1 o más
  const conCarga = pf("personas_a_cargo").filter(v => v !== "0").length;
  const conCargaPct = withPerfil > 0 ? Math.round((conCarga / withPerfil) * 100) : 0;

  if (loading) return (
    <AppLayout breadcrumbs={["SSTLink", "Perfiles Sociodemográficos"]}>
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        <div className="grid grid-cols-3 gap-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout breadcrumbs={["SSTLink", "Perfiles Sociodemográficos"]}>
      <div ref={printRef} className="space-y-2 max-w-6xl print:max-w-none">

        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-lg font-semibold">Perfiles Sociodemográficos</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {empresa?.nombre} · {total} trabajadores activos
              {withPerfil < total && (
                <span className="ml-2 text-amber-600">· {perfilPct}% con perfil completo</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
              <Printer className="w-3.5 h-3.5" /> Imprimir informe
            </Button>
          </div>
        </div>

        {/* Print header (only shows when printing) */}
        <div className="hidden print:block mb-6">
          <h1 className="text-xl font-bold">{empresa?.nombre}</h1>
          <p className="text-sm text-gray-600">Perfil Sociodemográfico — {new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p className="text-xs text-gray-500 mt-1">{total} trabajadores activos analizados</p>
        </div>

        {/* Cobertura de datos (solo si incompleto) */}
        {withPerfil < total && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 print:hidden">
            <strong>{total - withPerfil} trabajadores</strong> aún no tienen el perfil sociodemográfico diligenciado.
            Las gráficas solo incluyen los {withPerfil} con datos registrados. Para un análisis completo, complete los perfiles desde el módulo de <strong>Trabajadores</strong>.
          </div>
        )}

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard label="Total trabajadores activos" value={total} icon={Users} color="bg-indigo-100 text-indigo-600" />
          <KpiCard label="Promedio de edad" value={avgAge ? `${avgAge} años` : "—"} sub={`${ages.length} con fecha de nacimiento`} icon={TrendingUp} color="bg-emerald-100 text-emerald-600" />
          <KpiCard label="Mujeres en la empresa" value={`${femPct}%`} sub={`${femeninas} de ${total} trabajadores`} icon={BarChart2} color="bg-pink-100 text-pink-600" />
          <KpiCard label="Con personas a cargo" value={`${conCargaPct}%`} sub={`${conCarga} trabajadores reportados`} icon={Heart} color="bg-amber-100 text-amber-600" />
        </div>

        {/* ── 1. Demografía básica ── */}
        <SectionHeader icon={Users} title="Distribución demográfica" color="bg-indigo-100 text-indigo-600" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniPie data={generos} title="Distribución por género" />
          <MiniBar data={ageRanges} title="Distribución por rango de edad" color="#6366f1" />
          <MiniBar data={estadoCivil} title="Estado civil" color="#8b5cf6" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniBar data={escolaridad} title="Nivel de escolaridad" color="#3b82f6" />
          <MiniBar data={estrato} title="Estrato socioeconómico" color="#06b6d4" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniBar data={personasCargo} title="Número de personas a cargo" color="#f59e0b" />
          <MiniPie data={vivienda} title="Tipo de vivienda" />
        </div>

        {/* ── 2. Condiciones laborales ── */}
        <SectionHeader icon={BarChart2} title="Condiciones laborales" color="bg-blue-100 text-blue-600" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniBar data={tipoContrato} title="Tipo de contrato" color="#3b82f6" />
          <MiniPie data={jornada} title="Jornada / turno de trabajo" />
          <MiniBar data={rangoSalarial} title="Rango salarial" color="#0ea5e9" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniBar data={tenureRanges} title="Antigüedad en la empresa" color="#6366f1" />
        </div>

        {/* ── 3. Salud y hábitos ── */}
        <SectionHeader icon={Heart} title="Salud y hábitos" color="bg-rose-100 text-rose-600" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MiniPie data={vacunacion} title="Estado de vacunación" />
          <MiniBar data={actividadFis} title="Actividad física" color="#22c55e" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <MiniPie data={tabaco} title="Consumo de tabaco" />
          <MiniPie data={alcohol} title="Consumo de alcohol" />
        </div>

        {/* ── Notas del informe (solo print) ── */}
        <div className="hidden print:block mt-8 border-t pt-4">
          <p className="text-[10px] text-gray-400">
            Informe generado por SSTLink · {empresa?.nombre} · {new Date().toLocaleDateString("es-CO")} · Información confidencial — uso exclusivo interno SG-SST.
          </p>
        </div>

      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #root * { visibility: hidden; }
          [data-print-area], [data-print-area] * { visibility: visible; }
          aside, nav, header { display: none !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </AppLayout>
  );
}
