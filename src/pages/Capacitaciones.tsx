import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { SkeletonRows } from "@/components/SkeletonRows";
import { EmptyState } from "@/components/EmptyState";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap, Plus, Pencil, Trash2, Users, Clock, CheckCircle2, BookOpen,
  ChevronRight, UserCheck, UserX, Monitor, Building2, Link2, MessageCircle,
  Send, FileText, Pen, CalendarDays, Info, Search,
} from "lucide-react";
import {
  enviarWhatsApp, mensajeInfoCapacitacion, mensajeFirmaCapacitacion,
  generarPDFAsistencia,
} from "@/lib/whatsapp";
import { useEmpresaPlan } from "@/hooks/useEmpresaPlan";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Capacitacion {
  id: string;
  empresa_id: string;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  tipo: string | null;
  duracion_horas: number | null;
  responsable: string | null;
  estado: string;
  modalidad: string;
  link_reunion: string | null;
  archivo_url: string | null;
  archivo_nombre: string | null;
  created_at: string;
}

interface Trabajador {
  id: string;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  telefono: string | null;
  numero_documento: string;
}

interface EmpleadoContratista {
  id: string;
  nombres: string;
  apellidos: string;
  cargo: string | null;
  numero_documento: string;
  contratista_id: string;
}

interface AsistenciaRecord {
  id: string;
  capacitacion_id: string;
  trabajador_id: string | null;
  empresa_id: string;
  tipo_asistente: string;
  empleado_contratista_id: string | null;
  asistio: boolean | null;
  nota: number | null;
  telefono_whatsapp: string | null;
  firma_token: string | null;
  firma_url: string | null;
  firmado_en: string | null;
  // Joined
  trabajador?: { nombres: string; apellidos: string; cargo: string | null; numero_documento: string } | null;
  empleado?: { nombres: string; apellidos: string; cargo: string | null; numero_documento: string } | null;
}

