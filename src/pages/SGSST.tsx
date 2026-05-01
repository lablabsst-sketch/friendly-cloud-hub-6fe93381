import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown, ShieldCheck, Info, X, FileDown, Loader2 } from "lucide-react";
import { EstandarRow } from "@/components/sgsst/EstandarRow";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { exportSgsstPdf, type EstandarExport } from "@/lib/sgsstPdf";

const NIVELES = [
  { value: "7", label: "7 estándares" },
  { value: "21", label: "21 estándares" },
  { value: "60", label: "60 estándares" },
  { value: "personalizado", label: "Personalizado" },
];

const FASES = [
  { key: "PLANEAR", color: "#3B82F6", desc: "Política, objetivos y planificación del SG-SST" },
  { key: "HACER", color: "#F59E0B", desc: "Ejecución: gestión de peligros, salud y operación" },
  { key: "VERIFICAR", color: "#8B5CF6", desc: "Auditoría, indicadores y revisión por la dirección" },
  { key: "ACTUAR", color: "#22C55E", desc: "Acciones preventivas, correctivas y mejora continua" },
];

interface Estandar {
  id: string; codigo: string; nombre: string; fase: string; grupo: string;
  aplica_7: boolean; aplica_21: boolean; aplica_60: boolean; orden: number; puntaje: number;
}

interface DocEstandar {
  id: string; estandar_id: string;
  doc_url: string | null; doc_nombre: string | null; doc_subido_en: string | null;
  plantilla_url: string | null; plantilla_nombre: string | null; plantilla_subido_en: string | null;
  estado: string;
}

interface FaseData {
  fase: string; total: number; completados: number; en_progreso: number;
  porcentaje: number; puntos_total: number; puntos_obtenidos: number;
}
interface CumplimientoData {
  porcentaje: number; total: number; completados: number;
  puntos_total: number; puntos_obtenidos: number;
  nivel: string; fases: FaseData[];
}

