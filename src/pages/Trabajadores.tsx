import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { canViewAll } from "@/lib/roles";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, Eye, Upload, Download } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddWorkerModal } from "@/components/trabajadores/AddWorkerModal";
import { EstadoChip } from "@/components/trabajadores/EstadoChip";
import { VerificadoToggle } from "@/components/trabajadores/VerificadoToggle";
import { ImportarModal } from "@/components/importar/ImportarModal";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Trabajador {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  cargo: string | null;
  email: string | null;
  estado: string;
  fecha_ingreso: string;
  verificado_ingreso?: boolean;
  verificado_en?: string | null;
  _highlight?: boolean;
}

function getInitials(nombres: string, apellidos: string) {
  return ((nombres[0] || "") + (apellidos[0] || "")).toUpperCase();
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("es-CO", { month: "short", day: "numeric", year: "numeric" });
}

// ── CSV export helper ──────────────────────────────────────────────────────────
function escapeCSVVal(v: any): string {
  const s = v == null ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
}

const PERFIL_LABELS: Record<string, Record<string, string>> = {
  estado_civil: { soltero: "Soltero/a", casado: "Casado/a", union_libre: "Unión libre", separado: "Separado/a", divorciado: "Divorciado/a", viudo: "Viudo/a" },
  nivel_escolaridad: { ninguno: "Ninguno", primaria: "Primaria", bachillerato: "Bachillerato", tecnico: "Técnico", tecnologo: "Tecnólogo", profesional: "Profesional", especializacion: "Especialización", maestria: "Maestría", doctorado: "Doctorado" },
  jornada_trabajo: { diurno: "Diurno", nocturno: "Nocturno", mixto: "Mixto", rotativo: "Rotativo" },
  rango_salarial: { "1_smlv": "1 SMLV", "1_2_smlv": "1-2 SMLV", "2_3_smlv": "2-3 SMLV", "3_5_smlv": "3-5 SMLV", "+5_smlv": "+5 SMLV" },
  estado_vacunacion: { completo: "Completo", incompleto: "Incompleto", sin_informacion: "Sin información" },
  actividad_fisica: { nunca: "Nunca", ocasional: "Ocasional", "2_3_semana": "2-3/semana", diario: "Diario" },
  consumo_tabaco: { no: "No", ex_fumador: "Ex fumador", si: "Sí" },
  consumo_alcohol: { no: "No", ocasional: "Ocasional", frecuente: "Frecuente" },
};

function pLabel(field: string, val?: string) {
  return val ? (PERFIL_LABELS[field]?.[val] ?? val) : "";
}

