import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Pencil, User, Briefcase, Heart, FileText, BarChart2, Lock, GraduationCap, Stethoscope, Printer, Plus, Trash2, Paperclip } from "lucide-react";
import { AddWorkerModal } from "@/components/trabajadores/AddWorkerModal";
import { DocumentosTrabajador } from "@/components/trabajadores/DocumentosTrabajador";
import { PerfilSocioModal, type PerfilSocio } from "@/components/trabajadores/PerfilSocioModal";
import { ExamenMedicoModal, type ExamenMedicoRecord } from "@/components/trabajadores/ExamenMedicoModal";
import { useAuth } from "@/contexts/AuthContext";
import { canViewAll, canEdit, canAdmin } from "@/lib/roles";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const estadoColor: Record<string, string> = {
  aprobado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  activo:   "bg-emerald-100 text-emerald-700 border-emerald-200",
  pendiente:"bg-amber-100 text-amber-700 border-amber-200",
  inactivo: "bg-slate-100 text-slate-600 border-slate-200",
  retirado: "bg-red-100 text-red-700 border-red-200",
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="py-2.5 border-b last:border-0">
      <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-xs font-medium text-foreground">{value || <span className="text-muted-foreground/50 font-normal">—</span>}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-4 first:mt-0">{children}</p>;
}

// Human-readable labels for perfil sociodemográfico values
const LABELS: Record<string, Record<string, string>> = {
  estado_civil: { soltero: "Soltero/a", casado: "Casado/a", union_libre: "Unión libre", separado: "Separado/a", divorciado: "Divorciado/a", viudo: "Viudo/a" },
  nivel_escolaridad: { ninguno: "Ninguno", primaria: "Primaria", bachillerato: "Bachillerato", tecnico: "Técnico", tecnologo: "Tecnólogo", profesional: "Profesional", especializacion: "Especialización", maestria: "Maestría", doctorado: "Doctorado" },
  estrato_socioeconomico: { "1": "Estrato 1", "2": "Estrato 2", "3": "Estrato 3", "4": "Estrato 4", "5": "Estrato 5", "6": "Estrato 6" },
  personas_a_cargo: { "0": "0 — Sin personas a cargo", "1": "1 persona", "2": "2 personas", "3": "3 personas", "4": "4 personas", "5+": "5 o más personas" },
  tipo_vivienda: { propia: "Propia", arrendada: "Arrendada", familiar: "Familiar / sin costo" },
  jornada_trabajo: { diurno: "Diurno", nocturno: "Nocturno", mixto: "Mixto", rotativo: "Rotativo" },
  rango_salarial: { "1_smlv": "1 SMLV", "1_2_smlv": "Entre 1 y 2 SMLV", "2_3_smlv": "Entre 2 y 3 SMLV", "3_5_smlv": "Entre 3 y 5 SMLV", "+5_smlv": "Más de 5 SMLV" },
  estado_vacunacion: { completo: "Esquema completo", incompleto: "Incompleto", sin_informacion: "Sin información" },
  actividad_fisica: { nunca: "Nunca", ocasional: "Ocasional", "2_3_semana": "2-3 veces/semana", diario: "Diario" },
  consumo_tabaco: { no: "No consume", ex_fumador: "Ex fumador/a", si: "Sí consume" },
  consumo_alcohol: { no: "No consume", ocasional: "Ocasional", frecuente: "Frecuente" },
};

function labelOf(field: string, value?: string | null) {
  if (!value) return null;
  return LABELS[field]?.[value] ?? value;
}