interface AttendeeFormEntry {
  tipo: "trabajador" | "contratista";
  id: string; // trabajador_id or empleado_contratista_id
  nombre: string;
  cargo: string | null;
  telefono: string;
  selected: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIPOS = [
  "Inducción", "Seguridad vial", "Trabajo en alturas", "Espacios confinados",
  "Riesgo eléctrico", "Primeros auxilios", "Manejo de sustancias", "Incendios y evacuación",
  "Riesgo biológico", "Ergonomía", "Salud mental", "SG-SST general", "Otro",
];

const ESTADOS: Record<string, string> = {
  programada: "Programada",
  en_progreso: "En progreso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const ESTADO_BADGE: Record<string, string> = {
  programada:  "bg-blue-100 text-blue-800",
  en_progreso: "bg-yellow-100 text-yellow-800",
  completada:  "bg-green-100 text-green-800",
  cancelada:   "bg-gray-100 text-gray-600",
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
  titulo: "",
  descripcion: "",
  fecha: new Date().toISOString().slice(0, 10),
  tipo: "SG-SST general",
  duracion_horas: 1,
  responsable: "",
  estado: "programada",
  modalidad: "presencial",
  link_reunion: "",
  archivo_url: "",
};

// Helper to query tables whose generated types lag behind the real schema
async function runQuery<T>(promise: PromiseLike<{ data: unknown; error: unknown }>): Promise<{ data: T | null; error: unknown }> {
  const { data, error } = await promise;
  return { data: data as T | null, error };
}

interface AsistenciaCapacitacionInsertPayload {
  capacitacion_id: string;
  empresa_id: string;
  tipo_asistente: "trabajador" | "contratista";
  trabajador_id: string | null;
  empleado_contratista_id: string | null;
  telefono_whatsapp: string | null;
  asistio: boolean;
}

interface ExistingAsistencia {
  tipo_asistente: "trabajador" | "contratista";
  trabajador_id: string | null;
  empleado_contratista_id: string | null;
  telefono_whatsapp: string | null;
}

type AsistenciaCapacitacionUpdate = Database["public"]["Tables"]["asistencia_capacitacion"]["Update"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAttendeeName = (a: AsistenciaRecord): string => {
  if (a.tipo_asistente === "trabajador" && a.trabajador) {
    return `${a.trabajador.nombres} ${a.trabajador.apellidos}`;
  }
  if (a.tipo_asistente === "contratista" && a.empleado) {
    return `${a.empleado.nombres} ${a.empleado.apellidos}`;
  }
  return "—";
};

const getAttendeeCargo = (a: AsistenciaRecord): string | null => {
  if (a.tipo_asistente === "trabajador") return a.trabajador?.cargo ?? null;
  return a.empleado?.cargo ?? null;
};

const getAttendeeDoc = (a: AsistenciaRecord): string => {
  if (a.tipo_asistente === "trabajador") return a.trabajador?.numero_documento ?? "—";
  return a.empleado?.numero_documento ?? "—";
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Capacitaciones() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const plan = useEmpresaPlan();

  // Data
  const [caps, setCaps] = useState<Capacitacion[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [contratistas, setContratistas] = useState<EmpleadoContratista[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState("all");
  const [filterEstado, setFilterEstado] = useState("all");

  // Create/edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Capacitacion | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formTab, setFormTab] = useState("info");

  // Attendee selection in form
  const [attendeeEntries, setAttendeeEntries] = useState<AttendeeFormEntry[]>([]);
  const [searchConvocatoria, setSearchConvocatoria] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nombre: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail/attendance dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCap, setSelectedCap] = useState<Capacitacion | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaRecord[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sendingWA, setSendingWA] = useState<"info" | "firma" | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);

    const [{ data: cs }, { data: ts }, { data: ecs }] = await Promise.all([
      runQuery<Capacitacion[]>(
        supabase
          .from("capacitaciones")
          .select("*")
          .eq("empresa_id", empresa.id)
          .order("fecha", { ascending: false })
      ),
      supabase
        .from("trabajadores")
        .select("id, nombres, apellidos, cargo, telefono, numero_documento")
        .eq("empresa_id", empresa.id)
        .neq("estado", "inactivo")
        .or("eliminado.is.null,eliminado.eq.false"),
      supabase
        .from("empleados_contratista")
        .select("id, nombres, apellidos, cargo, numero_documento, contratista_id")
        .eq("empresa_id", empresa.id)
        .neq("estado", "inactivo"),
    ]);

    setCaps(cs ?? []);
    setTrabajadores(ts ?? []);
    setContratistas(ecs ?? []);
    setLoading(false);
  }, [empresa?.id]);

  useEffect(() => { if (empresa?.id) fetchAll(); }, [empresa?.id, fetchAll]);

  // ─── Filters ───────────────────────────────────────────────────────────────

  const filtered = caps.filter((c) => {
    const d = new Date(c.fecha);
    return (
      String(d.getFullYear()) === filterYear &&
      (filterMonth === "all" || String(d.getMonth() + 1) === filterMonth) &&
      (filterEstado === "all" || c.estado === filterEstado)
    );
  });

  // ─── KPIs ──────────────────────────────────────────────────────────────────

  const total = filtered.length;
  const completadas = filtered.filter((c) => c.estado === "completada").length;
  const horasTotales = filtered.reduce((s, c) => s + (c.duracion_horas ?? 0), 0);

  // ─── Build attendee entries for form ───────────────────────────────────────

