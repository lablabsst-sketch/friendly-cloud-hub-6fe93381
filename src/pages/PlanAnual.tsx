import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarRange, Plus, Pencil, Trash2, ChevronLeft, ChevronRight,
  Printer, CheckCircle2, TrendingUp, DollarSign, ListTodo, CheckSquare,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlanAnual {
  id: string;
  empresa_id: string;
  anio: number;
  titulo: string;
  objetivo: string | null;
  aprobado_por: string | null;
  estado: string;
}

interface Actividad {
  id: string;
  plan_id: string;
  empresa_id: string;
  categoria: string;
  actividad: string;
  objetivo: string | null;
  responsable: string | null;
  recursos: string | null;
  presupuesto: number | null;
  indicador: string | null;
  meses: number[];
  estado: string;
  porcentaje_avance: number;
  observaciones: string | null;
}

interface Tarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  fecha_fin: string | null;
  responsable: string | null;
  prioridad: string;
  estado: string;
}

interface Estandar {
  id: string;
  codigo: string;
  nombre: string;
  fase: string;
  grupo: string;
  orden: number;
}

interface Usuario {
  id: string;
  nombre_completo: string;
  rol: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

const CATEGORIAS = [
  "General",
  "Medicina Preventiva y del Trabajo",
  "Higiene Industrial",
  "Seguridad Industrial",
  "Capacitación y Entrenamiento",
  "Gestión de Emergencias",
  "Vigilancia Epidemiológica",
  "Inspecciones",
  "Auditoría y Mejora Continua",
];

const RECURSOS_OPTS = ["Financieros", "Recurso Humano", "Técnicos", "Tecnológico"];

const PRIORIDAD_COLOR: Record<string, string> = {
  alta:  "bg-red-100 text-red-700",
  media: "bg-yellow-100 text-yellow-700",
  baja:  "bg-green-100 text-green-700",
};

const ESTADO_COLOR: Record<string, string> = {
  pendiente:    "bg-gray-100 text-gray-600",
  "en-proceso": "bg-blue-100 text-blue-700",
  completado:   "bg-green-100 text-green-700",
  cancelado:    "bg-red-100 text-red-700",
};

// ─── Blank form ───────────────────────────────────────────────────────────────

const blankActividad = () => ({
  categoria: "General",
  actividad: "",
  responsable: "",
  recursos: "",
  presupuesto: null as number | null,
  indicador: "",   // stores estandar codigo
  meses: [] as number[],
  estado: "pendiente",
  porcentaje_avance: 0,
  observaciones: "",
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanAnualPage() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const anioActual = new Date().getFullYear();

  const [anio, setAnio] = useState(anioActual);
  const [plan, setPlan] = useState<PlanAnual | null>(null);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [estandares, setEstandares] = useState<Estandar[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [actividadDialog, setActividadDialog] = useState(false);
  const [editingActividad, setEditingActividad] = useState<Actividad | null>(null);
  const [formActividad, setFormActividad] = useState(blankActividad());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [planDialog, setPlanDialog] = useState(false);
  const [formPlan, setFormPlan] = useState({ titulo: "", objetivo: "", aprobado_por: "" });

  // ── Fetch static data (estandares + usuarios) ─────────────────────────────

  useEffect(() => {
    const load = async () => {
      const [{ data: estData }, { data: usrData }] = await Promise.all([
        supabase.from("phva_estandares").select("id,codigo,nombre,fase,grupo,orden").order("orden"),
        (supabase as any).from("usuarios")
          .select("id,nombre_completo,rol")
          .eq("empresa_id", empresa?.id)
          .in("rol", ["administrador", "asistente"]),
      ]);
      setEstandares(estData ?? []);
      setUsuarios(usrData ?? []);
    };
    if (empresa?.id) load();
  }, [empresa?.id]);

  // ── Fetch plan + actividades + tareas ─────────────────────────────────────

  const fetchPlan = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    try {
      const { data: planData } = await (supabase as any)
        .from("plan_anual")
        .select("*")
        .eq("empresa_id", empresa.id)
        .eq("anio", anio)
        .maybeSingle();

      setPlan(planData ?? null);

      if (planData) {
        const { data: actsData } = await (supabase as any)
          .from("actividades_plan_anual")
          .select("*")
          .eq("plan_id", planData.id)
          .order("categoria")
          .order("created_at");
        setActividades(actsData ?? []);
      } else {
        setActividades([]);
      }

      const { data: tareasData } = await (supabase as any)
        .from("tareas")
        .select("*")
        .eq("empresa_id", empresa.id)
        .gte("fecha", `${anio}-01-01`)
        .lte("fecha", `${anio}-12-31`)
        .order("fecha");
      setTareas(tareasData ?? []);
    } finally {
      setLoading(false);
    }
  }, [empresa?.id, anio]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // ── Estandares grouped by fase ────────────────────────────────────────────

  const estandaresPorFase = estandares.reduce<Record<string, Estandar[]>>((acc, e) => {
    (acc[e.fase] = acc[e.fase] ?? []).push(e);
    return acc;
  }, {});

  // ── Crear plan ────────────────────────────────────────────────────────────

  const crearPlan = async () => {
    if (!empresa?.id) return;
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from("plan_anual")
        .insert({
          empresa_id: empresa.id,
          anio,
          titulo: formPlan.titulo || `Plan Anual de Trabajo SG-SST ${anio}`,
          objetivo: formPlan.objetivo || null,
          aprobado_por: formPlan.aprobado_por || null,
          estado: "borrador",
        })
        .select()
        .single();
      if (error) throw error;
      setPlan(data);
      setPlanDialog(false);
      toast({ title: "Plan creado correctamente" });
    } catch {
      toast({ title: "Error al crear el plan", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Open dialogs ──────────────────────────────────────────────────────────

  const openNew = () => {
    setEditingActividad(null);
    setFormActividad(blankActividad());
    setActividadDialog(true);
  };

  const openEdit = (a: Actividad) => {
    setEditingActividad(a);
    setFormActividad({
      categoria: a.categoria,
      actividad: a.actividad,
      responsable: a.responsable ?? "",
      recursos: a.recursos ?? "",
      presupuesto: a.presupuesto,
      indicador: a.indicador ?? "",
      meses: [...a.meses],
      estado: a.estado,
      porcentaje_avance: a.porcentaje_avance,
      observaciones: a.observaciones ?? "",
    });
    setActividadDialog(true);
  };

  // Al seleccionar un estándar del indicador → auto-rellena "actividad"
  const onIndicadorChange = (codigo: string) => {
    const est = estandares.find(e => e.codigo === codigo);
    setFormActividad(p => ({
      ...p,
      indicador: codigo,
      actividad: est ? est.nombre : p.actividad,
    }));
  };

  const toggleMes = (m: number) => {
    setFormActividad(prev => ({
      ...prev,
      meses: prev.meses.includes(m)
        ? prev.meses.filter(x => x !== m)
        : [...prev.meses, m].sort((a, b) => a - b),
    }));
  };

  // ── Save actividad ────────────────────────────────────────────────────────

  const saveActividad = async () => {
    if (!plan || !empresa?.id) return;
    if (!formActividad.actividad.trim()) {
      toast({ title: "Escribe o selecciona una actividad", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        plan_id: plan.id,
        empresa_id: empresa.id,
        categoria: formActividad.categoria,
        actividad: formActividad.actividad,
        objetivo: null,
        responsable: formActividad.responsable || null,
        recursos: formActividad.recursos || null,
        presupuesto: formActividad.presupuesto,
        indicador: formActividad.indicador || null,
        meses: formActividad.meses,
        estado: formActividad.estado,
        porcentaje_avance: formActividad.porcentaje_avance,
        observaciones: formActividad.observaciones || null,
      };
      if (editingActividad) {
        const { error } = await (supabase as any)
          .from("actividades_plan_anual")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", editingActividad.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("actividades_plan_anual")
          .insert(payload);
        if (error) throw error;
      }
      setActividadDialog(false);
      fetchPlan();
      toast({ title: editingActividad ? "Actividad actualizada" : "Actividad creada" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Delete actividad ──────────────────────────────────────────────────────

  const deleteActividad = async () => {
    if (!deleteTarget) return;
    const { error } = await (supabase as any)
      .from("actividades_plan_anual")
      .delete()
      .eq("id", deleteTarget);
    setDeleteTarget(null);
    if (error) {
      toast({ title: "Error al eliminar", variant: "destructive" });
    } else {
      fetchPlan();
      toast({ title: "Actividad eliminada" });
    }
  };

  // ── KPIs ──────────────────────────────────────────────────────────────────

  const totalActs = actividades.length;
  const completadas = actividades.filter(a => a.estado === "completado").length;
  const pctAvance = totalActs
    ? Math.round(actividades.reduce((s, a) => s + a.porcentaje_avance, 0) / totalActs)
    : 0;
  const totalPresupuesto = actividades.reduce((s, a) => s + (a.presupuesto ?? 0), 0);

  const porCategoria = actividades.reduce<Record<string, Actividad[]>>((acc, a) => {
    (acc[a.categoria] = acc[a.categoria] ?? []).push(a);
    return acc;
  }, {});

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <AppLayout breadcrumbs={["Plan Anual"]}>
      {/* Header */}
      <div className="page-header !pb-3 !mb-4 flex items-center justify-between print:hidden">
        <div>
          <h1 className="page-title">Plan Anual de Trabajo</h1>
          {plan && <p className="page-subtitle">{plan.titulo}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button onClick={() => setAnio(a => a - 1)} className="px-2 py-1.5 hover:bg-muted transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 text-sm font-medium border-x min-w-[60px] text-center">{anio}</span>
            <button onClick={() => setAnio(a => a + 1)} className="px-2 py-1.5 hover:bg-muted transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1.5" /> Imprimir
          </Button>
          {plan && (
            <Button size="sm" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1.5" /> Nueva Actividad
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !plan ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <CalendarRange className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">No hay plan anual para {anio}</p>
          <Button onClick={() => {
            setFormPlan({ titulo: `Plan Anual de Trabajo SG-SST ${anio}`, objetivo: "", aprobado_por: "" });
            setPlanDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-1.5" /> Crear Plan {anio}
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="actividades">
          <TabsList className="mb-4 print:hidden">
            <TabsTrigger value="actividades">Actividades</TabsTrigger>
            <TabsTrigger value="tareas">Tareas ejecutadas</TabsTrigger>
          </TabsList>

          {/* ── ACTIVIDADES ── */}
          <TabsContent value="actividades">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Actividades", value: totalActs, icon: ListTodo, color: "bg-blue-100 text-blue-600" },
                { label: "Completadas", value: completadas, icon: CheckCircle2, color: "bg-green-100 text-green-600" },
                { label: "Avance promedio", value: `${pctAvance}%`, icon: TrendingUp, color: "bg-indigo-100 text-indigo-600" },
                {
                  label: "Presupuesto",
                  value: totalPresupuesto.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }),
                  icon: DollarSign,
                  color: "bg-yellow-100 text-yellow-600",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border-none shadow-sm bg-surface">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                        <p className="text-xl font-bold">{value}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Progress bar */}
            {totalActs > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Avance general del plan</span><span>{pctAvance}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pctAvance}%` }} />
                </div>
              </div>
            )}

            {totalActs === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <CalendarRange className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Sin actividades. Crea la primera.</p>
                <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1.5" /> Nueva Actividad</Button>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(porCategoria).map(([cat, acts]) => (
                  <div key={cat}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{cat}</h3>
                    <div className="rounded-lg border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead className="min-w-[220px]">Actividad</TableHead>
                            <TableHead className="min-w-[120px]">Responsable</TableHead>
                            <TableHead className="min-w-[100px]">Recursos</TableHead>
                            <TableHead className="min-w-[260px]">Meses</TableHead>
                            <TableHead className="text-right">Presupuesto</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-center">Avance</TableHead>
                            <TableHead />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {acts.map(a => (
                            <TableRow key={a.id}>
                              <TableCell>
                                <div>
                                  {a.indicador && (
                                    <span className="inline-block text-[10px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-200 rounded px-1 mb-0.5">
                                      {a.indicador}
                                    </span>
                                  )}
                                  <p className="font-medium text-sm">{a.actividad}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{a.responsable || "—"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{a.recursos || "—"}</TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-0.5">
                                  {MESES_LABELS.map((m, i) => (
                                    <span key={i} className={`text-[10px] px-1 py-0.5 rounded font-medium ${
                                      a.meses.includes(i + 1) ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground"
                                    }`}>{m}</span>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {a.presupuesto
                                  ? a.presupuesto.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
                                  : "—"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={`text-[10px] ${ESTADO_COLOR[a.estado] ?? ""}`}>
                                  {a.estado.replace("-", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${a.porcentaje_avance}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{a.porcentaje_avance}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(a.id)}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAREAS ── */}
          <TabsContent value="tareas">
            {tareas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <CheckSquare className="w-10 h-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Sin tareas registradas en {anio}.</p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Tarea</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tareas.map(t => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{t.titulo}</p>
                            {t.descripcion && <p className="text-xs text-muted-foreground line-clamp-1">{t.descripcion}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.responsable || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.fecha + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                          {t.fecha_fin && ` → ${new Date(t.fecha_fin + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}`}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${PRIORIDAD_COLOR[t.prioridad] ?? ""}`}>{t.prioridad}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${ESTADO_COLOR[t.estado] ?? ""}`}>{t.estado}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* ── Crear Plan Dialog ── */}
      <Dialog open={planDialog} onOpenChange={setPlanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crear Plan Anual {anio}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título del plan</Label>
              <Input
                value={formPlan.titulo}
                onChange={e => setFormPlan(p => ({ ...p, titulo: e.target.value }))}
                placeholder={`Plan Anual de Trabajo SG-SST ${anio}`}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo general</Label>
              <Textarea
                value={formPlan.objetivo}
                onChange={e => setFormPlan(p => ({ ...p, objetivo: e.target.value }))}
                rows={3}
                placeholder="Objetivo del plan..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Aprobado por</Label>
              <Input
                value={formPlan.aprobado_por}
                onChange={e => setFormPlan(p => ({ ...p, aprobado_por: e.target.value }))}
                placeholder="Nombre del responsable"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={crearPlan} disabled={saving}>{saving ? "Creando..." : "Crear Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Actividad Dialog ── */}
      <Dialog open={actividadDialog} onOpenChange={setActividadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingActividad ? "Editar Actividad" : "Nueva Actividad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">

            {/* Categoría + Estado */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={formActividad.categoria} onValueChange={v => setFormActividad(p => ({ ...p, categoria: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={formActividad.estado} onValueChange={v => setFormActividad(p => ({ ...p, estado: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en-proceso">En proceso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Indicador SG-SST → auto-rellena Actividad */}
            <div className="space-y-1.5">
              <Label>Indicador SG-SST</Label>
              <Select value={formActividad.indicador || ""} onValueChange={onIndicadorChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un estándar..." />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Object.entries(estandaresPorFase).map(([fase, ests]) => (
                    <SelectGroup key={fase}>
                      <SelectLabel className="text-xs font-bold text-muted-foreground">{fase}</SelectLabel>
                      {ests.map(e => (
                        <SelectItem key={e.id} value={e.codigo}>
                          <span className="font-mono text-[11px] text-indigo-600 mr-2">{e.codigo}</span>
                          <span className="text-sm">{e.nombre}</span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Al seleccionar un estándar se rellena la actividad automáticamente.</p>
            </div>

            {/* Actividad (editable, auto-filled from indicador) */}
            <div className="space-y-1.5">
              <Label>Actividad *</Label>
              <Input
                value={formActividad.actividad}
                onChange={e => setFormActividad(p => ({ ...p, actividad: e.target.value }))}
                placeholder="Descripción de la actividad"
              />
            </div>

            {/* Responsable + Recursos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Responsable</Label>
                <Select value={formActividad.responsable || ""} onValueChange={v => setFormActividad(p => ({ ...p, responsable: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {usuarios.length === 0 ? (
                      <SelectItem value="__none" disabled>Sin usuarios admin/asistente</SelectItem>
                    ) : (
                      usuarios.map(u => (
                        <SelectItem key={u.id} value={u.nombre_completo}>
                          {u.nombre_completo}
                          <span className="ml-2 text-[10px] text-muted-foreground">{u.rol}</span>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recursos</Label>
                <Select value={formActividad.recursos || ""} onValueChange={v => setFormActividad(p => ({ ...p, recursos: v }))}>
                  <SelectTrigger><SelectValue placeholder="Tipo de recurso..." /></SelectTrigger>
                  <SelectContent>
                    {RECURSOS_OPTS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Presupuesto */}
            <div className="space-y-1.5">
              <Label>Presupuesto (COP)</Label>
              <Input
                type="number"
                value={formActividad.presupuesto ?? ""}
                onChange={e => setFormActividad(p => ({ ...p, presupuesto: e.target.value ? Number(e.target.value) : null }))}
                placeholder="0"
              />
            </div>

            {/* Meses */}
            <div className="space-y-2">
              <Label>Meses de ejecución</Label>
              <div className="flex flex-wrap gap-1.5">
                {MESES_LABELS.map((m, i) => {
                  const mes = i + 1;
                  const active = formActividad.meses.includes(mes);
                  return (
                    <button
                      key={mes}
                      type="button"
                      onClick={() => toggleMes(mes)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                        active
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-background text-muted-foreground border-border hover:border-indigo-400"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Avance */}
            <div className="space-y-1.5">
              <Label>Porcentaje de avance: {formActividad.porcentaje_avance}%</Label>
              <input
                type="range"
                min={0} max={100} step={5}
                value={formActividad.porcentaje_avance}
                onChange={e => setFormActividad(p => ({ ...p, porcentaje_avance: Number(e.target.value) }))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label>Observaciones</Label>
              <Textarea
                value={formActividad.observaciones ?? ""}
                onChange={e => setFormActividad(p => ({ ...p, observaciones: e.target.value }))}
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={saveActividad} disabled={saving}>
              {saving ? "Guardando..." : editingActividad ? "Actualizar" : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar actividad?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteActividad} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
