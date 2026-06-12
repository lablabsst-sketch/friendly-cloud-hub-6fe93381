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
import {
  Stethoscope, Plus, Pencil, Trash2, CheckCircle2, XCircle, Clock, Paperclip, Upload,
} from "lucide-react";
import { SensitiveDataNotice } from "@/components/SensitiveDataNotice";

interface Trabajador { id: string; nombres: string; apellidos: string; cargo: string | null; }
interface ExamenMedico {
  id: string; empresa_id: string; trabajador_id: string;
  tipo: string; fecha: string; resultado: string | null;
  concepto: string | null; proximo_control: string | null;
  restricciones: string | null; soporte_url: string | null;
  created_at: string;
}

const TIPOS: Record<string, string> = {
  ingreso: "Ingreso",
  periodico: "Periódico",
  egreso: "Egreso",
  posvacacional: "Posvacacional",
  reubicacion: "Reubicación",
};

const RESULTADOS: Record<string, string> = {
  apto: "Apto",
  apto_con_restricciones: "Apto con restricciones",
  no_apto: "No apto",
  pendiente: "Pendiente",
};

const resultadoBadge = (resultado: string | null) => {
  const base = "text-xs font-medium px-2 py-0.5 rounded-full";
  if (resultado === "apto") return <span className={`${base} bg-green-100 text-green-800`}>Apto</span>;
  if (resultado === "apto_con_restricciones") return <span className={`${base} bg-orange-100 text-orange-800`}>Apto c/ restricciones</span>;
  if (resultado === "no_apto") return <span className={`${base} bg-red-100 text-red-800`}>No apto</span>;
  return <span className={`${base} bg-gray-100 text-gray-700`}>Pendiente</span>;
};

const vencimientoClass = (fecha: string | null) => {
  if (!fecha) return "";
  const diff = (new Date(fecha + "T12:00:00").getTime() - Date.now()) / 86400000;
  if (diff < 0) return "text-red-600 font-semibold";
  if (diff <= 30) return "text-orange-500 font-semibold";
  return "";
};

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const emptyForm = {
  trabajador_id: "",
  tipo: "ingreso",
  fecha: new Date().toISOString().slice(0, 10),
  resultado: "pendiente",
  concepto: "",
  proximo_control: "",
  restricciones: "",
  soporte_url: "" as string | null | "",
};