const INSTRUCCIONES_KEY = "sgsst_instrucciones_dismissed";
const FASES_KEY = (eid: string) => `sgsst_open_fases_${eid}`;
const NIVEL_KEY = (eid: string) => `sgsst_nivel_${eid}`;
const DEFAULT_FASES = { PLANEAR: true, HACER: false, VERIFICAR: false, ACTUAR: false };

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function SGSST() {
  const { empresa } = useAuth();
  const empresaId = empresa?.id;

  const [nivel, setNivel] = useState<string>(() =>
    empresaId ? localStorage.getItem(NIVEL_KEY(empresaId)) ?? "21" : "21"
  );
  const [estandares, setEstandares] = useState<Estandar[]>([]);
  const [docs, setDocs] = useState<DocEstandar[]>([]);
  const [cumplimiento, setCumplimiento] = useState<CumplimientoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFases, setOpenFases] = useState<Record<string, boolean>>(() =>
    empresaId ? readJSON(FASES_KEY(empresaId), DEFAULT_FASES) : DEFAULT_FASES
  );
  const [showInstrucciones, setShowInstrucciones] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(INSTRUCCIONES_KEY) !== "1";
  });

  // Re-hidratar al cambiar de empresa (si aún no estaba disponible al montar)
  useEffect(() => {
    if (!empresaId) return;
    const savedNivel = localStorage.getItem(NIVEL_KEY(empresaId));
    if (savedNivel) setNivel(savedNivel);
    setOpenFases(readJSON(FASES_KEY(empresaId), DEFAULT_FASES));
  }, [empresaId]);

  // Persistir acordeones
  useEffect(() => {
    if (!empresaId) return;
    try {
      localStorage.setItem(FASES_KEY(empresaId), JSON.stringify(openFases));
    } catch { /* quota */ }
  }, [openFases, empresaId]);

  // Persistir nivel
  useEffect(() => {
    if (!empresaId || !nivel) return;
    try {
      localStorage.setItem(NIVEL_KEY(empresaId), nivel);
    } catch { /* quota */ }
  }, [nivel, empresaId]);

  const dismissInstrucciones = () => {
    localStorage.setItem(INSTRUCCIONES_KEY, "1");
    setShowInstrucciones(false);
  };

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);

    const [{ data: estData }, { data: nivelData }, { data: docsData }, { data: cumplData }] = await Promise.all([
      supabase.from("phva_estandares").select("*").order("orden"),
      supabase.from("empresa_estandares").select("nivel").eq("empresa_id", empresaId).maybeSingle(),
      supabase.from("docs_estandar").select("*").eq("empresa_id", empresaId),
      supabase.rpc("get_cumplimiento_phva", { p_empresa_id: empresaId }),
    ]);

    setEstandares((estData as Estandar[]) ?? []);
    setDocs((docsData as DocEstandar[]) ?? []);
    // Solo aplicar nivel del servidor si el usuario no tiene preferencia local
    if (nivelData?.nivel && !localStorage.getItem(NIVEL_KEY(empresaId))) {
      setNivel(nivelData.nivel);
    }
    if (cumplData) setCumplimiento(cumplData as unknown as CumplimientoData);
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleNivelChange = async (newNivel: string) => {
    if (!empresaId) return;
    setNivel(newNivel);
    const { error } = await supabase
      .from("empresa_estandares")
      .upsert({ empresa_id: empresaId, nivel: newNivel } as any, { onConflict: "empresa_id" });
    if (error) toast.error("Error al guardar nivel");
    else fetchData();
  };

  const filteredEstandares = estandares.filter(e => {
    if (nivel === "7") return e.aplica_7;
    if (nivel === "21") return e.aplica_21;
    if (nivel === "60") return e.aplica_60;
    return true;
  });

  const getDocForEstandar = (estandarId: string) => docs.find(d => d.estandar_id === estandarId) ?? null;
  const getFaseData = (fase: string) => cumplimiento?.fases?.find(f => f.fase === fase);

  const groupByGrupo = (items: Estandar[]) => {
    const groups: Record<string, Estandar[]> = {};
    items.forEach(e => {
      if (!groups[e.grupo]) groups[e.grupo] = [];
      groups[e.grupo].push(e);
    });
    return groups;
  };

  // Resumen de estados por fase para el desglose
  const getFaseBreakdown = (fase: string) => {
    const items = filteredEstandares.filter(e => e.fase === fase);
    const sin_iniciar = items.filter(e => {
      const d = getDocForEstandar(e.id);
      return !d || d.estado === "sin_iniciar";
    }).length;
    return { sin_iniciar, items };
  };

  const fmt = (n: number) => Number.isInteger(n) ? n.toString() : n.toFixed(1);

  const [exporting, setExporting] = useState(false);
  const handleExportPdf = async () => {
    if (!cumplimiento || !empresa) {
      toast.error("Aún no hay datos de cumplimiento para exportar");
      return;
    }
    setExporting(true);
    try {
      const items: EstandarExport[] = filteredEstandares.map(e => {
        const d = getDocForEstandar(e.id);
        const estado = (d?.estado ?? "sin_iniciar") as EstandarExport["estado"];
        return {
          codigo: e.codigo,
          nombre: e.nombre,
          fase: e.fase,
          grupo: e.grupo,
          puntaje: e.puntaje ?? 0,
          estado,
          doc_subido: !!d?.doc_url,
          plantilla_subida: !!d?.plantilla_url,
        };
      });
      exportSgsstPdf({
        empresaNombre: empresa.nombre ?? "Empresa",
        empresaNit: empresa.nit ?? null,
        cumplimiento,
        estandares: items,
      });
      toast.success("Reporte SG-SST generado");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF");
    } finally {
      setExporting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={150}>
      <AppLayout breadcrumbs={["SSTLink", "SG-SST"]}>
        <div className="space-y-4 max-w-6xl">
          {/* Header */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <h1 className="text-[17px] font-medium">Sistema de Gestión SG-SST</h1>
              <p className="text-[12px] text-muted-foreground">Ciclo PHVA · Resolución 0312 de 2019</p>
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-8 text-[12px] gap-1.5"
              disabled={exporting || loading || !cumplimiento}
              onClick={handleExportPdf}
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Exportar PDF
            </Button>
            {!showInstrucciones && (
              <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5"
                onClick={() => setShowInstrucciones(true)}>
                <Info className="w-3.5 h-3.5" /> Instrucciones
              </Button>
            )}
          </div>

          {/* Banner de instrucciones */}
          {showInstrucciones && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 relative">
              <button
                onClick={dismissInstrucciones}
                aria-label="Cerrar instrucciones"
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md hover:bg-primary/10 text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-start gap-3 pr-8">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <div className="space-y-2 text-[12px] text-foreground">
                  <p className="font-medium text-[13px]">Cómo usar este módulo</p>
                  <ul className="space-y-1 text-muted-foreground leading-relaxed">
                    <li>• <span className="text-foreground">Selecciona tu nivel</span>: 7 (≤10 trab. riesgo I-III), 21 (11-50 trab. I-III), 60 (&gt;50 trab. o riesgo IV-V).</li>
                    <li>• En cada estándar puedes subir <span className="text-foreground">Documento</span> (tu evidencia firmada) y <span className="text-foreground">Plantilla</span> (formato base de referencia).</li>
                    <li>• El cumplimiento usa <span className="text-foreground">puntaje ponderado</span> según Resolución 0312/2019. Cada estándar pesa diferente (0.5, 1, 2 o 4 puntos).</li>
                    <li>• <span className="text-foreground">Completado</span> (doc + plantilla) = 100% del puntaje · <span className="text-foreground">En progreso</span> (solo uno) = 50% · <span className="text-foreground">Sin iniciar</span> = 0%.</li>
                    <li>• Pasa el cursor sobre cada tarjeta de fase para ver el desglose detallado.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Nivel selector */}
          <div className="bg-surface rounded-xl border-[0.5px] border-border p-4">
            <p className="text-[12px] font-medium mb-2">Nivel de estándares mínimos</p>
            <div className="flex flex-wrap gap-2">
              {NIVELES.map(n => (
                <Button key={n.value} variant={nivel === n.value ? "default" : "outline"}
                  size="sm" className="h-8 text-[12px]" onClick={() => handleNivelChange(n.value)}>
                  {n.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Progress cards con tooltip/popover */}
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[1,2,3,4].map(i => <Skeleton key={i} className="h-[110px] rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              {FASES.map(f => {
                const data = getFaseData(f.key);
                const breakdown = getFaseBreakdown(f.key);
                const porcentaje = data?.porcentaje ?? 0;
                const puntosObt = data?.puntos_obtenidos ?? 0;
                const puntosTot = data?.puntos_total ?? 0;

                const card = (
                  <div className="bg-surface rounded-xl border-[0.5px] border-border p-3.5 cursor-help hover:border-primary/40 transition-colors w-full text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-medium" style={{ color: f.color }}>{f.key}</span>
                      <span className="text-[18px] font-medium">{porcentaje}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${porcentaje}%`, background: f.color }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {fmt(puntosObt)}/{fmt(puntosTot)} pts · {data?.completados ?? 0}/{data?.total ?? 0}
                    </p>
                  </div>
                );

                const detail = (
                  <div className="space-y-2 text-[12px] min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-border pb-1.5">
                      <span className="font-medium" style={{ color: f.color }}>{f.key}</span>
                      <span className="font-medium">{porcentaje}%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">{f.desc}</p>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Puntos obtenidos</span>
                        <span className="font-medium">{fmt(puntosObt)} / {fmt(puntosTot)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-600">● Completados</span>
                        <span>{data?.completados ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-600">● En progreso</span>
                        <span>{data?.en_progreso ?? 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">○ Sin iniciar</span>
                        <span>{breakdown.sin_iniciar}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-1 mt-1">
                        <span className="text-muted-foreground">Total estándares</span>
                        <span className="font-medium">{data?.total ?? 0}</span>
                      </div>
                    </div>
                  </div>
                );

                return (
                  <div key={f.key}>
                    {/* Desktop: tooltip */}
                    <div className="hidden md:block">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button type="button" className="w-full">{card}</button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="p-3">{detail}</TooltipContent>
                      </Tooltip>
                    </div>
                    {/* Móvil: popover (tap) */}
                    <div className="md:hidden">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button type="button" className="w-full">{card}</button>
                        </PopoverTrigger>
                        <PopoverContent side="bottom" className="p-3 w-auto">{detail}</PopoverContent>
                      </Popover>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Global */}
          {cumplimiento && (
            <div className="bg-surface rounded-xl border-[0.5px] border-border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <span className="text-[36px] font-medium text-primary leading-none">{cumplimiento.porcentaje}%</span>
              <div className="flex-1">
                <p className="text-[13px] font-medium">Cumplimiento global ponderado</p>
                <p className="text-[11px] text-muted-foreground">
                  {fmt(cumplimiento.puntos_obtenidos ?? 0)} de {fmt(cumplimiento.puntos_total ?? 0)} puntos ·
                  {" "}{cumplimiento.completados}/{cumplimiento.total} estándares completados ·
                  {" "}Nivel: {cumplimiento.nivel}
                </p>
              </div>
            </div>
          )}

          {/* PHVA Sections */}
          {loading ? (
            <Skeleton className="h-[300px] rounded-xl" />
          ) : (
            <div className="space-y-2">
              {FASES.map(f => {
                const faseItems = filteredEstandares.filter(e => e.fase === f.key);
                if (faseItems.length === 0) return null;
                const groups = groupByGrupo(faseItems);
                const isOpen = openFases[f.key];
                const data = getFaseData(f.key);

                return (
                  <Collapsible key={f.key} open={isOpen}
                    onOpenChange={(o) => setOpenFases(prev => ({ ...prev, [f.key]: o }))}>
                    <CollapsibleTrigger className="w-full">
                      <div className="bg-surface rounded-xl border-[0.5px] border-border p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: f.color }} />
                          <span className="text-[13px] font-medium">{f.key}</span>
                          <span className="text-[11px] text-muted-foreground">
                            ({faseItems.length} estándares · {data?.porcentaje ?? 0}%)
                          </span>
                        </div>
                        <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="bg-surface rounded-b-xl border-x-[0.5px] border-b-[0.5px] border-border px-4 pb-4 -mt-1">
                        {Object.entries(groups).map(([grupo, items]) => (
                          <div key={grupo} className="mt-3">
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{grupo}</p>
                            {items.map(est => (
                              <EstandarRow key={est.id} estandar={est} empresaId={empresaId!}
                                doc={getDocForEstandar(est.id)} onUpdate={fetchData} />
                            ))}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </AppLayout>
    </TooltipProvider>
  );
}