  const buildAttendeeEntries = useCallback(
    (existingAsistencias: ExistingAsistencia[] = []) => {
      const existingTrabMap = new Map(
        existingAsistencias.filter((a) => a.tipo_asistente === "trabajador").map((a) => [a.trabajador_id!, a])
      );
      const existingContMap = new Map(
        existingAsistencias.filter((a) => a.tipo_asistente === "contratista").map((a) => [a.empleado_contratista_id!, a])
      );

      const entries: AttendeeFormEntry[] = [
        ...trabajadores.map((t) => ({
          tipo: "trabajador" as const,
          id: t.id,
          nombre: `${t.nombres} ${t.apellidos}`,
          cargo: t.cargo,
          telefono: existingTrabMap.get(t.id)?.telefono_whatsapp ?? t.telefono ?? "",
          selected: existingTrabMap.has(t.id),
        })),
        ...contratistas.map((ec) => ({
          tipo: "contratista" as const,
          id: ec.id,
          nombre: `${ec.nombres} ${ec.apellidos}`,
          cargo: ec.cargo,
          telefono: existingContMap.get(ec.id)?.telefono_whatsapp ?? "",
          selected: existingContMap.has(ec.id),
        })),
      ];
      setAttendeeEntries(entries);
    },
    [trabajadores, contratistas]
  );

