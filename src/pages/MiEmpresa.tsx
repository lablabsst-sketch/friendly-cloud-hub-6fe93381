import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Pencil, Save, X, Upload, Users, ShieldCheck,
  Phone, Mail, MapPin, Hash, Briefcase, AlertTriangle, UserCheck,
  FileText, Plus, Trash2, ExternalLink, Clock, CheckCircle2,
  UserPlus, Copy, Check, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAdmin } from "@/lib/roles";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmpresaFull {
  id: string;
  nombre: string;
  nit: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  telefono: string | null;
  email: string | null;
  sector_industria: string | null;
  actividad_economica: string | null;
  clase_riesgo: string | null;
  arl: string | null;
  representante_legal: string | null;
  responsable_sgsst: string | null;
  num_empleados_directos: number | null;
  num_empleados_indirectos: number | null;
  tiene_contratistas: boolean | null;
  logo_url: string | null;
}

interface UsuarioTeam {
  id: string;
  nombre_completo: string | null;
  email: string;
  rol: string | null;
  cargo: string | null;
}

interface Invitacion {
  id: string;
  email: string;
  rol: string;
  token: string;
  estado: string;
  created_at: string;
}

interface SolicitudEnlace {
  id: string;
  empresa_solicitante_id: string;
  empresa_solicitante: { nombre: string } | null;
  proveedor_id: string | null;
  created_at: string;
}