export default function TrabajadorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { empresa, usuario } = useAuth();
  const [worker, setWorker] = useState<any>(null);
  const [perfil, setPerfil] = useState<Partial<PerfilSocio>>({});
  const [capacitaciones, setCapacitaciones] = useState<any[]>([]);
  const [examenes, setExamenes] = useState<ExamenMedicoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [perfilOpen, setPerfilOpen] = useState(false);
  const [examenModalOpen, setExamenModalOpen] = useState(false);
  const [editingExamen, setEditingExamen] = useState<ExamenMedicoRecord | null>(null);
  const [deleteExamenId, setDeleteExamenId] = useState<string | null>(null);
  const { toast } = useToast();

  const canSeePerfil = canViewAll(usuario?.rol);
  const canEditExamenes = canEdit(usuario?.rol);
  const canDeleteExamenes = canAdmin(usuario?.rol);

  const fetchWorker = async () => {
    if (!id || !empresa?.id) return;
    const { data } = await (supabase as any)
      .from("trabajadores")
      .select("*")
      .eq("id", id)
      .eq("empresa_id", empresa.id)
      .maybeSingle();
    if (!data) { setLoading(false); return; }
    setWorker(data);
    setPerfil((data?.perfil_sociodemografico as Partial<PerfilSocio>) ?? {});

    // Capacitaciones (vía asistencia_capacitacion) y exámenes
    const [{ data: asis }, { data: exs }] = await Promise.all([
      (supabase as any)
        .from("asistencia_capacitacion")
        .select("id, asistio, firmado_en, capacitacion:capacitaciones(id, titulo, fecha, modalidad, duracion_horas, estado)")
        .eq("trabajador_id", id)
        .order("firmado_en", { ascending: false, nullsFirst: false }),
      (supabase as any)
        .from("examenes_medicos")
        .select("id, tipo, fecha, resultado, concepto, restricciones, proximo_control, soporte_url")
        .eq("trabajador_id", id)
        .order("fecha", { ascending: false }),
    ]);
    setCapacitaciones(asis ?? []);
    setExamenes(exs ?? []);
    setLoading(false);
  };

  useEffect(() => { if (empresa?.id) fetchWorker(); }, [id, empresa?.id]);

  const initials = worker ? `${worker.nombres?.[0] || ""}${worker.apellidos?.[0] || ""}`.toUpperCase() : "?";
  const fullName = worker ? `${worker.nombres} ${worker.apellidos}` : "";
  const edad = worker?.fecha_nacimiento
    ? Math.floor((Date.now() - new Date(worker.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  const fmt = (date?: string | null) => date ? format(new Date(date + "T00:00:00"), "dd MMM yyyy", { locale: es }) : null;

  // Antigüedad
  const antiguedad = worker?.fecha_ingreso ? (() => {
    const months = Math.floor((Date.now() - new Date(worker.fecha_ingreso).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    if (months < 1) return "Menos de 1 mes";
    if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
    const yrs = Math.floor(months / 12); const rem = months % 12;
    return `${yrs} ${yrs === 1 ? "año" : "años"}${rem ? ` y ${rem} ${rem === 1 ? "mes" : "meses"}` : ""}`;
  })() : null;

  if (loading) return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="flex gap-4 items-center">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2"><Skeleton className="h-5 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </AppLayout>
  );

  if (!worker) return (
    <AppLayout>
      <div className="p-6 text-center text-muted-foreground">
        <p className="text-sm">Trabajador no encontrado.</p>
        <Button variant="link" onClick={() => navigate("/trabajadores")} className="text-xs mt-2">Volver a la lista</Button>
      </div>
    </AppLayout>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">

        {/* Breadcrumb */}
        <button onClick={() => navigate("/trabajadores")} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Trabajadores
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 text-base">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-base font-semibold leading-tight">{fullName}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{worker.cargo || "Sin cargo"} · {worker.tipo_documento} {worker.numero_documento}</p>
              <div className="flex gap-2 mt-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${estadoColor[worker.estado] || estadoColor.pendiente}`}>
                  {worker.estado?.charAt(0).toUpperCase() + worker.estado?.slice(1)}
                </span>
                {worker.tipo_trabajador && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200 font-medium capitalize">
                    {worker.tipo_trabajador}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0 print:hidden">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="text-xs h-8 gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="text-xs h-8 gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className={`grid h-8 w-full print:hidden ${canSeePerfil ? "grid-cols-7" : "grid-cols-6"}`}>
            <TabsTrigger value="personal"      className="text-[11px] gap-1"><User       className="w-3 h-3" />Personal</TabsTrigger>
            <TabsTrigger value="laboral"       className="text-[11px] gap-1"><Briefcase  className="w-3 h-3" />Laboral</TabsTrigger>
            <TabsTrigger value="afiliaciones"  className="text-[11px] gap-1"><Heart      className="w-3 h-3" />Afiliaciones</TabsTrigger>
            <TabsTrigger value="documentos"    className="text-[11px] gap-1"><FileText   className="w-3 h-3" />Documentos</TabsTrigger>
            <TabsTrigger value="capacitaciones" className="text-[11px] gap-1"><GraduationCap className="w-3 h-3" />Capacit.</TabsTrigger>
            <TabsTrigger value="examenes"      className="text-[11px] gap-1"><Stethoscope className="w-3 h-3" />Exámenes</TabsTrigger>
            {canSeePerfil && (
              <TabsTrigger value="perfil"      className="text-[11px] gap-1"><BarChart2  className="w-3 h-3" />Perfil S.</TabsTrigger>
            )}
          </TabsList>

          {/* TAB 1 — PERSONAL */}
          <TabsContent value="personal" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <SectionTitle>Datos personales</SectionTitle>
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="Nombres" value={worker.nombres} />
                <InfoRow label="Apellidos" value={worker.apellidos} />
                <InfoRow label="Tipo documento" value={worker.tipo_documento} />
                <InfoRow label="Número documento" value={worker.numero_documento} />
                <InfoRow label="Fecha de nacimiento" value={fmt(worker.fecha_nacimiento)} />
                <InfoRow label="Edad" value={edad ? `${edad} años` : null} />
                <InfoRow label="Género" value={worker.genero ? worker.genero.charAt(0).toUpperCase() + worker.genero.slice(1).replace("_", " ") : null} />
                <InfoRow label="Grupo RH" value={worker.rh} />
              </div>

              <SectionTitle>Ubicación</SectionTitle>
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="País" value={worker.pais} />
                <InfoRow label="Departamento" value={worker.departamento} />
                <InfoRow label="Ciudad de nacimiento" value={worker.ciudad} />
                <InfoRow label="Ciudad de residencia" value={worker.ciudad_residencia} />
                <InfoRow label="Dirección" value={worker.direccion} />
              </div>

              <SectionTitle>Contacto</SectionTitle>
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="Email" value={worker.email} />
                <InfoRow label="Teléfono" value={worker.telefono} />
              </div>

              <SectionTitle>Contacto de emergencia</SectionTitle>
              <div className="grid grid-cols-3 gap-x-8">
                <InfoRow label="Nombre" value={worker.nombre_contacto_emergencia} />
                <InfoRow label="Celular" value={worker.celular_contacto_emergencia} />
                <InfoRow label="Parentesco" value={worker.parentesco_contacto_emergencia} />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2 — LABORAL */}
          <TabsContent value="laboral" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <SectionTitle>Información laboral</SectionTitle>
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="Cargo" value={worker.cargo} />
                <InfoRow label="Sede" value={worker.sede} />
                <InfoRow label="Tipo de trabajador" value={worker.tipo_trabajador ? worker.tipo_trabajador.charAt(0).toUpperCase() + worker.tipo_trabajador.slice(1) : null} />
                <InfoRow label="Empresa contratista" value={worker.empresa_contratista} />
                <InfoRow label="Antigüedad" value={antiguedad} />
              </div>

              <SectionTitle>Contrato</SectionTitle>
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="Tipo de contrato" value={
                  worker.tipo_contrato === "indefinido" ? "Indefinido" :
                  worker.tipo_contrato === "fijo" ? "Término fijo" :
                  worker.tipo_contrato === "obra" ? "Obra o labor" :
                  worker.tipo_contrato === "aprendiz" ? "Aprendiz" :
                  worker.tipo_contrato === "prestacion" ? "Prestación de servicios" : worker.tipo_contrato
                } />
                <InfoRow label="Estado" value={worker.estado?.charAt(0).toUpperCase() + worker.estado?.slice(1)} />
                <InfoRow label="Fecha de ingreso" value={fmt(worker.fecha_ingreso)} />
                <InfoRow label="Fecha fin contrato" value={fmt(worker.fecha_fin_contrato)} />
              </div>

              {worker.fecha_fin_contrato && (() => {
                const dias = Math.ceil((new Date(worker.fecha_fin_contrato).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                if (dias > 0 && dias <= 30) return (
                  <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <p className="text-xs text-amber-700 font-medium">⚠️ Contrato vence en {dias} días ({fmt(worker.fecha_fin_contrato)})</p>
                  </div>
                );
                if (dias <= 0) return (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs text-red-700 font-medium">🔴 Contrato vencido desde {fmt(worker.fecha_fin_contrato)}</p>
                  </div>
                );
                return null;
              })()}
            </div>
          </TabsContent>

          {/* TAB 3 — AFILIACIONES */}
          <TabsContent value="afiliaciones" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <SectionTitle>Seguridad social</SectionTitle>
              <div className="grid grid-cols-2 gap-x-8">
                <InfoRow label="ARL" value={worker.arl} />
                <InfoRow label="EPS" value={worker.eps} />
                <InfoRow label="Pensión" value={worker.pension} />
                <InfoRow label="Caja de compensación" value={worker.caja_compensacion} />
              </div>
              <div className="mt-4 rounded-lg bg-muted/40 border p-3">
                <p className="text-[11px] text-muted-foreground">
                  📎 Los documentos de afiliación (planillas, certificados ARL, carné EPS) se gestionan en la pestaña <strong>Documentos</strong>.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4 — DOCUMENTOS */}
          <TabsContent value="documentos" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">Documentos del trabajador</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Sube PDF o imágenes — máx. 10MB por archivo</p>
                </div>
              </div>
              <DocumentosTrabajador trabajadorId={worker.id} trabajadorNombre={fullName} />
            </div>
          </TabsContent>

          {/* TAB — CAPACITACIONES */}
          <TabsContent value="capacitaciones" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-sm font-semibold mb-3">Historial de capacitaciones</p>
              {capacitaciones.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin capacitaciones asignadas.</p>
              ) : (
                <div className="divide-y">
                  {capacitaciones.map((a: any) => (
                    <div key={a.id} className="py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{a.capacitacion?.titulo ?? "—"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {a.capacitacion?.fecha ? fmt(a.capacitacion.fecha) : "—"}
                          {a.capacitacion?.modalidad ? ` · ${a.capacitacion.modalidad}` : ""}
                          {a.capacitacion?.duracion_horas ? ` · ${a.capacitacion.duracion_horas}h` : ""}
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${a.firmado_en || a.asistio ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                        {a.firmado_en || a.asistio ? "Asistió" : "Pendiente"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB — EXÁMENES MÉDICOS */}
          <TabsContent value="examenes" className="mt-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Exámenes médicos</p>
                {canEditExamenes && (
                  <Button
                    size="sm"
                    onClick={() => { setEditingExamen(null); setExamenModalOpen(true); }}
                    className="h-8 text-xs gap-1.5 print:hidden"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar examen
                  </Button>
                )}
              </div>
              {examenes.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">Sin exámenes registrados.</p>
              ) : (
                <div className="divide-y">
                  {examenes.map((e) => (
                    <div key={e.id} className="py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-medium text-foreground capitalize">{e.tipo.replace(/_/g, " ")}</p>
                            <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium bg-slate-100 text-slate-700 border-slate-200 capitalize">
                              {(e.resultado ?? "pendiente").replace(/_/g, " ")}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {fmt(e.fecha)}
                            {e.proximo_control ? ` · Próx. control: ${fmt(e.proximo_control)}` : ""}
                          </p>
                          {e.concepto && (
                            <p className="text-[11px] text-foreground/80 mt-1"><span className="text-muted-foreground">Concepto:</span> {e.concepto}</p>
                          )}
                          {e.restricciones && (
                            <p className="text-[11px] text-foreground/80 mt-0.5"><span className="text-muted-foreground">Restricciones:</span> {e.restricciones}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 print:hidden">
                          {e.soporte_url && (
                            <a
                              href={e.soporte_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-primary"
                              title="Ver soporte"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {canEditExamenes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => { setEditingExamen(e); setExamenModalOpen(true); }}
                              title="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canDeleteExamenes && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteExamenId(e.id)}
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>


          {/* TAB 5 — PERFIL SOCIODEMOGRÁFICO (solo admin/asistente) */}
          {canSeePerfil && (
            <TabsContent value="perfil" className="mt-4">
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold">Datos complementarios</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Perfil sociodemográfico — visible solo para administradores y asistentes
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setPerfilOpen(true)} className="gap-1.5 text-xs">
                    <Pencil className="w-3.5 h-3.5" /> Editar perfil
                  </Button>
                </div>

                {/* Variables sociodemográficas */}
                <SectionTitle>Variables sociodemográficas</SectionTitle>
                <div className="grid grid-cols-2 gap-x-8">
                  <InfoRow label="Estado civil" value={labelOf("estado_civil", perfil.estado_civil)} />
                  <InfoRow label="Nivel de escolaridad" value={labelOf("nivel_escolaridad", perfil.nivel_escolaridad)} />
                  <InfoRow label="Estrato socioeconómico" value={labelOf("estrato_socioeconomico", perfil.estrato_socioeconomico)} />
                  <InfoRow label="Personas a cargo" value={labelOf("personas_a_cargo", perfil.personas_a_cargo)} />
                  <InfoRow label="Tipo de vivienda" value={labelOf("tipo_vivienda", perfil.tipo_vivienda)} />
                </div>

                {/* Variables laborales */}
                <SectionTitle>Variables laborales</SectionTitle>
                <div className="grid grid-cols-2 gap-x-8">
                  <InfoRow label="Área / departamento" value={perfil.area_trabajo} />
                  <InfoRow label="Jornada / turno" value={labelOf("jornada_trabajo", perfil.jornada_trabajo)} />
                  <InfoRow label="Rango salarial" value={labelOf("rango_salarial", perfil.rango_salarial)} />
                  <InfoRow label="Antigüedad" value={antiguedad} />
                </div>

                {/* Salud y hábitos */}
                <SectionTitle>Salud y hábitos</SectionTitle>
                <div className="grid grid-cols-2 gap-x-8">
                  <InfoRow label="Estado de vacunación" value={labelOf("estado_vacunacion", perfil.estado_vacunacion)} />
                  <InfoRow label="Actividad física" value={labelOf("actividad_fisica", perfil.actividad_fisica)} />
                  <InfoRow label="Consumo de tabaco" value={labelOf("consumo_tabaco", perfil.consumo_tabaco)} />
                  <InfoRow label="Consumo de alcohol" value={labelOf("consumo_alcohol", perfil.consumo_alcohol)} />
                </div>
                <InfoRow label="Antecedentes de salud" value={perfil.antecedentes_salud} />

                {Object.values(perfil).every(v => !v) && (
                  <div className="mt-4 rounded-lg bg-muted/40 border border-dashed p-4 text-center">
                    <p className="text-xs text-muted-foreground">Aún no se han ingresado datos del perfil sociodemográfico.</p>
                    <Button variant="outline" size="sm" onClick={() => setPerfilOpen(true)} className="mt-2 text-xs gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Completar perfil
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>

        {/* Modales */}
        <AddWorkerModal
          open={editOpen}
          onOpenChange={setEditOpen}
          empresaId={empresa?.id ?? null}
          onSuccess={(updated) => { if (updated) setWorker(updated); }}
          editWorker={worker}
        />

        {canSeePerfil && (
          <PerfilSocioModal
            open={perfilOpen}
            onOpenChange={setPerfilOpen}
            trabajadorId={worker.id}
            initial={perfil}
            onSuccess={(updated) => setPerfil(updated)}
          />
        )}
      </div>
    </AppLayout>
  );
}