  // ─── Create / Edit ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormTab("info");
    buildAttendeeEntries([]);
    setSearchConvocatoria("");
    setFormOpen(true);
  };

  const openEdit = async (c: Capacitacion) => {
    setEditing(c);
    setForm({
      titulo: c.titulo,
      descripcion: c.descripcion ?? "",
      fecha: c.fecha,
      tipo: c.tipo ?? "SG-SST general",
      duracion_horas: c.duracion_horas ?? 1,
      responsable: c.responsable ?? "",
      estado: c.estado,
      modalidad: c.modalidad ?? "presencial",
      link_reunion: c.link_reunion ?? "",
      archivo_url: c.archivo_url ?? "",
    });
    setFormTab("info");
    setSearchConvocatoria("");

    // Load existing attendees
    const { data } = await runQuery<ExistingAsistencia[]>(
      supabase
        .from("asistencia_capacitacion")
        .select("tipo_asistente, trabajador_id, empleado_contratista_id, telefono_whatsapp")
        .eq("capacitacion_id", c.id)
    );

    buildAttendeeEntries(data ?? []);
    setFormOpen(true);
  };

  const save = async () => {
    if (!empresa?.id || !form.titulo || !form.fecha) return;

    // Free plan: max 1 capacitación por mes (solo al crear)
    if (!editing && plan === "free") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("capacitaciones")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .gte("created_at", monthStart.toISOString());
      if ((count ?? 0) >= 1) {
        toast({
          title: "Límite del Plan Free alcanzado",
          description: "Has usado tu capacitación gratuita del mes. Actualiza tu plan para crear más.",
          variant: "destructive",
        });
        return;
      }
    }

    setSaving(true);

    const payload = {
      empresa_id: empresa.id,
      titulo: form.titulo,
      descripcion: form.descripcion || null,
      fecha: form.fecha,
      tipo: form.tipo || null,
      duracion_horas: form.duracion_horas,
      responsable: form.responsable || null,
      estado: form.estado,
      modalidad: form.modalidad,
      link_reunion: form.link_reunion || null,
      archivo_url: form.archivo_url || null,
      archivo_nombre: form.archivo_url ? (form.archivo_url.split("/").pop() ?? null) : null,
    };

    let capId = editing?.id ?? null;

    if (editing) {
      const { error } = await supabase.from("capacitaciones").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from("capacitaciones").insert(payload).select("id").single();
      if (error || !data) { toast({ title: "Error", description: error?.message, variant: "destructive" }); setSaving(false); return; }
      capId = data.id;
    }

    // Save attendees — only insert new ones (don't delete existing to preserve firma data)
    if (capId) {
      // Load existing to avoid duplicate inserts
      const { data: existing } = await runQuery<ExistingAsistencia[]>(
        supabase
          .from("asistencia_capacitacion")
          .select("trabajador_id, empleado_contratista_id")
          .eq("capacitacion_id", capId)
      );

      const existingTrabIds = new Set((existing ?? []).filter((e) => e.trabajador_id).map((e) => e.trabajador_id!));
      const existingContIds = new Set((existing ?? []).filter((e) => e.empleado_contratista_id).map((e) => e.empleado_contratista_id!));

      const newInserts: AsistenciaCapacitacionInsertPayload[] = [];
      for (const entry of attendeeEntries) {
        if (!entry.selected) continue;
        if (entry.tipo === "trabajador" && !existingTrabIds.has(entry.id)) {
          newInserts.push({
            capacitacion_id: capId,
            empresa_id: empresa.id,
            tipo_asistente: "trabajador",
            trabajador_id: entry.id,
            empleado_contratista_id: null,
            telefono_whatsapp: entry.telefono || null,
            asistio: false,
          });
        } else if (entry.tipo === "contratista" && !existingContIds.has(entry.id)) {
          newInserts.push({
            capacitacion_id: capId,
            empresa_id: empresa.id,
            tipo_asistente: "contratista",
            trabajador_id: null,
            empleado_contratista_id: entry.id,
            telefono_whatsapp: entry.telefono || null,
            asistio: false,
          });
        }
        // Update phone for existing ones if changed
        if (entry.tipo === "trabajador" && existingTrabIds.has(entry.id)) {
          await supabase.from("asistencia_capacitacion")
            .update({ telefono_whatsapp: entry.telefono || null } as unknown as AsistenciaCapacitacionUpdate)
            .eq("capacitacion_id", capId).eq("trabajador_id", entry.id);
        }
        if (entry.tipo === "contratista" && existingContIds.has(entry.id)) {
          await supabase.from("asistencia_capacitacion")
            .update({ telefono_whatsapp: entry.telefono || null } as unknown as AsistenciaCapacitacionUpdate)
            .eq("capacitacion_id", capId).eq("empleado_contratista_id", entry.id);
        }
      }

      if (newInserts.length > 0) {
        const insertBuilder = supabase.from as unknown as (table: string) => {
          insert: (values: unknown) => Promise<{ error: unknown }>;
        };
        await insertBuilder("asistencia_capacitacion").insert(newInserts);
      }
    }

    toast({ title: editing ? "Capacitación actualizada" : "Capacitación creada" });
    setFormOpen(false);
    setSaving(false);
    fetchAll();
  };

  // ─── Delete ────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("capacitaciones").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Capacitación eliminada" });
    setDeleteTarget(null);
    fetchAll();
  };

  // ─── Detail dialog ─────────────────────────────────────────────────────────

  const openDetail = async (cap: Capacitacion) => {
    setSelectedCap(cap);
    setDetailOpen(true);
    setLoadingDetail(true);
    await loadAsistencias(cap.id);
    setLoadingDetail(false);
  };

  const loadAsistencias = async (capId: string) => {
    const { data } = await runQuery<AsistenciaRecord[]>(
      supabase
        .from("asistencia_capacitacion")
        .select(`
          id, capacitacion_id, trabajador_id, empresa_id, tipo_asistente,
          empleado_contratista_id, asistio, nota, telefono_whatsapp,
          firma_token, firma_url, firmado_en,
          trabajador:trabajadores(nombres, apellidos, cargo, numero_documento),
          empleado:empleados_contratista(nombres, apellidos, cargo, numero_documento)
        `)
        .eq("capacitacion_id", capId)
        .order("created_at", { ascending: true })
    );

    setAsistencias(data ?? []);
  };

  const toggleAsistio = async (asistencia: AsistenciaRecord, value: boolean) => {
    await supabase.from("asistencia_capacitacion").update({ asistio: value }).eq("id", asistencia.id);
    setAsistencias((prev) => prev.map((a) => a.id === asistencia.id ? { ...a, asistio: value } : a));
  };

  // ─── WhatsApp ──────────────────────────────────────────────────────────────

  const sendInfoWA = async () => {
    if (!selectedCap || !empresa) return;
    setSendingWA("info");
    let sent = 0, fallbacks = 0;

    for (const a of asistencias) {
      if (!a.telefono_whatsapp) continue;
      const msg = mensajeInfoCapacitacion({
        titulo: selectedCap.titulo,
        fecha: selectedCap.fecha,
        duracion: selectedCap.duracion_horas,
        modalidad: selectedCap.modalidad,
        link_reunion: selectedCap.link_reunion,
        responsable: selectedCap.responsable,
        descripcion: selectedCap.descripcion,
      });
      const result = await enviarWhatsApp({
        tipo: "info_capacitacion",
        telefono: a.telefono_whatsapp,
        mensaje: msg,
        empresa_id: empresa.id,
        capacitacion_id: selectedCap.id,
        trabajador_id: a.trabajador_id ?? undefined,
      });
      if (result.fallbackUrl) { window.open(result.fallbackUrl, "_blank"); fallbacks++; }
      else if (result.ok) sent++;
    }

    setSendingWA(null);
    toast({ title: `WhatsApp (info) enviado`, description: sent > 0 ? `${sent} mensajes enviados` : `Abre los ${fallbacks} enlaces generados` });
  };

  const sendFirmaWA = async () => {
    if (!selectedCap || !empresa) return;
    setSendingWA("firma");
    let sent = 0, fallbacks = 0;

    for (const a of asistencias) {
      if (!a.telefono_whatsapp || !a.firma_token) continue;
      if (a.firma_url) continue; // already signed
      const msg = mensajeFirmaCapacitacion({
        titulo: selectedCap.titulo,
        fecha: selectedCap.fecha,
        firmaToken: a.firma_token,
      });
      const result = await enviarWhatsApp({
        tipo: "firma_capacitacion",
        telefono: a.telefono_whatsapp,
        mensaje: msg,
        empresa_id: empresa.id,
        capacitacion_id: selectedCap.id,
        trabajador_id: a.trabajador_id ?? undefined,
      });
      if (result.fallbackUrl) { window.open(result.fallbackUrl, "_blank"); fallbacks++; }
      else if (result.ok) sent++;
    }

    setSendingWA(null);
    toast({ title: "WhatsApp (firma) enviado", description: sent > 0 ? `${sent} mensajes enviados` : `Abre los ${fallbacks} enlaces generados` });
  };

  // ─── PDF ───────────────────────────────────────────────────────────────────

  const generatePDF = () => {
    if (!selectedCap || !empresa) return;
    generarPDFAsistencia({
      capacitacion: {
        titulo: selectedCap.titulo,
        fecha: selectedCap.fecha,
        tipo: selectedCap.tipo,
        duracion_horas: selectedCap.duracion_horas,
        modalidad: selectedCap.modalidad,
        responsable: selectedCap.responsable,
        descripcion: selectedCap.descripcion,
        link_reunion: selectedCap.link_reunion,
      },
      asistentes: asistencias.map((a) => ({
        nombre: getAttendeeName(a),
        tipo: a.tipo_asistente === "contratista" ? "contratista" : "trabajador",
        numero_documento: getAttendeeDoc(a),
        cargo: getAttendeeCargo(a),
        empresa: null,
        asistio: a.asistio ?? false,
        firma_url: a.firma_url ?? null,
        firmado_en: a.firmado_en ?? null,
      })),
      empresa: { nombre: empresa.nombre ?? "Empresa", nit: empresa.nit ?? null },
    });
  };

  // ─── Attendee entry helpers ─────────────────────────────────────────────────

  const toggleAttendee = (idx: number) => {
    setAttendeeEntries((prev) => prev.map((e, i) => i === idx ? { ...e, selected: !e.selected } : e));
  };

  const setAttendeeTelefono = (idx: number, value: string) => {
    setAttendeeEntries((prev) => prev.map((e, i) => i === idx ? { ...e, telefono: value } : e));
  };

  const filteredAttendeeEntries = attendeeEntries.filter((e) =>
    e.nombre.toLowerCase().includes(searchConvocatoria.toLowerCase()) ||
    (e.cargo ?? "").toLowerCase().includes(searchConvocatoria.toLowerCase())
  );

  const selectedCount = attendeeEntries.filter((e) => e.selected).length;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <AppLayout breadcrumbs={["SSTLink", "Capacitaciones"]}>
      <div className="space-y-4 max-w-6xl">

        {/* Header */}
        <div className="page-header !pb-3 !mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[#F97316]" />
              Capacitaciones
            </h1>
            <p className="page-subtitle">Programa, registra asistencia y gestiona firmas digitales</p>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />Nueva capacitación
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
          {loading ? Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />) : (
            <>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-indigo-100 p-2"><BookOpen className="h-4 w-4 text-indigo-600" /></div>
                <div><p className="text-xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Total capacitaciones</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
                <div><p className="text-xl font-bold">{completadas}</p><p className="text-xs text-muted-foreground">Completadas</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2"><Clock className="h-4 w-4 text-blue-600" /></div>
                <div><p className="text-xl font-bold">{horasTotales}h</p><p className="text-xs text-muted-foreground">Horas de formación</p></div>
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
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(ESTADOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><SkeletonRows rows={4} height="h-12" /></div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No hay capacitaciones registradas"
                description="Programa inducción, reinducción y formación en SST para tu equipo."
                action={{ label: "Nueva capacitación", onClick: openCreate, icon: Plus }}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Modalidad</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/40"
                        onClick={() => openDetail(c)}
                      >
                        <TableCell className="font-medium text-sm">
                          <span className="flex items-center gap-1">
                            {c.titulo}
                            <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{c.tipo ?? "—"}</TableCell>
                        <TableCell className="text-sm">{new Date(c.fecha + "T12:00:00").toLocaleDateString("es-CO")}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            {c.modalidad === "virtual"
                              ? <Monitor className="h-3.5 w-3.5" />
                              : <Building2 className="h-3.5 w-3.5" />}
                            <span className="capitalize">{c.modalidad}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{c.duracion_horas ? `${c.duracion_horas}h` : "—"}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ESTADO_BADGE[c.estado] ?? "bg-gray-100 text-gray-700"}`}>
                            {ESTADOS[c.estado] ?? c.estado}
                          </span>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ id: c.id, nombre: c.titulo })}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
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

      {/* ─── Create / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar capacitación" : "Nueva capacitación"}</DialogTitle>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">
                <Info className="h-3.5 w-3.5 mr-1.5" />Información
              </TabsTrigger>
              <TabsTrigger value="convocatoria" className="flex-1">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Convocatoria {selectedCount > 0 && <Badge variant="secondary" className="ml-1.5 h-4 text-[10px]">{selectedCount}</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* ── Info tab ── */}
            <TabsContent value="info" className="flex-1 overflow-y-auto mt-4 pr-1">
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Título *</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Trabajo seguro en alturas" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Estado</Label>
                    <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(ESTADOS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Fecha *</Label>
                    <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duración (horas)</Label>
                    <Input type="number" min={0.5} step={0.5} value={form.duracion_horas} onChange={(e) => setForm({ ...form, duracion_horas: parseFloat(e.target.value) || 1 })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Modalidad</Label>
                    <Select value={form.modalidad} onValueChange={(v) => setForm({ ...form, modalidad: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="presencial"><span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Presencial</span></SelectItem>
                        <SelectItem value="virtual"><span className="flex items-center gap-1.5"><Monitor className="h-3.5 w-3.5" />Virtual</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Responsable / Instructor</Label>
                    <Input value={form.responsable} onChange={(e) => setForm({ ...form, responsable: e.target.value })} placeholder="Nombre del instructor" />
                  </div>
                </div>
                {form.modalidad === "virtual" && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Enlace reunión / video</Label>
                    <Input value={form.link_reunion} onChange={(e) => setForm({ ...form, link_reunion: e.target.value })} placeholder="https://meet.google.com/..." />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5" />Material / Diapositivas (URL)</Label>
                  <Input value={form.archivo_url} onChange={(e) => setForm({ ...form, archivo_url: e.target.value })} placeholder="https://drive.google.com/..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Descripción</Label>
                  <Textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} rows={3} placeholder="Temas cubiertos, objetivos, lugar…" />
                </div>
              </div>
            </TabsContent>

            {/* ── Convocatoria tab ── */}
            <TabsContent value="convocatoria" className="flex-1 flex flex-col min-h-0 mt-4">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Buscar por nombre o cargo…"
                  value={searchConvocatoria}
                  onChange={(e) => setSearchConvocatoria(e.target.value)}
                />
              </div>
              <div className="text-xs text-muted-foreground mb-2 flex gap-3">
                <span><span className="font-semibold text-foreground">{attendeeEntries.filter((e) => e.tipo === "trabajador").length}</span> trabajadores propios</span>
                <span><span className="font-semibold text-foreground">{attendeeEntries.filter((e) => e.tipo === "contratista").length}</span> empleados de proveedores</span>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-[280px]">
                {filteredAttendeeEntries.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">No se encontraron personas.</p>
                )}
                {filteredAttendeeEntries.map((entry, visIdx) => {
                  const realIdx = attendeeEntries.findIndex((e) => e.tipo === entry.tipo && e.id === entry.id);
                  return (
                    <div
                      key={`${entry.tipo}-${entry.id}`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors ${
                        entry.selected ? "bg-indigo-50 border-indigo-200" : "border-border hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        checked={entry.selected}
                        onCheckedChange={() => toggleAttendee(realIdx)}
                        className="flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{entry.nombre}</p>
                        <div className="flex items-center gap-1.5">
                          {entry.cargo && <p className="text-[10px] text-muted-foreground">{entry.cargo}</p>}
                          <span className={`text-[9px] font-medium px-1.5 py-0 rounded-full ${
                            entry.tipo === "contratista"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {entry.tipo === "contratista" ? "Proveedor" : "Propio"}
                          </span>
                        </div>
                      </div>
                      {entry.selected && (
                        <Input
                          value={entry.telefono}
                          onChange={(e) => setAttendeeTelefono(realIdx, e.target.value)}
                          placeholder="Cel. WhatsApp"
                          className="w-36 h-7 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              {selectedCount > 0 && (
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  {selectedCount} persona{selectedCount !== 1 ? "s" : ""} seleccionada{selectedCount !== 1 ? "s" : ""}
                  {" · "}agrega el celular para enviar WhatsApp.
                </p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <DialogClose asChild><Button variant="outline" size="sm">Cancelar</Button></DialogClose>
            <Button size="sm" onClick={save} disabled={saving || !form.titulo || !form.fecha}>
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear capacitación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Detail / Attendance Dialog ───────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-500" />
              {selectedCap?.titulo}
            </DialogTitle>
            {selectedCap && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(selectedCap.fecha + "T12:00:00").toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </span>
                {selectedCap.duracion_horas && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{selectedCap.duracion_horas}h</span>}
                <span className="flex items-center gap-1">
                  {selectedCap.modalidad === "virtual" ? <Monitor className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
                  <span className="capitalize">{selectedCap.modalidad}</span>
                </span>
                {selectedCap.link_reunion && (
                  <a href={selectedCap.link_reunion} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-500 hover:underline">
                    <Link2 className="h-3 w-3" />Enlace
                  </a>
                )}
                {selectedCap.archivo_url && (
                  <a href={selectedCap.archivo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-500 hover:underline">
                    <FileText className="h-3 w-3" />Material
                  </a>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              variant="outline" size="sm"
              className="text-xs h-8 gap-1.5 text-green-700 border-green-200 hover:bg-green-50"
              onClick={sendInfoWA}
              disabled={sendingWA !== null}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              {sendingWA === "info" ? "Enviando…" : "Enviar info por WhatsApp"}
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-xs h-8 gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
              onClick={sendFirmaWA}
              disabled={sendingWA !== null}
            >
              <Send className="h-3.5 w-3.5" />
              {sendingWA === "firma" ? "Enviando…" : "Enviar enlace de firma"}
            </Button>
            <Button
              variant="outline" size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={generatePDF}
            >
              <FileText className="h-3.5 w-3.5" />
              PDF consolidado
            </Button>
          </div>

          <Separator />

          {/* Attendee list */}
          {loadingDetail ? (
            <div className="space-y-2 py-2 flex-1 overflow-y-auto">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
            </div>
          ) : asistencias.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground flex-1">
              No hay asistentes registrados. Edita la capacitación para agregar personas.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Pen className="h-3 w-3 text-indigo-500" />
                  {asistencias.filter((a) => a.firma_url).length} firmaron
                </span>
                <span className="flex items-center gap-1">
                  <UserCheck className="h-3 w-3 text-green-500" />
                  {asistencias.filter((a) => a.asistio).length} marcados asistentes
                </span>
                <span className="flex items-center gap-1">
                  <UserX className="h-3 w-3 text-red-400" />
                  {asistencias.filter((a) => !a.asistio).length} ausentes
                </span>
                <span>de {asistencias.length} convocados</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0 max-h-[340px]">
                {asistencias.map((a) => {
                  const name = getAttendeeName(a);
                  const cargo = getAttendeeCargo(a);
                  const signed = !!a.firma_url;
                  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                        signed
                          ? "bg-green-50 border-green-200"
                          : a.asistio
                          ? "bg-blue-50 border-blue-200"
                          : "bg-background border-border"
                      }`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="text-[11px] bg-muted">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <span className={`text-[9px] font-medium px-1.5 py-0 rounded-full flex-shrink-0 ${
                            a.tipo_asistente === "contratista"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {a.tipo_asistente === "contratista" ? "Proveedor" : "Propio"}
                          </span>
                        </div>
                        {cargo && <p className="text-[10px] text-muted-foreground">{cargo}</p>}
                        {signed && a.firmado_en && (
                          <p className="text-[10px] text-green-600">
                            ✅ Firmó el {new Date(a.firmado_en).toLocaleDateString("es-CO")}
                          </p>
                        )}
                        {!signed && a.telefono_whatsapp && (
                          <p className="text-[10px] text-muted-foreground">📱 {a.telefono_whatsapp}</p>
                        )}
                      </div>
                      {/* Signature thumbnail */}
                      {signed && a.firma_url && (
                        <img
                          src={a.firma_url}
                          alt="firma"
                          className="h-10 w-20 object-contain border-b border-slate-300"
                        />
                      )}
                      {!signed && (
                        <div className="h-10 w-20 border border-dashed border-slate-300 rounded flex items-center justify-center flex-shrink-0">
                          <span className="text-[9px] text-muted-foreground/60">Sin firma</span>
                        </div>
                      )}
                      {/* Asistió switch */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <span className="text-[9px] text-muted-foreground">Asistió</span>
                        <Switch
                          checked={a.asistio ?? false}
                          onCheckedChange={(v) => toggleAsistio(a, v)}
                          className="scale-75"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <DialogFooter>
            <DialogClose asChild><Button variant="outline" size="sm">Cerrar</Button></DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        itemName={deleteTarget?.nombre ?? "esta capacitación"}
        onConfirm={confirmDelete}
        loading={deleting}
        title="¿Eliminar capacitación?"
      />
    </AppLayout>
  );
}