export default function Trabajadores() {
  const { empresa, usuario } = useAuth();
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Trabajador[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterCargo, setFilterCargo] = useState("todos");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const canSeePerfil = canViewAll(usuario?.rol);

  const fetchWorkers = useCallback(async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const selectFields = canSeePerfil
      ? "id, nombres, apellidos, tipo_documento, numero_documento, cargo, email, estado, fecha_ingreso, verificado_ingreso, verificado_en, fecha_nacimiento, genero, rh, telefono, ciudad, departamento, sede, arl, eps, pension, caja_compensacion, tipo_contrato, tipo_trabajador, fecha_fin_contrato, perfil_sociodemografico"
      : "id, nombres, apellidos, tipo_documento, numero_documento, cargo, email, estado, fecha_ingreso, verificado_ingreso, verificado_en";
    const { data, error } = await (supabase as any)
      .from("trabajadores")
      .select(selectFields)
      .eq("empresa_id", empresa.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error al cargar trabajadores", description: error.message, variant: "destructive" });
    } else {
      setWorkers(data || []);
    }
    setLoading(false);
  }, [empresa?.id, canSeePerfil]);

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const handleExport = () => {
    const baseHeaders = [
      "nombres", "apellidos", "tipo_documento", "numero_documento", "cargo",
      "fecha_ingreso", "estado", "email", "telefono", "genero", "rh",
      "fecha_nacimiento", "ciudad", "departamento", "sede",
      "tipo_contrato", "tipo_trabajador", "fecha_fin_contrato",
      "arl", "eps", "pension", "caja_compensacion",
    ];
    const perfilHeaders = canSeePerfil ? [
      "estado_civil", "nivel_escolaridad", "estrato_socioeconomico",
      "personas_a_cargo", "tipo_vivienda", "area_trabajo",
      "jornada_trabajo", "rango_salarial", "estado_vacunacion",
      "actividad_fisica", "consumo_tabaco", "consumo_alcohol", "antecedentes_salud",
    ] : [];
    const allHeaders = [...baseHeaders, ...perfilHeaders];

    const rows = workers.map(w => {
      const p = (w as any).perfil_sociodemografico ?? {};
      const base = baseHeaders.map(h => escapeCSVVal((w as any)[h]));
      const perfil = perfilHeaders.map(h => {
        const raw = p[h] ?? "";
        return escapeCSVVal(
          ["estado_civil","nivel_escolaridad","jornada_trabajo","rango_salarial",
           "estado_vacunacion","actividad_fisica","consumo_tabaco","consumo_alcohol"].includes(h)
            ? pLabel(h, raw) : raw
        );
      });
      return [...base, ...perfil].join(",");
    });

    const csv = [allHeaders.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trabajadores_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenAddModal = async () => {
    if (!empresa?.id) return;
    const { data: emp } = await (supabase as any)
      .from("empresas")
      .select("plan, limite_trabajadores")
      .eq("id", empresa.id)
      .maybeSingle();
    const plan = emp?.plan ?? "free";
    const limite = emp?.limite_trabajadores ?? 11;
    if (plan === "free") {
      const { count } = await (supabase as any)
        .from("trabajadores")
        .select("id", { count: "exact", head: true })
        .eq("empresa_id", empresa.id)
        .eq("eliminado", false);
      if ((count ?? 0) >= limite) {
        toast({
          title: "Límite del plan alcanzado",
          description: "Alcanzaste el límite de tu plan. Actualiza a Pro para agregar más trabajadores.",
          variant: "destructive",
        });
        return;
      }
    }
    setShowModal(true);
  };

  useEffect(() => {
    if (empresa?.id) fetchWorkers();
  }, [empresa?.id, fetchWorkers]);

  const handleWorkerAdded = (newWorker?: any) => {
    if (newWorker) {
      // Optimistic: add to top with highlight
      setWorkers(prev => [{ ...newWorker, _highlight: true }, ...prev]);
      // Remove highlight after 3s
      setTimeout(() => {
        setWorkers(prev => prev.map(w => w.id === newWorker.id ? { ...w, _highlight: false } : w));
      }, 3000);
    } else {
      fetchWorkers();
    }
  };

  const handleEstadoUpdate = (id: string, newEstado: string) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, estado: newEstado } : w));
  };

  const handleVerificadoUpdate = (id: string, verificado: boolean, verificadoEn: string | null) => {
    setWorkers(prev => prev.map(w => w.id === id ? { ...w, verificado_ingreso: verificado, verificado_en: verificadoEn } : w));
  };

  const filtered = workers.filter((w) => {
    const matchSearch =
      search === "" ||
      `${w.nombres} ${w.apellidos}`.toLowerCase().includes(search.toLowerCase()) ||
      w.numero_documento.includes(search);
    const matchEstado = filterEstado === "todos" || w.estado === filterEstado;
    const matchCargo =
      filterCargo === "todos" ||
      (filterCargo === "operativo" && w.cargo?.toLowerCase().includes("operativo")) ||
      (filterCargo === "administrativo" && w.cargo?.toLowerCase().includes("administrativo")) ||
      (filterCargo !== "operativo" && filterCargo !== "administrativo");
    return matchSearch && matchEstado && matchCargo;
  });

  const activeCount = workers.filter((w) => w.estado !== "inactivo").length;

  return (
    <AppLayout breadcrumbs={["SSTLink", "Trabajadores"]}>
      <div className="space-y-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-foreground">Trabajadores</h1>
            {loading ? (
              <Skeleton className="h-4 w-24 mt-1" />
            ) : (
              <p className="text-xs text-muted-foreground">{activeCount} activos</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} disabled={workers.length === 0} className="gap-1.5 text-xs h-9">
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-1.5 text-xs h-9">
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              Importar CSV
            </Button>
            <Button onClick={handleOpenAddModal} className="gap-1.5 text-xs h-9">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Añadir Trabajador
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-hint" aria-hidden="true" />
            <Input
              placeholder="Buscar por nombre o documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs bg-background"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="inactivo">Inactivo</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCargo} onValueChange={setFilterCargo}>
            <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
              <SelectValue placeholder="Cargo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="operativo">Operativo</SelectItem>
              <SelectItem value="administrativo">Administrativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 && workers.length === 0 ? (
          <div className="bg-card rounded-xl border-[0.5px] border-border p-12 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" aria-hidden="true" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">Aún no tienes trabajadores registrados</p>
            <p className="text-xs text-muted-foreground mb-4">Comienza agregando tu primer trabajador al sistema.</p>
            <Button onClick={handleOpenAddModal} className="gap-1.5 text-xs h-9">
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Agregar el primer trabajador
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border-[0.5px] border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No se encontraron trabajadores con esos filtros.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-card rounded-xl border-[0.5px] border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Trabajador</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Cargo</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Fecha Ingreso</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Estado</th>
                    <th className="text-center px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Verificado</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((w, i) => (
                    <tr
                      key={w.id}
                      className={cn(
                        "border-b border-border last:border-b-0 transition-all hover:bg-background",
                        i % 2 === 0 ? "bg-card" : "bg-background/50"
                      )}
                      style={w._highlight ? { borderLeft: "3px solid #16A34A", transition: "border-color 3s ease-out" } : undefined}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-medium">
                              {getInitials(w.nombres, w.apellidos)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-medium text-foreground">{w.nombres} {w.apellidos}</p>
                            <p className="text-[10px] text-muted-foreground">{w.tipo_documento} {w.numero_documento}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-foreground">{w.cargo || "—"}</td>
                      <td className="px-4 py-3 text-foreground">{formatDate(w.fecha_ingreso)}</td>
                      <td className="px-4 py-3">
                        <EstadoChip workerId={w.id} estado={w.estado} editable={true} onUpdate={handleEstadoUpdate} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <VerificadoToggle
                          workerId={w.id}
                          verificado={!!w.verificado_ingreso}
                          verificadoEn={w.verificado_en}
                          onUpdate={handleVerificadoUpdate}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/trabajadores/${w.id}`}
                          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                        >
                          <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                          Ver perfil
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="md:hidden space-y-2">
              {filtered.map((w) => (
                <Link
                  key={w.id}
                  to={`/trabajadores/${w.id}`}
                  className="block bg-card rounded-xl border-[0.5px] border-border p-3 hover:border-muted-foreground/30 transition-colors"
                  style={w._highlight ? { borderLeft: "3px solid #16A34A" } : undefined}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-accent text-accent-foreground text-[10px] font-medium">
                        {getInitials(w.nombres, w.apellidos)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground truncate">{w.nombres} {w.apellidos}</p>
                        <EstadoChip workerId={w.id} estado={w.estado} editable={false} onUpdate={handleEstadoUpdate} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{w.cargo || "Sin cargo"} · {w.tipo_documento} {w.numero_documento}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      <AddWorkerModal
        open={showModal}
        onOpenChange={setShowModal}
        empresaId={empresa?.id ?? null}
        onSuccess={handleWorkerAdded}
      />

      <ImportarModal
        open={showImport}
        onOpenChange={setShowImport}
        tipo="trabajadores"
        onSuccess={fetchWorkers}
      />
    </AppLayout>
  );
}