export default function ExamenesMedicos() {
  const { empresa } = useAuth();
  const { toast } = useToast();

  const [examenes, setExamenes] = useState<ExamenMedico[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterTipo, setFilterTipo] = useState("all");
  const [filterResultado, setFilterResultado] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExamenMedico | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleUploadSoporte = async (file: File) => {
    if (!empresa?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 10 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${empresa.id}/examenes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast({ title: "Error al subir archivo", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setForm((f) => ({ ...f, soporte_url: data?.signedUrl ?? "" }));
    setUploading(false);
    toast({ title: "Archivo cargado" });
  };

  const workerMap = new Map(trabajadores.map((t) => [t.id, `${t.nombres} ${t.apellidos}`]));

  const fetchAll = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const [{ data: exs }, { data: trabs }] = await Promise.all([
      (supabase as any).from("examenes_medicos").select("*").eq("empresa_id", empresa.id).order("fecha", { ascending: false }),
      supabase.from("trabajadores").select("id, nombres, apellidos, cargo").eq("empresa_id", empresa.id),
    ]);
    setExamenes(exs ?? []);
    setTrabajadores(trabs ?? []);
    setLoading(false);
  }, [empresa?.id]);

  useEffect(() => { if (empresa?.id) fetchAll(); }, [empresa?.id, fetchAll]);

  const filtered = examenes.filter((e) => {
    const d = new Date(e.fecha);
    const yearOk = String(d.getFullYear()) === filterYear;
    const tipoOk = filterTipo === "all" || e.tipo === filterTipo;
    const resOk = filterResultado === "all" || e.resultado === filterResultado;
    return yearOk && tipoOk && resOk;
  });

  // KPIs
  const total = filtered.length;
  const aptos = filtered.filter((e) => e.resultado === "apto").length;
  const noAptos = filtered.filter((e) => e.resultado === "no_apto").length;
  const porVencer = examenes.filter((e) => {
    if (!e.proximo_control) return false;
    const diff = (new Date(e.proximo_control + "T12:00:00").getTime() - Date.now()) / 86400000;
    return diff >= 0 && diff <= 30;
  }).length;

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: ExamenMedico) => {
    setEditing(e);
    setForm({
      trabajador_id: e.trabajador_id,
      tipo: e.tipo,
      fecha: e.fecha,
      resultado: e.resultado ?? "pendiente",
      concepto: e.concepto ?? "",
      proximo_control: e.proximo_control ?? "",
      restricciones: e.restricciones ?? "",
      soporte_url: e.soporte_url ?? "",
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!empresa?.id || !form.trabajador_id || !form.fecha) return;
    setSaving(true);
    const payload = {
      empresa_id: empresa.id,
      trabajador_id: form.trabajador_id,
      tipo: form.tipo,
      fecha: form.fecha,
      resultado: form.resultado,
      concepto: form.concepto || null,
      proximo_control: form.proximo_control || null,
      restricciones: form.resultado === "apto_con_restricciones" ? (form.restricciones || null) : null,
      soporte_url: form.soporte_url || null,
    };
    if (editing) {
      const { error } = await (supabase as any).from("examenes_medicos").update(payload).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Examen actualizado" }); setDialogOpen(false); fetchAll(); }
    } else {
      const { error } = await (supabase as any).from("examenes_medicos").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else { toast({ title: "Examen registrado" }); setDialogOpen(false); fetchAll(); }
    }
    setSaving(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await (supabase as any).from("examenes_medicos").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Examen eliminado" });
    setDeleteTarget(null);
    fetchAll();
  };

  return (
    <AppLayout breadcrumbs={["SSTLink", "Exámenes Médicos"]}>
      <div className="space-y-4 max-w-6xl">
        {/* Header */}
        <div className="page-header !pb-3 !mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-[#1D4ED8]" />
              Exámenes Médicos Ocupacionales
            </h1>
            <p className="page-subtitle">Control de aptitud laboral y próximos controles</p>
            <SensitiveDataNotice className="mt-2 max-w-xl" />
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />Registrar examen
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
            <>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><Stethoscope className="h-4 w-4 text-blue-600" /></div>
                <div><p className="text-xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total exámenes</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                <div><p className="text-xl font-bold">{aptos}</p><p className="text-xs text-muted-foreground">Aptos {total > 0 ? `(${Math.round(aptos / total * 100)}%)` : ""}</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2"><XCircle className="h-4 w-4 text-red-600" /></div>
                <div><p className="text-xl font-bold">{noAptos}</p><p className="text-xs text-muted-foreground">No aptos</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className={`rounded-lg p-2 ${porVencer > 0 ? "bg-orange-100" : "bg-gray-100"}`}>
                  <Clock className={`h-4 w-4 ${porVencer > 0 ? "text-orange-600" : "text-gray-400"}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${porVencer > 0 ? "text-orange-600" : ""}`}>{porVencer}</p>
                  <p className="text-xs text-muted-foreground">Por vencer (30 días)</p>
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
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Todos los tipos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {Object.entries(TIPOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterResultado} onValueChange={setFilterResultado}>
            <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="Todos los resultados" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los resultados</SelectItem>
              {Object.entries(RESULTADOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
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
                icon={Stethoscope}
                title="No hay exámenes registrados"
                description="Lleva el control de aptitud laboral y próximos controles ocupacionales."
                action={{ label: "Registrar examen", onClick: openCreate, icon: Plus }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trabajador</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Próx. control</TableHead>
                      <TableHead>Resultado</TableHead>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium text-sm">{workerMap.get(e.trabajador_id) ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{TIPOS[e.tipo] ?? e.tipo}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                        <TableCell className={`text-sm ${vencimientoClass(e.proximo_control)}`}>
                          {e.proximo_control ? new Date(e.proximo_control + "T12:00:00").toLocaleDateString("es-CO") : "—"}
                        </TableCell>
                        <TableCell>{resultadoBadge(e.resultado)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{e.concepto ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {e.soporte_url && (
                              <a href={e.soporte_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-primary" title="Ver soporte">
                                <Paperclip className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ id: e.id, nombre: `examen ${TIPOS[e.tipo] ?? e.tipo}${workerMap.get(e.trabajador_id) ? ` de ${workerMap.get(e.trabajador_id)}` : ""}` })}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
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
          <DialogHeader><DialogTitle>{editing ? "Editar examen" : "Registrar examen médico"}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-1.5">
              <Label>Trabajador *</Label>
              <Select value={form.trabajador_id} onValueChange={(v) => setForm({ ...form, trabajador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar trabajador…" /></SelectTrigger>
                <SelectContent>
                  {trabajadores.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.nombres} {t.apellidos}{t.cargo ? ` — ${t.cargo}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de examen *</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TIPOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Resultado *</Label>
                <Select value={form.resultado} onValueChange={(v) => setForm({ ...form, resultado: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(RESULTADOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {form.resultado === "apto_con_restricciones" && (
              <div className="space-y-1.5">
                <Label>Restricciones</Label>
                <Textarea value={form.restricciones} onChange={(e) => setForm({ ...form, restricciones: e.target.value })} rows={2} placeholder="Describe las restricciones médicas…" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Fecha del examen *</Label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Próximo control</Label>
                <Input type="date" value={form.proximo_control} onChange={(e) => setForm({ ...form, proximo_control: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Concepto / Observaciones</Label>
              <Textarea value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} rows={3} placeholder="Concepto del médico, observaciones…" />
            </div>
            <div className="space-y-1.5">
              <Label>Soporte / Certificado (PDF o imagen, máx. 10 MB)</Label>
              {form.soporte_url ? (
                <div className="flex items-center gap-2 text-xs">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  <a href={form.soporte_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">Ver archivo cargado</a>
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm({ ...form, soporte_url: "" })}>Quitar</Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:bg-accent">
                  {uploading ? <Clock className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{uploading ? "Subiendo…" : "Seleccionar archivo"}</span>
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadSoporte(f); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={save} disabled={saving || !form.trabajador_id || !form.fecha}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        itemName={deleteTarget?.nombre ?? "este examen"}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </AppLayout>
  );
}