interface DocEmpresa {
  id: string;
  nombre: string;
  tipo: string | null;
  estado: string;
  url: string | null;
  fecha_vencimiento: string | null;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CLASES_RIESGO = ["I", "II", "III", "IV", "V"];

const ARLS = [
  "Positiva ARL",
  "Sura ARL",
  "Colmena Seguros",
  "Axa Colpatria ARL",
  "Bolívar ARL",
  "La Equidad ARL",
  "Mapfre ARL",
  "Liberty ARL",
  "Otra",
];

const TIPOS_DOC = ["Certificación","Licencia","Contrato","Seguro","Planilla","RUT","Cámara de Comercio","Resolución","Otro"];

const todayStr = new Date().toISOString().slice(0, 10);
const in30Str  = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

function vencStatus(fecha: string | null): "vencido" | "proximo" | "vigente" | "sin" {
  if (!fecha) return "sin";
  if (fecha < todayStr) return "vencido";
  if (fecha <= in30Str)  return "proximo";
  return "vigente";
}

const DEPARTAMENTOS = [
  "Amazonas","Antioquia","Arauca","Atlántico","Bolívar","Boyacá","Caldas",
  "Caquetá","Casanare","Cauca","Cesar","Chocó","Córdoba","Cundinamarca",
  "Guainía","Guaviare","Huila","La Guajira","Magdalena","Meta","Nariño",
  "Norte de Santander","Putumayo","Quindío","Risaralda","San Andrés y Providencia",
  "Santander","Sucre","Tolima","Valle del Cauca","Vaupés","Vichada",
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function MiEmpresa() {
  const { empresa: authEmpresa, usuario } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [empresa, setEmpresa] = useState<EmpresaFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<EmpresaFull>>({});
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Stats
  const [stats, setStats] = useState({ trabajadores: 0, contratistas: 0, cumplimiento: 0 });

  // Documents
  const [docs, setDocs] = useState<DocEmpresa[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [docForm, setDocForm] = useState({ nombre: "", tipo: "", tieneVenc: false, fechaVenc: "" });
  const docFileRef = useRef<HTMLInputElement>(null);
  const [docFile, setDocFile] = useState<File | null>(null);

  // Equipo
  const [equipo, setEquipo] = useState<UsuarioTeam[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [loadingEquipo, setLoadingEquipo] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", rol: "lector" });
  const [savingInvite, setSavingInvite] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  // Solicitudes de enlace
  const [solicitudes, setSolicitudes] = useState<SolicitudEnlace[]>([]);

  // ── Fetch docs ───────────────────────────────────────────────────────────

  const fetchDocs = useCallback(async () => {
    if (!authEmpresa?.id) return;
    const { data } = await supabase
      .from("documentos_empresa")
      .select("*")
      .eq("empresa_id", authEmpresa.id)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
  }, [authEmpresa?.id]);

  // ── Fetch empresa ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authEmpresa?.id) return;
    setLoading(true);
    Promise.all([
      (supabase as any).from("empresas").select("*").eq("id", authEmpresa.id).single(),
      supabase.from("trabajadores").select("id", { count: "exact" }).eq("empresa_id", authEmpresa.id).eq("eliminado", false),
      supabase.from("contratistas").select("id", { count: "exact" }).eq("empresa_id", authEmpresa.id).eq("estado", "activo"),
    ]).then(([{ data: emp }, { count: tw }, { count: ct }]) => {
      setEmpresa(emp);
      setStats({
        trabajadores: tw ?? 0,
        contratistas: ct ?? 0,
        cumplimiento: 0,
      });
      setLoading(false);
    });
  }, [authEmpresa?.id]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  // ── Edit ─────────────────────────────────────────────────────────────────

  const startEdit = () => {
    if (!empresa) return;
    setForm({ ...empresa });
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setForm({}); };

  const save = async () => {
    if (!empresa) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("empresas")
      .update({
        nombre: form.nombre,
        nit: form.nit || null,
        direccion: form.direccion || null,
        ciudad: form.ciudad || null,
        departamento: form.departamento || null,
        telefono: form.telefono || null,
        email: form.email || null,
        sector_industria: form.sector_industria || null,
        actividad_economica: form.actividad_economica || null,
        clase_riesgo: form.clase_riesgo || null,
        arl: form.arl || null,
        representante_legal: form.representante_legal || null,
        responsable_sgsst: form.responsable_sgsst || null,
        num_empleados_directos: form.num_empleados_directos ?? null,
        num_empleados_indirectos: form.num_empleados_indirectos ?? null,
        tiene_contratistas: form.tiene_contratistas ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", empresa.id);
    if (error) {
      toast({ title: "Error al guardar", variant: "destructive" });
    } else {
      setEmpresa(prev => prev ? { ...prev, ...form } as EmpresaFull : prev);
      setEditing(false);
      toast({ title: "Información actualizada" });
    }
    setSaving(false);
  };

  // ── Save doc ─────────────────────────────────────────────────────────────

  const saveDoc = async () => {
    if (!authEmpresa?.id || !docForm.nombre.trim()) return;
    setSavingDoc(true);
    try {
      let url: string | null = null;
      if (docFile) {
        const ext = docFile.name.split(".").pop();
        const path = `${authEmpresa.id}/empresa/${Date.now()}.${ext}`;
        await supabase.storage.from("documentos").upload(path, docFile, { upsert: true });
        const { data: { publicUrl } } = supabase.storage.from("documentos").getPublicUrl(path);
        url = publicUrl;
      }
      await supabase.from("documentos_empresa").insert({
        empresa_id: authEmpresa.id,
        nombre: docForm.nombre,
        tipo: docForm.tipo || null,
        estado: "activo",
        url,
        fecha_vencimiento: docForm.tieneVenc && docForm.fechaVenc ? docForm.fechaVenc : null,
      });
      setUploadOpen(false);
      setDocForm({ nombre: "", tipo: "", tieneVenc: false, fechaVenc: "" });
      setDocFile(null);
      fetchDocs();
      toast({ title: "Documento guardado" });
    } catch {
      toast({ title: "Error al guardar", variant: "destructive" });
    } finally {
      setSavingDoc(false);
    }
  };

  const deleteDoc = async () => {
    if (!deleteDocId) return;
    const doc = docs.find(d => d.id === deleteDocId);
    if (doc?.url) {
      const parts = doc.url.split("/documentos/");
      if (parts[1]) await supabase.storage.from("documentos").remove([parts[1]]);
    }
    await supabase.from("documentos_empresa").delete().eq("id", deleteDocId);
    setDeleteDocId(null);
    fetchDocs();
    toast({ title: "Documento eliminado" });
  };

  // ── Equipo ────────────────────────────────────────────────────────────────

  const fetchEquipo = useCallback(async () => {
    if (!authEmpresa?.id) return;
    setLoadingEquipo(true);
    const [{ data: users }, { data: invs }] = await Promise.all([
      supabase.from("usuarios").select("id, nombre_completo, email, rol, cargo").eq("empresa_id", authEmpresa.id).order("nombre_completo"),
      (supabase as any).from("invitaciones").select("id, email, rol, token, estado, created_at").eq("empresa_id", authEmpresa.id).eq("estado", "pendiente").order("created_at", { ascending: false }),
    ]);
    setEquipo(users ?? []);
    setInvitaciones(invs ?? []);
    setLoadingEquipo(false);
  }, [authEmpresa?.id]);

  useEffect(() => { if (canAdmin(usuario?.rol)) fetchEquipo(); }, [fetchEquipo, usuario?.rol]);

  const handleChangeRol = async (userId: string, newRol: string) => {
    await supabase.from("usuarios").update({ rol: newRol }).eq("id", userId);
    await supabase.from("user_roles").update({ role: newRol as "super_admin" | "administrador" | "asistente" | "lector" }).eq("user_id", userId);
    setEquipo(prev => prev.map(u => u.id === userId ? { ...u, rol: newRol } : u));
    toast({ title: "Rol actualizado" });
  };

  const handleRemoveUser = async () => {
    if (!removingUserId) return;
    await supabase.from("usuarios").update({ empresa_id: null }).eq("id", removingUserId);
    setEquipo(prev => prev.filter(u => u.id !== removingUserId));
    setRemovingUserId(null);
    toast({ title: "Usuario eliminado del equipo" });
  };

  const handleRevokeInvite = async (invId: string) => {
    await (supabase as any).from("invitaciones").update({ estado: "revocada" }).eq("id", invId);
    setInvitaciones(prev => prev.filter(i => i.id !== invId));
    toast({ title: "Invitación revocada" });
  };

  const handleInvite = async () => {
    if (!authEmpresa?.id || !inviteForm.email.trim()) return;
    setSavingInvite(true);
    try {
      const { data, error } = await (supabase as any)
        .from("invitaciones")
        .insert({ empresa_id: authEmpresa.id, email: inviteForm.email.trim().toLowerCase(), rol: inviteForm.rol })
        .select("token")
        .single();
      if (error) throw error;
      setGeneratedLink(`${window.location.origin}/register?inv=${data.token}`);
      fetchEquipo();
    } catch {
      toast({ title: "Error al crear invitación", variant: "destructive" });
    } finally {
      setSavingInvite(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Solicitudes de enlace ─────────────────────────────────────────────────

  const fetchSolicitudes = useCallback(async () => {
    if (!authEmpresa?.id) return;
    const { data } = await (supabase as any)
      .from("solicitudes_enlace")
      .select("id, empresa_solicitante_id, empresa_solicitante:empresa_solicitante_id(nombre), proveedor_id, created_at")
      .eq("empresa_proveedor_id", authEmpresa.id)
      .eq("estado", "pendiente")
      .order("created_at", { ascending: false });
    setSolicitudes(data ?? []);
  }, [authEmpresa?.id]);

  useEffect(() => { if (canAdmin(usuario?.rol)) fetchSolicitudes(); }, [fetchSolicitudes, usuario?.rol]);

  const handleAprobarSolicitud = async (sol: SolicitudEnlace) => {
    await (supabase as any).from("solicitudes_enlace").update({ estado: "aprobada" }).eq("id", sol.id);
    if (sol.proveedor_id) {
      await (supabase as any).from("proveedores").update({ empresa_proveedor_id: authEmpresa!.id }).eq("id", sol.proveedor_id);
    }
    setSolicitudes(prev => prev.filter(s => s.id !== sol.id));
    toast({ title: "Solicitud aprobada. Proveedor vinculado." });
  };

  const handleRechazarSolicitud = async (solId: string) => {
    await (supabase as any).from("solicitudes_enlace").update({ estado: "rechazada" }).eq("id", solId);
    setSolicitudes(prev => prev.filter(s => s.id !== solId));
    toast({ title: "Solicitud rechazada" });
  };

  // ── Logo upload ───────────────────────────────────────────────────────────

  const uploadLogo = async (file: File) => {
    if (!empresa) return;
    setUploadingLogo(true);
    const ext = file.name.split(".").pop();
    const path = `logos/${empresa.id}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("empresa-assets")
      .upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Error al subir logo", variant: "destructive" });
      setUploadingLogo(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("empresa-assets").getPublicUrl(path);
    const logo_url = urlData.publicUrl;
    await (supabase as any).from("empresas").update({ logo_url }).eq("id", empresa.id);
    setEmpresa(prev => prev ? { ...prev, logo_url } : prev);
    toast({ title: "Logo actualizado" });
    setUploadingLogo(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <AppLayout breadcrumbs={["Mi Empresa"]}>
      <div className="max-w-4xl space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </AppLayout>
  );

  if (!empresa) return (
    <AppLayout breadcrumbs={["Mi Empresa"]}>
      <div className="flex items-center justify-center py-24 text-muted-foreground">Sin datos de empresa.</div>
    </AppLayout>
  );

  const f = (field: keyof EmpresaFull) => editing ? (form[field] as string ?? "") : (empresa[field] as string ?? "");

  return (
    <AppLayout breadcrumbs={["Mi Empresa"]}>
      <div className="max-w-4xl space-y-4">

        {/* ── Header card ── */}
        <div className="bg-surface rounded-xl border-[0.5px] border-border p-5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="relative group shrink-0">
              <div
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {empresa.logo_url ? (
                  <img src={empresa.logo_url} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
                    <Building2 className="w-7 h-7" />
                    <span className="text-[9px]">Logo</span>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center rounded-xl">
                    <span className="text-[10px] text-muted-foreground">Subiendo…</span>
                  </div>
                )}
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer shadow"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-2.5 h-2.5" />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
              />
            </div>

            {/* Name + actions */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <Input
                  value={form.nombre ?? ""}
                  onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  className="text-lg font-semibold mb-1 h-9"
                />
              ) : (
                <h1 className="text-xl font-semibold truncate">{empresa.nombre}</h1>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {empresa.nit && <span className="text-sm text-muted-foreground">NIT: {empresa.nit}</span>}
                {empresa.clase_riesgo && (
                  <Badge variant="outline" className="text-[11px]">Clase Riesgo {empresa.clase_riesgo}</Badge>
                )}
                {empresa.arl && (
                  <Badge variant="outline" className="text-[11px] bg-blue-50 text-blue-700 border-blue-200">{empresa.arl}</Badge>
                )}
              </div>
            </div>

            {/* Edit / Save / Cancel */}
            <div className="flex gap-2 shrink-0">
              {editing ? (
                <>
                  <Button variant="outline" size="sm" onClick={cancelEdit}>
                    <X className="w-3.5 h-3.5 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={save} disabled={saving}>
                    <Save className="w-3.5 h-3.5 mr-1" /> {saving ? "Guardando…" : "Guardar"}
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={startEdit}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t">
            {[
              { label: "Trabajadores directos", value: stats.trabajadores, icon: Users, color: "text-blue-600 bg-blue-50" },
              { label: "Contratistas activos", value: stats.contratistas, icon: UserCheck, color: "text-amber-600 bg-amber-50" },
              { label: "Empleados directos registrados", value: empresa.num_empleados_directos ?? "—", icon: Briefcase, color: "text-indigo-600 bg-indigo-50" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                  <p className="text-lg font-bold leading-tight">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Info grid ── */}
        <div className="grid md:grid-cols-2 gap-4">

          {/* Información general */}
          <Card className="border-[0.5px] border-border shadow-none bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" /> Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="NIT" icon={Hash} editing={editing}>
                {editing
                  ? <Input value={form.nit ?? ""} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))} placeholder="900000000-1" />
                  : <span>{empresa.nit || "—"}</span>
                }
              </Field>
              <Field label="Sector industria" icon={Briefcase} editing={editing}>
                {editing
                  ? <Input value={form.sector_industria ?? ""} onChange={e => setForm(p => ({ ...p, sector_industria: e.target.value }))} placeholder="Sector" />
                  : <span>{empresa.sector_industria || "—"}</span>
                }
              </Field>
              <Field label="Actividad económica (CIIU)" icon={Briefcase} editing={editing}>
                {editing
                  ? <Input value={form.actividad_economica ?? ""} onChange={e => setForm(p => ({ ...p, actividad_economica: e.target.value }))} placeholder="Ej. 4690" />
                  : <span>{empresa.actividad_economica || "—"}</span>
                }
              </Field>
              <Field label="Teléfono" icon={Phone} editing={editing}>
                {editing
                  ? <Input value={form.telefono ?? ""} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+57 300 000 0000" />
                  : <span>{empresa.telefono || "—"}</span>
                }
              </Field>
              <Field label="Correo electrónico" icon={Mail} editing={editing}>
                {editing
                  ? <Input type="email" value={form.email ?? ""} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="empresa@correo.com" />
                  : <span>{empresa.email || "—"}</span>
                }
              </Field>
            </CardContent>
          </Card>

          {/* Ubicación */}
          <Card className="border-[0.5px] border-border shadow-none bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" /> Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Dirección" icon={MapPin} editing={editing}>
                {editing
                  ? <Input value={form.direccion ?? ""} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle / Carrera / Avenida…" />
                  : <span>{empresa.direccion || "—"}</span>
                }
              </Field>
              <Field label="Ciudad" icon={MapPin} editing={editing}>
                {editing
                  ? <Input value={form.ciudad ?? ""} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} placeholder="Ciudad" />
                  : <span>{empresa.ciudad || "—"}</span>
                }
              </Field>
              <Field label="Departamento" icon={MapPin} editing={editing}>
                {editing ? (
                  <Select value={form.departamento ?? ""} onValueChange={v => setForm(p => ({ ...p, departamento: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span>{empresa.departamento || "—"}</span>}
              </Field>
            </CardContent>
          </Card>

          {/* SG-SST */}
          <Card className="border-[0.5px] border-border shadow-none bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Perfil SG-SST
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Clase de riesgo" icon={AlertTriangle} editing={editing}>
                {editing ? (
                  <Select value={form.clase_riesgo ?? ""} onValueChange={v => setForm(p => ({ ...p, clase_riesgo: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Clase…" /></SelectTrigger>
                    <SelectContent>
                      {CLASES_RIESGO.map(c => <SelectItem key={c} value={c}>Clase {c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span>{empresa.clase_riesgo ? `Clase ${empresa.clase_riesgo}` : "—"}</span>}
              </Field>
              <Field label="ARL" icon={ShieldCheck} editing={editing}>
                {editing ? (
                  <Select value={form.arl ?? ""} onValueChange={v => setForm(p => ({ ...p, arl: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="ARL…" /></SelectTrigger>
                    <SelectContent>
                      {ARLS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : <span>{empresa.arl || "—"}</span>}
              </Field>
              <Field label="Representante legal" icon={UserCheck} editing={editing}>
                {editing
                  ? <Input value={form.representante_legal ?? ""} onChange={e => setForm(p => ({ ...p, representante_legal: e.target.value }))} placeholder="Nombre completo" />
                  : <span>{empresa.representante_legal || "—"}</span>
                }
              </Field>
              <Field label="Responsable SG-SST" icon={UserCheck} editing={editing}>
                {editing
                  ? <Input value={form.responsable_sgsst ?? ""} onChange={e => setForm(p => ({ ...p, responsable_sgsst: e.target.value }))} placeholder="Nombre completo" />
                  : <span>{empresa.responsable_sgsst || "—"}</span>
                }
              </Field>
            </CardContent>
          </Card>

          {/* Planta */}
          <Card className="border-[0.5px] border-border shadow-none bg-surface">
            <CardHeader className="pb-3">
              <CardTitle className="text-[13px] font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Planta de Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Empleados directos" icon={Users} editing={editing}>
                {editing
                  ? <Input type="number" value={form.num_empleados_directos ?? ""} onChange={e => setForm(p => ({ ...p, num_empleados_directos: e.target.value ? Number(e.target.value) : null }))} placeholder="0" />
                  : <span>{empresa.num_empleados_directos ?? "—"}</span>
                }
              </Field>
              <Field label="Empleados indirectos" icon={Users} editing={editing}>
                {editing
                  ? <Input type="number" value={form.num_empleados_indirectos ?? ""} onChange={e => setForm(p => ({ ...p, num_empleados_indirectos: e.target.value ? Number(e.target.value) : null }))} placeholder="0" />
                  : <span>{empresa.num_empleados_indirectos ?? "—"}</span>
                }
              </Field>
              <Field label="¿Tiene contratistas?" icon={UserCheck} editing={editing}>
                {editing ? (
                  <Select value={form.tiene_contratistas ? "si" : "no"} onValueChange={v => setForm(p => ({ ...p, tiene_contratistas: v === "si" }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                ) : <span>{empresa.tiene_contratistas ? "Sí" : "No"}</span>}
              </Field>
            </CardContent>
          </Card>
        </div>

        {/* ── Documentos ── */}
        <div className="bg-surface rounded-xl border-[0.5px] border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" /> Documentos de la Empresa
            </h3>
            <Button size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Subir
            </Button>
          </div>

          {docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <FileText className="w-8 h-8 opacity-20" />
              <p className="text-sm">Sin documentos. Sube el primero.</p>
            </div>
          ) : (
            <div className="divide-y">
              {docs.map(d => {
                const st = vencStatus(d.fecha_vencimiento);
                return (
                  <div key={d.id} className="flex items-center gap-3 py-2.5 group">
                    <FileText className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{d.nombre}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        {d.tipo && <Badge variant="outline" className="text-[10px] h-4 px-1">{d.tipo}</Badge>}
                        {st !== "sin" && d.fecha_vencimiento && (
                          <Badge variant="outline" className={cn("text-[10px] h-4 px-1 flex items-center gap-1",
                            st === "vencido" ? "bg-red-50 text-red-600 border-red-200" :
                            st === "proximo" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                            "bg-green-50 text-green-600 border-green-200"
                          )}>
                            {st === "vencido" ? <AlertTriangle className="h-2.5 w-2.5" /> :
                             st === "proximo" ? <Clock className="h-2.5 w-2.5" /> :
                             <CheckCircle2 className="h-2.5 w-2.5" />}
                            {new Date(d.fecha_vencimiento + "T00:00:00").toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {d.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <a href={d.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDocId(d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Equipo ── */}
        {canAdmin(usuario?.rol) && (
          <div className="bg-surface rounded-xl border-[0.5px] border-border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[13px] font-medium flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" /> Equipo de Usuarios
              </h3>
              <Button size="sm" onClick={() => { setInviteForm({ email: "", rol: "lector" }); setGeneratedLink(""); setInviteOpen(true); }}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Invitar
              </Button>
            </div>

            {loadingEquipo ? (
              <div className="space-y-2">
                {[1,2].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
              </div>
            ) : (
              <div className="divide-y">
                {equipo.map(u => {
                  const isMe = u.id === usuario?.id;
                  const initials = (u.nombre_completo ?? u.email).slice(0, 2).toUpperCase();
                  return (
                    <div key={u.id} className="flex items-center gap-3 py-2.5 group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-[11px] font-semibold flex items-center justify-center shrink-0">
                        {initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{u.nombre_completo ?? u.email}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={u.rol ?? "lector"}
                          onValueChange={v => !isMe && handleChangeRol(u.id, v)}
                          disabled={isMe}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="administrador">Administrador</SelectItem>
                            <SelectItem value="asistente">Asistente</SelectItem>
                            <SelectItem value="lector">Lector</SelectItem>
                          </SelectContent>
                        </Select>
                        {!isMe && (
                          <Button
                            variant="ghost" size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setRemovingUserId(u.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pending invitations */}
            {invitaciones.length > 0 && (
              <div className="mt-4 pt-3 border-t">
                <p className="text-[11px] text-muted-foreground mb-2">Invitaciones pendientes</p>
                <div className="space-y-1.5">
                  {invitaciones.map(inv => (
                    <div key={inv.id} className="flex items-center gap-2 group">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                      <span className="text-[12px] flex-1 truncate">{inv.email}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">{inv.rol}</Badge>
                      <Button
                        variant="ghost" size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRevokeInvite(inv.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Solicitudes de enlace ── */}
        {canAdmin(usuario?.rol) && solicitudes.length > 0 && (
          <div className="bg-surface rounded-xl border-[0.5px] border-amber-200 p-4">
            <h3 className="text-[13px] font-medium flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-amber-500" /> Solicitudes de enlace
              <span className="ml-1 bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{solicitudes.length}</span>
            </h3>
            <p className="text-[11px] text-muted-foreground mb-3">
              Estas empresas en SSTLink quieren vincularte como proveedor. Aprueba para quedar conectados.
            </p>
            <div className="divide-y">
              {solicitudes.map(sol => (
                <div key={sol.id} className="flex items-center gap-3 py-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{sol.empresa_solicitante?.nombre ?? "Empresa desconocida"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(sol.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={() => handleAprobarSolicitud(sol)}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Aprobar
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleRechazarSolicitud(sol.id)}>
                      <X className="w-3.5 h-3.5 mr-1" /> Rechazar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Upload doc dialog ── */}
      <Dialog open={uploadOpen} onOpenChange={v => { if (!v) { setUploadOpen(false); setDocFile(null); setDocForm({ nombre: "", tipo: "", tieneVenc: false, fechaVenc: "" }); }}}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Subir documento</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => docFileRef.current?.click()}
            >
              {docFile ? (
                <p className="text-sm font-medium truncate">{docFile.name}</p>
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <Upload className="h-6 w-6" />
                  <p className="text-sm">Haz clic para seleccionar archivo</p>
                </div>
              )}
              <input
                ref={docFileRef} type="file" className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0] ?? null;
                  setDocFile(f);
                  if (f && !docForm.nombre) setDocForm(p => ({ ...p, nombre: f.name.replace(/\.[^.]+$/, "") }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input value={docForm.nombre} onChange={e => setDocForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Nombre del documento" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={docForm.tipo} onValueChange={v => setDocForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona…" /></SelectTrigger>
                <SelectContent>{TIPOS_DOC.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={docForm.tieneVenc} onCheckedChange={v => setDocForm(p => ({ ...p, tieneVenc: v }))} id="venc-sw" />
              <Label htmlFor="venc-sw" className="cursor-pointer">Tiene fecha de vencimiento</Label>
            </div>
            {docForm.tieneVenc && (
              <div className="space-y-1.5">
                <Label>Fecha de vencimiento</Label>
                <Input type="date" value={docForm.fechaVenc} onChange={e => setDocForm(p => ({ ...p, fechaVenc: e.target.value }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
            <Button onClick={saveDoc} disabled={savingDoc || !docForm.nombre.trim()}>
              {savingDoc ? "Subiendo…" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Invite dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={v => { if (!v) { setInviteOpen(false); setGeneratedLink(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Invitar usuario</DialogTitle></DialogHeader>
          {generatedLink ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">Comparte este enlace con la persona invitada. Expira cuando lo use.</p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <p className="text-[11px] text-muted-foreground flex-1 break-all font-mono">{generatedLink}</p>
                <Button variant="outline" size="icon" className="shrink-0 h-8 w-8" onClick={copyLink}>
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setInviteOpen(false); setGeneratedLink(""); }}>Listo</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Correo electrónico *</Label>
                <Input
                  type="email"
                  value={inviteForm.email}
                  onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="colaborador@empresa.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Rol</Label>
                <Select value={inviteForm.rol} onValueChange={v => setInviteForm(p => ({ ...p, rol: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrador">Administrador — acceso total</SelectItem>
                    <SelectItem value="asistente">Asistente — edita, no administra</SelectItem>
                    <SelectItem value="lector">Lector — solo lectura</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-muted-foreground">
                El sistema generará un enlace de invitación. Envíaselo manualmente por correo o WhatsApp.
              </p>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleInvite} disabled={savingInvite || !inviteForm.email.trim()}>
                  {savingInvite ? "Generando…" : "Generar enlace"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Remove user confirm ── */}
      <AlertDialog open={!!removingUserId} onOpenChange={open => !open && setRemovingUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario del equipo?</AlertDialogTitle>
            <AlertDialogDescription>El usuario perderá acceso a la plataforma pero su cuenta se mantiene.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveUser} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete doc confirm ── */}
      <AlertDialog open={!!deleteDocId} onOpenChange={open => !open && setDeleteDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará el archivo. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteDoc} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, icon: Icon, children, editing }: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  editing: boolean;
}) {
  return (
    <div className={editing ? "space-y-1" : "flex items-start gap-2.5 py-0.5"}>
      {editing ? (
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
      ) : (
        <>
          <Icon className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground leading-none mb-0.5">{label}</p>
            <p className="text-[13px]">{children}</p>
          </div>
        </>
      )}
      {editing && children}
    </div>
  );
}
