import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { SkeletonRows } from "@/components/SkeletonRows";
import { EmptyState } from "@/components/EmptyState";
import { useToast } from "@/hooks/use-toast";
import { CalendarOff, Plus, Pencil, Trash2, Clock, BarChart3, Users } from "lucide-react";

interface Trabajador { id: string; nombres: string; apellidos: string; }
interface Ausencia {
  id: string; empresa_id: string; trabajador_id: string;
  fecha_inicio: string; fecha_fin: string | null;
  tipo: string; dias: number | null; motivo: string | null;
  soporte_url: string | null; estado: string; created_at: string;
}

const TIPOS: Record<string, string> = {
  EG: "Enfermedad General",
  EP: "Enfermedad Profesional",
  AT: "Accidente de Trabajo",
  MAT: "Maternidad / Cuidado",
  LIC: "Licencia no remunerada",
  OTR: "Otro",
};

const TIPO_BADGE: Record<string, string> = {
  EG: "bg-blue-100 text-blue-800",
  EP: "bg-purple-100 text-purple-800",
  AT: "bg-red-100 text-red-800",
  MAT: "bg-green-100 text-green-800",
  LIC: "bg-gray-100 text-gray-700",
  OTR: "bg-yellow-100 text-yellow-800",
};

const ESTADOS = ["activo", "cerrado"];

const diffDays = (start: string, end: string) => {
  const diff = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return Math.max(diff, 1);
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
  fecha_inicio: new Date().toISOString().slice(0, 10),
  fecha_fin: new Date().toISOString().slice(0, 10),
  tipo: "EG",
  dias: 1,
  motivo: "",
  estado: "activo",
};

