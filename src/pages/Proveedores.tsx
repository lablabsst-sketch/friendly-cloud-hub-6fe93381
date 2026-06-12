import { useEffect, useState, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { canEdit } from "@/lib/roles";
import {
  Plus, Search, Truck, Pencil, Trash2, AlertTriangle,
  Phone, Mail, Building2, ShieldCheck, CalendarClock,
  UserPlus, Copy, Check, ExternalLink, Link2, Plug, CheckCircle2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPlanLimits, normalizePlan, type PlanName } from "@/lib/planLimits";
import { PlanLimitBanner } from "@/components/plan/PlanLimitBanner";

// ── Types ──────────────────────────────────────────────────────────────────────
interface Proveedor {
  id: string;
  empresa_id: string;
  nombre: string;
  nit: string | null;
  tipo_servicio: string | null;
  representante: string | null;
  email: string | null;
  telefono: string | null;
  ciudad: string | null;
  departamento: string | null;
  arl: string | null;
  fecha_inicio_contrato: string | null;
  fecha_fin_contrato: string | null;
  estado: string;
  notas: string | null;
  empresa_proveedor_id: string | null;
  created_at: string;
}

type FormData = Omit<Proveedor, "id" | "empresa_id" | "created_at">;

const blank: FormData = {
  nombre: "", nit: "", tipo_servicio: "", representante: "",
  email: "", telefono: "", ciudad: "", departamento: "",
  arl: "", fecha_inicio_contrato: "", fecha_fin_contrato: "",
  estado: "activo", notas: "", empresa_proveedor_id: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────────
const ESTADO_STYLES: Record<string, string> = {
  activo:        "bg-emerald-100 text-emerald-700 border-emerald-200",
  en_evaluacion: "bg-amber-100 text-amber-700 border-amber-200",
  suspendido:    "bg-red-100 text-red-700 border-red-200",
  inactivo:      "bg-slate-100 text-slate-500 border-slate-200",
};

const ESTADO_LABEL: Record<string, string> = {
  activo: "Activo", en_evaluacion: "En evaluación",
  suspendido: "Suspendido", inactivo: "Inactivo",
};

function diasParaVencer(fecha: string | null): number | null {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmt(date: string | null): string {
  if (!date) return "—";
  return new Date(date + "T00:00:00").toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function Proveedores() {
  const { empresa, usuario } = useAuth();
  const { toast } = useToast();
  const puedeEditar = canEdit(usuario?.rol);

  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Proveedor | null>(null);
  const [form, setForm] = useState<FormData>(blank);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Match state (NIT already registered in platform)
  const [matchEmpresa, setMatchEmpresa] = useState<{ id: string; nombre: string } | null>(null);
  const [pendingSaveForm, setPendingSaveForm] = useState<typeof blank | null>(null);
  const [matchSaving, setMatchSaving] = useState(false);

  // Invite state
  const [inviteProveedor, setInviteProveedor] = useState<Proveedor | null>(null);
  const [inviteLink, setInviteLink] = useState("");
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const [plan, setPlan] = useState<PlanName>("pyme");
  const activeProvCount = proveedores.filter(p => p.estado !== "inactivo").length;
  const provLimit = getPlanLimits(plan).proveedores;
  const provLimitReached = activeProvCount >= provLimit;

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchProveedores = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("proveedores")
      .select("*")
      .eq("empresa_id", empresa.id)
      .order("nombre");
    if (error) toast({ title: "Error al cargar proveedores", description: error.message, variant: "destructive" });
    else setProveedores(data ?? []);
    setLoading(false);
  }, [empresa?.id]);

  useEffect(() => { fetchProveedores(); }, [fetchProveedores]);

  // ── Dialog helpers ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!empresa?.id) return;
    (supabase as any).from("empresas").select("plan").eq("id", empresa.id).maybeSingle()
      .then(({ data }: any) => setPlan(normalizePlan(data?.plan)));
  }, [empresa?.id]);

  // ── Dialog helpers ───────────────────────────────────────────────────────────
  const openNew = () => {
    if (provLimitReached) {
      toast({
        title: "Límite del plan alcanzado",
        description: `Has alcanzado el límite de tu plan. Actualiza para añadir más proveedores (${activeProvCount}/${provLimit}).`,
        variant: "destructive",
      });
      return;
    }
    setEditing(null);
    setForm(blank);
    setDialogOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setEditing(p);
    setForm({
      nombre: p.nombre, nit: p.nit ?? "", tipo_servicio: p.tipo_servicio ?? "",
      representante: p.representante ?? "", email: p.email ?? "", telefono: p.telefono ?? "",
      ciudad: p.ciudad ?? "", departamento: p.departamento ?? "", arl: p.arl ?? "",
      fecha_inicio_contrato: p.fecha_inicio_contrato ?? "", fecha_fin_contrato: p.fecha_fin_contrato ?? "",
      estado: p.estado, notas: p.notas ?? "", empresa_proveedor_id: p.empresa_proveedor_id ?? null,
    });
    setDialogOpen(true);
  };

  const set = (k: keyof FormData) => (v: string) => setForm(p => ({ ...p, [k]: v }));
  const setEv = (k: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Save ─────────────────────────────────────────────────────────────────────
  const buildPayload = (f: FormData) => ({
    ...f,
    empresa_id: empresa!.id,
    nit: f.nit || null,
    tipo_servicio: f.tipo_servicio || null,
    representante: f.representante || null,
    email: f.email || null,
    telefono: f.telefono || null,
    ciudad: f.ciudad || null,
    departamento: f.departamento || null,
    arl: f.arl || null,
    fecha_inicio_contrato: f.fecha_inicio_contrato || null,
    fecha_fin_contrato: f.fecha_fin_contrato || null,
    notas: f.notas || null,
  });

  const doInsert = async (payload: ReturnType<typeof buildPayload>, enlaceEmpresaId?: string) => {
    const { data, error } = await (supabase as any)
      .from("proveedores").insert(payload).select("id").single();
    if (error) throw error;
    if (enlaceEmpresaId && data?.id) {
      await (supabase as any).from("solicitudes_enlace").insert({
        empresa_solicitante_id: empresa!.id,
        empresa_proveedor_id: enlaceEmpresaId,
        proveedor_id: data.id,
      });
    }
    return data?.id;
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast({ title: "El nombre del proveedor es requerido", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // On create: check if NIT already has an empresa in the platform (normalized comparison)
      if (!editing && form.nit?.trim()) {
        const { data: matches } = await (supabase as any)
          .rpc("find_empresa_by_nit", { p_nit: form.nit.trim() });
        const existingEmpresa = matches?.[0] ?? null;
        if (existingEmpresa && existingEmpresa.id !== empresa!.id) {
          setMatchEmpresa(existingEmpresa);
          setPendingSaveForm(form);
          setSaving(false);
          return;
        }
      }

      const payload = buildPayload(form);
      if (editing) {
        const { error } = await (supabase as any).from("proveedores").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        await doInsert(payload);
      }

      toast({ title: editing ? "Proveedor actualizado" : "Proveedor agregado" });
      setDialogOpen(false);
      fetchProveedores();
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleMatchSave = async (conEnlace: boolean) => {
    if (!pendingSaveForm || !empresa) return;
    setMatchSaving(true);
    try {
      const payload = buildPayload(pendingSaveForm);
      await doInsert(payload, conEnlace ? matchEmpresa!.id : undefined);
      toast({
        title: conEnlace
          ? "Proveedor agregado. Solicitud de enlace enviada."
          : "Proveedor agregado sin enlace.",
      });
      setMatchEmpresa(null);
      setPendingSaveForm(null);
      setDialogOpen(false);
      fetchProveedores();
    } catch (e: any) {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    } finally {
      setMatchSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from("proveedores").delete().eq("id", deleteId);
    if (error) toast({ title: "Error al eliminar", description: error.message, variant: "destructive" });
    else { toast({ title: "Proveedor eliminado" }); fetchProveedores(); }
    setDeleteId(null);
  };

  // ── Invite ───────────────────────────────────────────────────────────────────
  const generateProvInvite = async (prov: Proveedor) => {
    if (!prov.email && !prov.nit) {
      toast({ title: "El proveedor necesita email o NIT para invitar", variant: "destructive" });
      return;
    }
    setGeneratingInvite(true);
    try {
      // Generate a random token
      const token = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map(b => b.toString(16).padStart(2, "0")).join("");
      const { error } = await (supabase as any)
        .from("proveedores")
        .update({ invite_token: token })
        .eq("id", prov.id);
      if (error) throw error;
      setInviteLink(`${window.location.origin}/register?prov=${token}`);
      setInviteProveedor(prov);
    } catch {
      toast({ title: "Error al generar invitación", variant: "destructive" });
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  // ── Buscar enlace manual (para proveedores ya existentes) ─────────────────────
  const handleBuscarEnlace = async (prov: Proveedor) => {
    if (!prov.nit?.trim() || !empresa) return;
    try {
      const { data: matches } = await (supabase as any)
        .rpc("find_empresa_by_nit", { p_nit: prov.nit.trim() });
      const found = matches?.[0] ?? null;

      if (!found || found.id === empresa.id) {
        toast({ title: "No se encontró empresa con ese NIT en SSTLink" });
        return;
      }

      // Verificar si ya existe solicitud pendiente
      const { data: existing } = await (supabase as any)
        .from("solicitudes_enlace")
        .select("id, estado")
        .eq("empresa_solicitante_id", empresa.id)
        .eq("empresa_proveedor_id", found.id)
        .maybeSingle();

      if (existing) {
        toast({ title: `Ya existe una solicitud ${existing.estado} para este proveedor` });
        return;
      }

      await (supabase as any).from("solicitudes_enlace").insert({
        empresa_solicitante_id: empresa.id,
        empresa_proveedor_id: found.id,
        proveedor_id: prov.id,
      });

      toast({ title: "Solicitud de enlace enviada", description: `A ${found.nombre}` });
    } catch (e: any) {
      toast({ title: "Error al buscar enlace", description: e.message, variant: "destructive" });
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const activos = proveedores.filter(p => p.estado === "activo").length;
  const proximosVencer = proveedores.filter(p => {
    const d = diasParaVencer(p.fecha_fin_contrato);
    return d !== null && d >= 0 && d <= 30;
  }).length;

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = proveedores.filter(p => {
    const matchSearch = !search || p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.nit ?? "").includes(search) || (p.tipo_servicio ?? "").toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === "todos" || p.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppLayout breadcrumbs={["SSTLink", "Proveedores"]}>
      <div className="space-y-4 max-w-6xl">

        {/* Header */}
        <div className="page-header flex items-center justify-between !pb-3 !mb-3">
          <div>
            <h1 className="page-title">Proveedores</h1>
            {loading ? <Skeleton className="h-4 w-24 mt-1" /> :
              <p className="page-subtitle">{activos} activos · {proveedores.length} total</p>}
          </div>
          {puedeEditar && (
            <Button onClick={openNew} disabled={provLimitReached} className="gap-1.5 text-xs h-9">
              <Plus className="w-3.5 h-3.5" /> Agregar proveedor
            </Button>
          )}
        </div>

        <PlanLimitBanner plan={plan} resource="proveedores" count={activeProvCount} limit={provLimit} />

        {/* Stats */}
        {!loading && proveedores.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: proveedores.length, icon: Truck,         color: "bg-indigo-100 text-indigo-600" },
              { label: "Activos",   value: activos,         icon: ShieldCheck,   color: "bg-emerald-100 text-emerald-600" },
              { label: "Contratos próx. a vencer", value: proximosVencer, icon: CalendarClock, color: proximosVencer > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500" },
            ].map(s => (
              <div key={s.label} className="rounded-xl border bg-card p-3 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-hint" />
            <Input placeholder="Buscar por nombre, NIT o tipo de servicio…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-background" />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full sm:w-40 h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activo</SelectItem>
              <SelectItem value="en_evaluacion">En evaluación</SelectItem>
              <SelectItem value="suspendido">Suspendido</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 && proveedores.length === 0 ? (
          <div className="bg-card rounded-xl border p-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Truck className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">Sin proveedores registrados</p>
            <p className="text-xs text-muted-foreground mb-4">Registra los proveedores y contratistas que trabajan con tu empresa.</p>
            {puedeEditar && (
              <Button onClick={openNew} disabled={provLimitReached} className="gap-1.5 text-xs h-9">
                <Plus className="w-3.5 h-3.5" /> Agregar primer proveedor
              </Button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border p-8 text-center">
            <p className="text-sm text-muted-foreground">No se encontraron proveedores con esos filtros.</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F1F5F9] border-b border-[#E2E8F0]">
                  {["Proveedor", "Tipo de servicio", "ARL", "Contrato", "Estado", ""].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-semibold text-[#334155] uppercase tracking-wide text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const dias = diasParaVencer(p.fecha_fin_contrato);
                  const venceProximo = dias !== null && dias >= 0 && dias <= 30;
                  const vencido = dias !== null && dias < 0;
                  return (
                    <tr key={p.id} className={cn(
                      "border-b last:border-b-0 hover:bg-background transition-colors",
                      i % 2 === 0 ? "bg-card" : "bg-background/50"
                    )}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{p.nombre}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.nit ? `NIT ${p.nit}` : "Sin NIT"}
                              {p.representante && ` · ${p.representante}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{p.tipo_servicio || "—"}</td>
                      <td className="px-4 py-3">
                        {p.arl ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                            <ShieldCheck className="w-3 h-3" /> {p.arl}
                          </span>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.fecha_fin_contrato ? (
                          <div>
                            <p className={cn("font-medium", vencido ? "text-red-600" : venceProximo ? "text-amber-600" : "text-foreground")}>
                              {fmt(p.fecha_fin_contrato)}
                            </p>
                            {vencido && <p className="text-[10px] text-red-500">Vencido</p>}
                            {venceProximo && <p className="text-[10px] text-amber-500">Vence en {dias} días</p>}
                          </div>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", ESTADO_STYLES[p.estado] ?? ESTADO_STYLES.inactivo)}>
                          {ESTADO_LABEL[p.estado] ?? p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {puedeEditar && (
                          <div className="flex items-center justify-end gap-1">
                            {!!p.nit?.trim() && !p.empresa_proveedor_id && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleBuscarEnlace(p)}
                                      className="p-1.5 rounded-md hover:bg-amber-50 transition-colors text-muted-foreground hover:text-amber-600"
                                      aria-label="Verificar si está en SSTLink"
                                    >
                                      <Plug className="w-3.5 h-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Verificar si está en SSTLink</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {p.empresa_proveedor_id && (
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="p-1.5 text-emerald-500 inline-flex" aria-label="Vinculado en SSTLink">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Vinculado en SSTLink</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <button
                              onClick={() => { setInviteLink(""); setCopiedInvite(false); generateProvInvite(p); }}
                              className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-primary"
                              title="Invitar a plataforma"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => openEdit(p)} className="p-1.5 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteId(p.id)} className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">

            {/* Datos básicos */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Datos básicos</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs mb-1 block">Nombre de la empresa <span className="text-destructive">*</span></Label>
                  <Input value={form.nombre} onChange={setEv("nombre")} placeholder="Razón social del proveedor" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">NIT</Label>
                  <Input value={form.nit ?? ""} onChange={setEv("nit")} placeholder="900.123.456-7" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Tipo de servicio</Label>
                  <Input value={form.tipo_servicio ?? ""} onChange={setEv("tipo_servicio")} placeholder="ej: Mantenimiento, Seguridad, Limpieza…" className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* Contacto */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contacto</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Representante legal</Label>
                  <Input value={form.representante ?? ""} onChange={setEv("representante")} placeholder="Nombre completo" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Teléfono</Label>
                  <Input value={form.telefono ?? ""} onChange={setEv("telefono")} placeholder="3001234567" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Email</Label>
                  <Input value={form.email ?? ""} onChange={setEv("email")} type="email" placeholder="contacto@empresa.com" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Ciudad</Label>
                  <Input value={form.ciudad ?? ""} onChange={setEv("ciudad")} placeholder="Bogotá" className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* SST y contrato */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Contrato y SST</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">ARL del proveedor</Label>
                  <Input value={form.arl ?? ""} onChange={setEv("arl")} placeholder="Sura, Colmena, Positiva…" className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Estado</Label>
                  <Select value={form.estado} onValueChange={set("estado")}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="en_evaluacion">En evaluación</SelectItem>
                      <SelectItem value="suspendido">Suspendido</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Inicio de contrato</Label>
                  <Input type="date" value={form.fecha_inicio_contrato ?? ""} onChange={setEv("fecha_inicio_contrato")} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Fin de contrato</Label>
                  <Input type="date" value={form.fecha_fin_contrato ?? ""} onChange={setEv("fecha_fin_contrato")} className="h-8 text-xs" />
                </div>
              </div>
            </div>

            {/* Notas */}
            <div>
              <Label className="text-xs mb-1 block">Notas</Label>
              <Textarea value={form.notas ?? ""} onChange={setEv("notas")}
                placeholder="Observaciones, condiciones especiales, historial…"
                className="text-xs min-h-[70px] resize-none" />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agregar proveedor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Match dialog (NIT ya registrado) ── */}
      <Dialog open={!!matchEmpresa} onOpenChange={open => { if (!open) { setMatchEmpresa(null); setPendingSaveForm(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Empresa ya registrada en SSTLink</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[13px] font-medium text-amber-800">{matchEmpresa?.nombre}</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Este NIT ya tiene una empresa registrada en la plataforma. Puedes solicitar un enlace o agregarlo como proveedor sin vincular.
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => handleMatchSave(true)}
                disabled={matchSaving}
              >
                {matchSaving ? "Guardando…" : "Solicitar enlace a esta empresa"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                El proveedor recibirá una solicitud y deberá aprobarla para quedar vinculado.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleMatchSave(false)}
                disabled={matchSaving}
              >
                Agregar sin enlazar
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setMatchEmpresa(null); setPendingSaveForm(null); }}
                disabled={matchSaving}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Invite dialog ── */}
      <Dialog open={!!inviteLink} onOpenChange={open => { if (!open) { setInviteLink(""); setInviteProveedor(null); setCopiedInvite(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar a {inviteProveedor?.nombre ?? "proveedor"} a SSTLink</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Comparte este enlace con el proveedor para que cree su cuenta en SSTLink. Al registrarse, quedará vinculado automáticamente como proveedor tuyo.
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-[10px] text-muted-foreground mb-1">Enlace de invitación</p>
              <p className="text-[11px] font-mono break-all">{inviteLink}</p>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="outline" onClick={copyInviteLink}>
                {copiedInvite
                  ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /> Copiado</>
                  : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar enlace</>
                }
              </Button>
              {inviteProveedor?.email && (
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href={`mailto:${inviteProveedor.email}?subject=Invitación a SSTLink&body=${encodeURIComponent(`Hola ${inviteProveedor.nombre},\n\nTe invitamos a unirte a SSTLink para gestionar tu documentación SST.\n\nEnlace de registro: ${inviteLink}\n\nSaludos.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Enviar correo
                  </a>
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => { setInviteLink(""); setInviteProveedor(null); setCopiedInvite(false); }}>Listo</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm ── */}
      <AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
