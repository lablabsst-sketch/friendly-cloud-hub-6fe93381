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
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Plus, Pencil, Trash2,
  ShieldAlert, Clock, CheckCircle2, TrendingDown,
} from "lucide-react";
import { SensitiveDataNotice } from "@/components/SensitiveDataNotice";

interface Trabajador { id: string; nombres: string; apellidos: string; cargo: string | null; }
interface Accidente {
  id: string; empresa_id: string; trabajador_id: string | null;
  fecha: string; tipo: string | null; severidad: string | null;
  descripcion: string | null; dias_incapacidad: number | null;
  lugar: string | null; parte_cuerpo: string | null;
  reportado_arl: boolean | null; estado: string; created_at: string;
}

const TIPOS = ["Accidente incapacitante", "Accidente sin incapacidad", "Mortal", "Casi accidente", "Incidente"];
const SEVERIDADES = ["Leve", "Moderado", "Grave", "Mortal"];
const ESTADOS = ["pendiente", "en_investigacion", "cerrado"];
const ESTADO_LABELS: Record<string, string> = { pendiente: "Pendiente", en_investigacion: "En investigación", cerrado: "Cerrado" };

const TIPO_BADGE: Record<string, string> = {
  "Accidente incapacitante": "bg-red-100 text-red-800",
  "Accidente sin incapacidad": "bg-orange-100 text-orange-800",
  "Mortal": "bg-gray-900 text-white",
  "Casi accidente": "bg-yellow-100 text-yellow-800",
  "Incidente": "bg-blue-100 text-blue-800",
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
const months = [
  { value: "all", label: "Todos los meses" },
  { value: "1", label: "Enero" }, { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" }, { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" }, { value: "6", label: "Junio" },
  { value: "7", label: "Julio" }, { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" }, { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" }, { value: "12", label: "Diciembre" },
];

const emptyForm = {
  trabajador_id: "",
  fecha: new Date().toISOString().slice(0, 10),
  tipo: "Accidente incapacitante",
  severidad: "Leve",
  descripcion: "",
  dias_incapacidad: 0,
  lugar: "",
  parte_cuerpo: "",
  reportado_arl: false,
  estado: "pendiente",
};

export default function Accidentalidad() {
  const { empresa } = useAuth();
  const { toast } = useToast();

  const [accidentes, setAccidentes] = useState<Accidente[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Accidente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const workerMap = new Map(trabajadores.map((t) => [t.id, `${t.nombres} ${t.apellidos}`]));

  const fetchAll = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const [{ data: acs }, { data: trabs }] = await Promise.all([
      (supabase as any).from("accidentes").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }),
      supabase.from("trabajadores").select("id, nombres, apellidos, cargo").eq("empresa_id", empresa.id).eq("estado", "activo"),
    ]);
    setAccidentes(acs ?? []);
    setTrabajadores(trabs ?? []);
    setLoading(false);
  }, [empresa?.id]);

  useEffect(() => { if (empresa?.id) fetchAll(); }, [empresa?.id, fetchAll]);

  const filtered = accidentes.filter((a) => {
    const d = new Date(a.fecha);
    const yearOk = String(d.getFullYear()) === filterYear;
    const monthOk = filterMonth === "all" || String(d.getMonth() + 1) === filterMonth;
    return yearOk && monthOk;
  });

  // KPIs
  const total = filtered.length;
  const conIncapacidad = filtered.filter((a) => (a.dias_incapacidad ?? 0) > 0).length;
  const diasPerdidos = filtered.reduce((s, a) => s + (a.dias_incapacidad ?? 0), 0);
  const cerrados = filtered.filter((a) => a.estado === "cerrado").length;

  // IF/IS/IL (GTC 3701, K=240.000) usando num_empleados_directos
  const K = 240000;
  const numEmpleados = empresa?.num_empleados_directos ?? 0;
  const hhAno = numEmpleados * 8 * 22 * 12;
  const IF = hhAno > 0 ? ((conIncapacidad * K) / hhAno).toFixed(2) : "—";
  const IS = hhAno > 0 ? ((diasPerdidos * K) / hhAno).toFixed(2) : "—";
  const IL = hhAno > 0 && IF !== "—" && IS !== "—"
    ? ((parseFloat(IF) * parseFloat(IS)) / K).toFixed(2) : "—";

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: Accidente) => {
    setEditing(a);
    setForm({
      trabajador_id: a.trabajador_id ?? "",
      fecha: a.fecha,
      tipo: a.tipo ?? "Accidente incapacitante",
      severidad: a.severidad ?? "Leve",
      descripcion: a.descripcion ?? "",
      dias_incapacidad: a.dias_incapacidad ?? 0,
      lugar: a.lugar ?? "",
      parte_cuerpo: a.parte_cuerpo ?? "",
      reportado_arl: a.reportado_arl ?? false,
      estado: a.estado,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!empresa?.id || !form.fecha) return;
    setSaving(true);
    const payload = {
      empresa_id: empresa.id,
      trabajador_id: form.trabajador_id || null,
      fecha: form.fecha,
      tipo: form.tipo || null,
      severidad: form.severidad || null,
      descripcion: form.descripcion || null,
      dias_incapacidad: form.dias_incapacidad,
      lugar: form.lugar || null,
      parte_cuerpo: form.parte_cuerpo || null,
      reportado_arl: form.reportado_arl,
      estado: form.estado,
    };
    if (editing) {
      const { error } = await (supabase as any).from("accidentes").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      else { toast({ title: "Accidente actualizado" }); setDialogOpen(false); fetchAll(); }
    } else {
      const { error } = await (supabase as any).from("accidentes").insert(payload);
      if (error) toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      else { toast({ title: "Accidente registrado" }); setDialogOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any).from("accidentes").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Registro eliminado" });
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <AppLayout breadcrumbs={["SSTLink", "Accidentalidad"]}>
      <div className="space-y-4 max-w-6xl">
        {/* Header */}
        <div className="page-header !pb-3 !mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-[#DC2626]" />
              Accidentalidad
            </h1>
            <p className="page-subtitle">Registro de accidentes e incidentes de trabajo</p>
            <SensitiveDataNotice className="mt-2 max-w-xl" />
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />Registrar accidente
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
            <>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2"><ShieldAlert className="h-4 w-4 text-red-600" /></div>
                <div><p className="text-xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total accidentes</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2"><AlertTriangle className="h-4 w-4 text-orange-600" /></div>
                <div><p className="text-xl font-bold">{conIncapacidad}</p><p className="text-xs text-muted-foreground">Con incapacidad</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><Clock className="h-4 w-4 text-blue-600" /></div>
                <div><p className="text-xl font-bold">{diasPerdidos}</p><p className="text-xs text-muted-foreground">Días incapacidad</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                <div><p className="text-xl font-bold">{cerrados}</p><p className="text-xs text-muted-foreground">Investigados/cerrados</p></div>
              </CardContent></Card>
            </>
          )}
        </div>

        {/* IF/IS/IL */}
        {!loading && (
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "IF — Índice de Frecuencia", value: IF, color: "text-red-600", desc: "AT incapacitantes × 240K / HH año" },
              { label: "IS — Índice de Severidad", value: IS, color: "text-orange-600", desc: "Días incapacidad × 240K / HH año" },
              { label: "IL — Índice de Lesionabilidad", value: IL, color: "text-purple-600", desc: "IF × IS / 240K" },
            ].map(({ label, value, color, desc }) => (
              <Card key={label}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className={`h-3.5 w-3.5 ${color}`} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                  {numEmpleados === 0 && <p className="text-[10px] text-orange-500 mt-1">⚠ Configura N° empleados en Mi Empresa</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>{months.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">{Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <AlertTriangle className="mx-auto h-9 w-9 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground font-medium">No hay accidentes registrados</p>
                <p className="text-xs text-muted-foreground">Haz clic en "Registrar accidente" para comenzar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead>Días inc.</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{new Date(a.fecha + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                        <TableCell className="font-medium text-sm">{a.trabajador_id ? (workerMap.get(a.trabajador_id) ?? "—") : "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_BADGE[a.tipo ?? ""] ?? "bg-gray-100 text-gray-700"}`}>
                            {a.tipo ?? "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{a.severidad ?? "—"}</TableCell>
                        <TableCell className="text-sm">{a.dias_incapacidad ?? 0}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.lugar ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={a.estado === "cerrado" ? "default" : "secondary"}>
                            {ESTADO_LABELS[a.estado] ?? a.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ id: a.id, nombre: `accidente del ${a.fecha}${workerMap.get(a.trabajador_id ?? "") ? ` (${workerMap.get(a.trabajador_id ?? "")})` : ""}` })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar accidente" : "Registrar accidente"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha *</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Trabajador</Label>
                <Select value={form.trabajador_id} onValueChange={(v) => setForm({ ...form, trabajador_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar…" /></SelectTrigger>
                  <SelectContent>
                    {trabajadores.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.nombres} {t.apellidos}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de accidente</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severidad</Label>
                <Select value={form.severidad} onValueChange={(v) => setForm({ ...form, severidad: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SEVERIDADES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Días de incapacidad</Label>
                <Input type="number" min={0} value={form.dias_incapacidad} onChange={(e) => setForm({ ...form, dias_incapacidad: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s}>{ESTADO_LABELS[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Lugar del accidente</Label>
                <Input value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} placeholder="Ej: Bodega 2, Planta…" />
              </div>
              <div className="space-y-1.5">
                <Label>Parte del cuerpo afectada</Label>
                <Input value={form.parte_cuerpo} onChange={(e) => setForm({ ...form, parte_cuerpo: e.target.value })} placeholder="Ej: Mano derecha…" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción del evento</Label>
              <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} placeholder="Describe cómo ocurrió el accidente…" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.reportado_arl} onCheckedChange={(v) => setForm({ ...form, reportado_arl: v })} id="arl" />
              <Label htmlFor="arl">Reportado a la ARL</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={save} disabled={saving || !form.fecha}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        itemName={deleteTarget?.nombre ?? "este registro"}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </AppLayout>
  );
}