export default function Ausentismo() {
  const { empresa } = useAuth();
  const { toast } = useToast();

  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterTipo, setFilterTipo] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ausencia | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const workerMap = new Map(trabajadores.map((t) => [t.id, `${t.nombres} ${t.apellidos}`]));

  const fetchAll = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const [{ data: aus }, { data: trabs }] = await Promise.all([
      (supabase as any).from("ausencias").select("*").eq("empresa_id", empresa.id).order("fecha_inicio", { ascending: false }),
      supabase.from("trabajadores").select("id, nombres, apellidos").eq("empresa_id", empresa.id),
    ]);
    setAusencias(aus ?? []);
    setTrabajadores(trabs ?? []);
    setLoading(false);
  }, [empresa?.id]);

  useEffect(() => { if (empresa?.id) fetchAll(); }, [empresa?.id, fetchAll]);

  const filtered = ausencias.filter((a) => {
    const d = new Date(a.fecha_inicio);
    const yearOk = String(d.getFullYear()) === filterYear;
    const monthOk = filterMonth === "all" || String(d.getMonth() + 1) === filterMonth;
    const tipoOk = filterTipo === "all" || a.tipo === filterTipo;
    return yearOk && monthOk && tipoOk;
  });

  // KPIs
  const total = filtered.length;
  const totalDias = filtered.reduce((s, a) => s + (a.dias ?? 0), 0);
  const causaCount: Record<string, number> = {};
  filtered.forEach((a) => { causaCount[a.tipo] = (causaCount[a.tipo] ?? 0) + 1; });
  const causaTop = Object.entries(causaCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const handleFechas = (field: "fecha_inicio" | "fecha_fin", value: string) => {
    const updated = { ...form, [field]: value };
    if (updated.fecha_inicio && updated.fecha_fin) {
      updated.dias = diffDays(updated.fecha_inicio, updated.fecha_fin);
    }
    setForm(updated);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: Ausencia) => {
    setEditing(a);
    setForm({
      trabajador_id: a.trabajador_id,
      fecha_inicio: a.fecha_inicio,
      fecha_fin: a.fecha_fin ?? a.fecha_inicio,
      tipo: a.tipo,
      dias: a.dias ?? 1,
      motivo: a.motivo ?? "",
      estado: a.estado,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!empresa?.id || !form.trabajador_id || !form.fecha_inicio) return;
    setSaving(true);
    const payload = {
      empresa_id: empresa.id,
      trabajador_id: form.trabajador_id,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      tipo: form.tipo,
      dias: form.dias,
      motivo: form.motivo || null,
      estado: form.estado,
    };
    if (editing) {
      const { error } = await (supabase as any).from("ausencias").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Ausencia actualizada" }); setDialogOpen(false); fetchAll(); }
    } else {
      const { error } = await (supabase as any).from("ausencias").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Ausencia registrada" }); setDialogOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any).from("ausencias").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Registro eliminado" });
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <AppLayout breadcrumbs={["SSTLink", "Ausentismo"]}>
      <div className="space-y-4 max-w-6xl">
        {/* Header */}
        <div className="page-header !pb-3 !mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <CalendarOff className="h-5 w-5 text-[#F97316]" />
              Ausentismo
            </h1>
            <p className="page-subtitle">Registro de ausencias y días perdidos por causa</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />Registrar ausencia
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {loading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
            <>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-2"><CalendarOff className="h-4 w-4 text-orange-600" /></div>
                <div><p className="text-xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total ausencias</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><Clock className="h-4 w-4 text-blue-600" /></div>
                <div><p className="text-xl font-bold">{totalDias}</p><p className="text-xs text-muted-foreground">Total días perdidos</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-purple-100 p-2"><BarChart3 className="h-4 w-4 text-purple-600" /></div>
                <div>
                  <p className="text-sm font-bold leading-tight">{causaTop ? TIPOS[causaTop] : "—"}</p>
                  <p className="text-xs text-muted-foreground">Causa más frecuente</p>
                </div>
              </CardContent></Card>
            </>
          )}
        </div>

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
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-52 h-8 text-sm"><SelectValue placeholder="Todas las causas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las causas</SelectItem>
              {Object.entries(TIPOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><SkeletonRows rows={4} height="h-10" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="No hay ausencias registradas"
                description="Lleva el control de incapacidades, permisos y licencias del equipo."
                action={{ label: "Registrar ausencia", onClick: openCreate, icon: Plus }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>Causa</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">{new Date(a.fecha_inicio + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                        <TableCell className="text-sm">{a.fecha_fin ? new Date(a.fecha_fin + "T12:00:00").toLocaleDateString("es-CO") : "—"}</TableCell>
                        <TableCell className="font-medium text-sm">{workerMap.get(a.trabajador_id) ?? "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TIPO_BADGE[a.tipo] ?? "bg-gray-100 text-gray-700"}`}>
                            {TIPOS[a.tipo] ?? a.tipo}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm font-medium">{a.dias ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground capitalize">{a.estado}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ id: a.id, nombre: `ausencia ${TIPOS[a.tipo] ?? a.tipo}${workerMap.get(a.trabajador_id) ? ` de ${workerMap.get(a.trabajador_id)}` : ""}` })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Editar ausencia" : "Registrar ausencia"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Trabajador *</Label>
              <Select value={form.trabajador_id} onValueChange={(v) => setForm({ ...form, trabajador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar trabajador…" /></SelectTrigger>
                <SelectContent>
                  {trabajadores.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nombres} {t.apellidos}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha inicio *</Label>
                <Input type="date" value={form.fecha_inicio} onChange={(e) => handleFechas("fecha_inicio", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha fin</Label>
                <Input type="date" value={form.fecha_fin} onChange={(e) => handleFechas("fecha_fin", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Causa *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Días perdidos</Label>
                <Input type="number" min={1} value={form.dias} onChange={(e) => setForm({ ...form, dias: parseInt(e.target.value) || 1 })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ESTADOS.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Motivo / Observaciones</Label>
              <Textarea value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} rows={3} placeholder="Observaciones adicionales…" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={save} disabled={saving || !form.trabajador_id || !form.fecha_inicio}>
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
