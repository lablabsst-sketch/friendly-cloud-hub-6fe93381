import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface WorkerData {
  id?: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  fecha_nacimiento: Date | undefined;
  genero: string;
  rh: string;
  pais: string;
  ciudad: string;
  departamento: string;
  direccion: string;
  ciudad_residencia: string;
  cargo: string;
  tipo_contrato: string;
  fecha_ingreso: Date | undefined;
  fecha_fin_contrato: Date | undefined;
  tipo_trabajador: string;
  sede: string;
  empresa_contratista: string;
  arl: string;
  eps: string;
  pension: string;
  caja_compensacion: string;
  nombre_contacto_emergencia: string;
  celular_contacto_emergencia: string;
  parentesco_contacto_emergencia: string;
  email: string;
  telefono: string;
}

interface AddWorkerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresaId: string | null;
  onSuccess: (worker?: any) => void;
  editWorker?: WorkerData & { id: string } | null;
}

const emptyForm: WorkerData = {
  nombres: "", apellidos: "", tipo_documento: "", numero_documento: "",
  fecha_nacimiento: undefined, genero: "", rh: "", pais: "Colombia",
  ciudad: "", departamento: "", direccion: "", ciudad_residencia: "",
  cargo: "", tipo_contrato: "", fecha_ingreso: undefined,
  fecha_fin_contrato: undefined, tipo_trabajador: "propio", sede: "",
  empresa_contratista: "", arl: "", eps: "", pension: "",
  caja_compensacion: "", nombre_contacto_emergencia: "",
  celular_contacto_emergencia: "", parentesco_contacto_emergencia: "",
  email: "", telefono: "",
};

export function AddWorkerModal({ open, onOpenChange, empresaId, onSuccess, editWorker }: AddWorkerModalProps) {
  const { toast } = useToast();
  const { user: authUser, empresa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<WorkerData>(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("basicos");

  const isEdit = !!editWorker?.id;

  useEffect(() => {
    if (open && editWorker) {
      setForm({
        nombres: editWorker.nombres || "",
        apellidos: editWorker.apellidos || "",
        tipo_documento: editWorker.tipo_documento || "",
        numero_documento: editWorker.numero_documento || "",
        fecha_nacimiento: editWorker.fecha_nacimiento ? new Date(editWorker.fecha_nacimiento + "T00:00:00") : undefined,
        genero: editWorker.genero || "",
        rh: editWorker.rh || "",
        pais: editWorker.pais || "Colombia",
        ciudad: editWorker.ciudad || "",
        departamento: editWorker.departamento || "",
        direccion: editWorker.direccion || "",
        ciudad_residencia: editWorker.ciudad_residencia || "",
        cargo: editWorker.cargo || "",
        tipo_contrato: editWorker.tipo_contrato || "",
        fecha_ingreso: editWorker.fecha_ingreso ? new Date(editWorker.fecha_ingreso + "T00:00:00") : undefined,
        fecha_fin_contrato: editWorker.fecha_fin_contrato ? new Date(editWorker.fecha_fin_contrato + "T00:00:00") : undefined,
        tipo_trabajador: editWorker.tipo_trabajador || "propio",
        sede: editWorker.sede || "",
        empresa_contratista: editWorker.empresa_contratista || "",
        arl: editWorker.arl || "",
        eps: editWorker.eps || "",
        pension: editWorker.pension || "",
        caja_compensacion: editWorker.caja_compensacion || "",
        nombre_contacto_emergencia: editWorker.nombre_contacto_emergencia || "",
        celular_contacto_emergencia: editWorker.celular_contacto_emergencia || "",
        parentesco_contacto_emergencia: editWorker.parentesco_contacto_emergencia || "",
        email: editWorker.email || "",
        telefono: editWorker.telefono || "",
      });
    } else if (open && !editWorker) {
      setForm(emptyForm);
    }
    setTouched({});
    setSubmitted(false);
    setActiveTab("basicos");
  }, [open, editWorker]);

  const errors: Record<string, string> = {};
  if (form.nombres.trim().length < 2) errors.nombres = "Mínimo 2 caracteres";
  if (form.apellidos.trim().length < 2) errors.apellidos = "Mínimo 2 caracteres";
  if (!form.tipo_documento) errors.tipo_documento = "Requerido";
  if (form.numero_documento.trim().length < 6) errors.numero_documento = "Mínimo 6 caracteres";
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = "Email inválido";

  const isValid = Object.keys(errors).length === 0;
  const showError = (field: string) => (touched[field] || submitted) && errors[field];
  const resolvedEmpresaId = empresaId ?? empresa?.id ?? null;
  const set = (field: keyof WorkerData) => (val: any) => setForm(p => ({ ...p, [field]: val }));
  const blur = (field: string) => () => setTouched(p => ({ ...p, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) { setActiveTab("basicos"); return; }
    if (!resolvedEmpresaId) {
      toast({ title: "No se encontró tu empresa.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const docChanged = !isEdit
        || form.numero_documento.trim() !== editWorker?.numero_documento
        || form.tipo_documento !== editWorker?.tipo_documento;
      if (docChanged) {
        const { data: existing } = await (supabase as any)
          .from("trabajadores").select("id")
          .eq("empresa_id", resolvedEmpresaId)
          .eq("tipo_documento", form.tipo_documento)
          .eq("numero_documento", form.numero_documento.trim())
          .eq("eliminado", false)
          .maybeSingle();
        if (existing && existing.id !== editWorker?.id) {
          toast({
            title: "Ya existe un trabajador con esta cédula en tu empresa",
            description: `${form.tipo_documento} ${form.numero_documento.trim()} ya está registrado.`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }
      }


      const payload = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        tipo_documento: form.tipo_documento,
        numero_documento: form.numero_documento.trim(),
        fecha_nacimiento: form.fecha_nacimiento ? format(form.fecha_nacimiento, "yyyy-MM-dd") : null,
        genero: form.genero || null,
        rh: form.rh || null,
        pais: form.pais || "Colombia",
        ciudad: form.ciudad.trim() || null,
        departamento: form.departamento.trim() || null,
        direccion: form.direccion.trim() || null,
        ciudad_residencia: form.ciudad_residencia.trim() || null,
        cargo: form.cargo.trim() || null,
        tipo_contrato: form.tipo_contrato || null,
        fecha_ingreso: form.fecha_ingreso ? format(form.fecha_ingreso, "yyyy-MM-dd") : null,
        fecha_fin_contrato: form.fecha_fin_contrato ? format(form.fecha_fin_contrato, "yyyy-MM-dd") : null,
        tipo_trabajador: form.tipo_trabajador || "propio",
        sede: form.sede.trim() || null,
        empresa_contratista: form.empresa_contratista.trim() || null,
        arl: form.arl.trim() || null,
        eps: form.eps.trim() || null,
        pension: form.pension.trim() || null,
        caja_compensacion: form.caja_compensacion.trim() || null,
        nombre_contacto_emergencia: form.nombre_contacto_emergencia.trim() || null,
        celular_contacto_emergencia: form.celular_contacto_emergencia.trim() || null,
        parentesco_contacto_emergencia: form.parentesco_contacto_emergencia.trim() || null,
        email: form.email.trim().toLowerCase() || null,
        telefono: form.telefono.trim() || null,
      };

      if (isEdit) {
        const { data, error } = await supabase.from("trabajadores").update(payload).eq("id", editWorker!.id).select().single();
        if (error) {
          const isUnique = (error as any).code === "23505";
          toast({ title: isUnique ? "Ya existe un trabajador con esta cédula en tu empresa" : "Error al actualizar", description: isUnique ? undefined : error.message, variant: "destructive" });
        }
        else { toast({ title: "Trabajador actualizado correctamente." }); onOpenChange(false); onSuccess(data); }
      } else {
        const { data, error } = await supabase.from("trabajadores").insert({ ...payload, empresa_id: resolvedEmpresaId, estado: "pendiente" }).select().single();
        if (error) {
          const isUnique = (error as any).code === "23505";
          toast({ title: isUnique ? "Ya existe un trabajador con esta cédula en tu empresa" : "Error al guardar", description: isUnique ? undefined : error.message, variant: "destructive" });
        }
        else { toast({ title: `${form.nombres.trim()} agregado correctamente.` }); onOpenChange(false); setForm(emptyForm); onSuccess(data); }
      }

    } catch (err: any) {
      toast({ title: "Error inesperado", description: err?.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="add-worker-desc">
        <DialogHeader>
          <DialogTitle className="text-base font-medium">
            {isEdit ? "Editar Trabajador" : "Añadir Trabajador"}
          </DialogTitle>
          <p id="add-worker-desc" className="text-xs text-muted-foreground">
            {isEdit ? "Modifica los datos del trabajador." : "Completa los datos del nuevo trabajador."}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-8">
              <TabsTrigger value="basicos" className="text-xs">Básicos</TabsTrigger>
              <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
              <TabsTrigger value="laboral" className="text-xs">Laboral</TabsTrigger>
              <TabsTrigger value="afiliaciones" className="text-xs">Afiliaciones</TabsTrigger>
            </TabsList>

            {/* TAB 1 — BÁSICOS */}
            <TabsContent value="basicos" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Nombres *" error={showError("nombres")}>
                  <Input value={form.nombres} onChange={e => set("nombres")(e.target.value)} onBlur={blur("nombres")} className="h-8 text-xs" disabled={loading} />
                </FieldWrap>
                <FieldWrap label="Apellidos *" error={showError("apellidos")}>
                  <Input value={form.apellidos} onChange={e => set("apellidos")(e.target.value)} onBlur={blur("apellidos")} className="h-8 text-xs" disabled={loading} />
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Tipo Documento *" error={showError("tipo_documento")}>
                  <Select value={form.tipo_documento} onValueChange={v => { set("tipo_documento")(v); setTouched(p => ({ ...p, tipo_documento: true })); }} disabled={loading}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CC">CC - Cédula</SelectItem>
                      <SelectItem value="CE">CE - Cédula Extranjería</SelectItem>
                      <SelectItem value="TI">TI - Tarjeta Identidad</SelectItem>
                      <SelectItem value="PP">PP - Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Número Documento *" error={showError("numero_documento")}>
                  <Input value={form.numero_documento} onChange={e => set("numero_documento")(e.target.value.replace(/[^a-zA-Z0-9]/g, ""))} onBlur={blur("numero_documento")} className="h-8 text-xs" disabled={loading} />
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Email (opcional)" error={showError("email")}>
                  <Input value={form.email} onChange={e => set("email")(e.target.value)} onBlur={blur("email")} className="h-8 text-xs" disabled={loading} placeholder="correo@email.com" />
                </FieldWrap>
                <FieldWrap label="Teléfono (opcional)">
                  <Input value={form.telefono} onChange={e => set("telefono")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="3001234567" />
                </FieldWrap>
              </div>
            </TabsContent>

            {/* TAB 2 — PERSONAL */}
            <TabsContent value="personal" className="space-y-3 mt-3">
              <div className="grid grid-cols-3 gap-3">
                <FieldWrap label="Fecha Nacimiento">
                  <DatePicker value={form.fecha_nacimiento} onChange={set("fecha_nacimiento")} disabled={loading} />
                </FieldWrap>
                <FieldWrap label="Género">
                  <Select value={form.genero} onValueChange={set("genero")} disabled={loading}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="femenino">Femenino</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                      <SelectItem value="prefiero_no_decir">Prefiero no decir</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="RH">
                  <Select value={form.rh} onValueChange={set("rh")} disabled={loading}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Departamento">
                  <Input value={form.departamento} onChange={e => set("departamento")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Antioquia" />
                </FieldWrap>
                <FieldWrap label="Ciudad">
                  <Input value={form.ciudad} onChange={e => set("ciudad")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Medellín" />
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Ciudad Residencia">
                  <Input value={form.ciudad_residencia} onChange={e => set("ciudad_residencia")(e.target.value)} className="h-8 text-xs" disabled={loading} />
                </FieldWrap>
                <FieldWrap label="País">
                  <Input value={form.pais} onChange={e => set("pais")(e.target.value)} className="h-8 text-xs" disabled={loading} />
                </FieldWrap>
              </div>

              <FieldWrap label="Dirección">
                <Input value={form.direccion} onChange={e => set("direccion")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Calle, carrera, barrio..." />
              </FieldWrap>

              <div className="space-y-2">
                <p className="text-[11px] font-medium text-muted-foreground">Contacto de emergencia</p>
                <div className="grid grid-cols-3 gap-3">
                  <FieldWrap label="Nombre">
                    <Input value={form.nombre_contacto_emergencia} onChange={e => set("nombre_contacto_emergencia")(e.target.value)} className="h-8 text-xs" disabled={loading} />
                  </FieldWrap>
                  <FieldWrap label="Celular">
                    <Input value={form.celular_contacto_emergencia} onChange={e => set("celular_contacto_emergencia")(e.target.value)} className="h-8 text-xs" disabled={loading} />
                  </FieldWrap>
                  <FieldWrap label="Parentesco">
                    <Select value={form.parentesco_contacto_emergencia} onValueChange={set("parentesco_contacto_emergencia")} disabled={loading}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="conyuge">Cónyuge / Pareja</SelectItem>
                        <SelectItem value="padre_madre">Padre / Madre</SelectItem>
                        <SelectItem value="hijo_hija">Hijo / Hija</SelectItem>
                        <SelectItem value="hermano_hermana">Hermano / Hermana</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldWrap>
                </div>
              </div>
            </TabsContent>

            {/* TAB 3 — LABORAL */}
            <TabsContent value="laboral" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Cargo">
                  <Input value={form.cargo} onChange={e => set("cargo")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Operador, Administrativo" />
                </FieldWrap>
                <FieldWrap label="Tipo Trabajador">
                  <Select value={form.tipo_trabajador} onValueChange={set("tipo_trabajador")} disabled={loading}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="propio">Propio</SelectItem>
                      <SelectItem value="contratista">Contratista</SelectItem>
                      <SelectItem value="visitante">Visitante</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Tipo Contrato">
                  <Select value={form.tipo_contrato} onValueChange={set("tipo_contrato")} disabled={loading}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indefinido">Indefinido</SelectItem>
                      <SelectItem value="fijo">Fijo</SelectItem>
                      <SelectItem value="obra">Obra o labor</SelectItem>
                      <SelectItem value="aprendiz">Aprendiz</SelectItem>
                      <SelectItem value="prestacion">Prestación de servicios</SelectItem>
                    </SelectContent>
                  </Select>
                </FieldWrap>
                <FieldWrap label="Sede">
                  <Input value={form.sede} onChange={e => set("sede")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Sede principal" />
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Fecha Ingreso">
                  <DatePicker value={form.fecha_ingreso} onChange={set("fecha_ingreso")} disabled={loading} />
                </FieldWrap>
                <FieldWrap label="Fecha Fin Contrato">
                  <DatePicker value={form.fecha_fin_contrato} onChange={set("fecha_fin_contrato")} disabled={loading} />
                </FieldWrap>
              </div>

              {form.tipo_trabajador === "contratista" && (
                <FieldWrap label="Empresa Contratista">
                  <Input value={form.empresa_contratista} onChange={e => set("empresa_contratista")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Nombre de la empresa contratista" />
                </FieldWrap>
              )}
            </TabsContent>

            {/* TAB 4 — AFILIACIONES */}
            <TabsContent value="afiliaciones" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="ARL">
                  <Input value={form.arl} onChange={e => set("arl")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Sura, Positiva, Colmena" />
                </FieldWrap>
                <FieldWrap label="EPS">
                  <Input value={form.eps} onChange={e => set("eps")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Sura, Nueva EPS, Sanitas" />
                </FieldWrap>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FieldWrap label="Pensión">
                  <Input value={form.pension} onChange={e => set("pension")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Colpensiones, Porvenir" />
                </FieldWrap>
                <FieldWrap label="Caja de Compensación">
                  <Input value={form.caja_compensacion} onChange={e => set("caja_compensacion")(e.target.value)} className="h-8 text-xs" disabled={loading} placeholder="Ej: Compensar, Colsubsidio" />
                </FieldWrap>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-[11px] text-muted-foreground">
                  💡 Los documentos de afiliación (planillas, certificados) se cargan desde el módulo de Documentos del trabajador.
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Botones */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {["basicos","personal","laboral","afiliaciones"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={cn("w-2 h-2 rounded-full transition-colors", activeTab === tab ? "bg-primary" : "bg-muted-foreground/30")}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs h-8" disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || (!isValid && submitted)} className={cn("text-xs h-8", !isValid && submitted && "opacity-50 cursor-not-allowed")}>
                {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> Guardando...</> : isEdit ? "Actualizar" : "Guardar Trabajador"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DatePicker({ value, onChange, disabled }: { value: Date | undefined; onChange: (d: Date | undefined) => void; disabled?: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("h-8 text-xs w-full justify-start font-normal", !value && "text-muted-foreground")} disabled={disabled}>
          <CalendarIcon className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
          {value ? format(value, "dd MMM yyyy", { locale: es }) : "Seleccionar"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={value} onSelect={onChange} initialFocus className="p-3 pointer-events-auto" />
      </PopoverContent>
    </Popover>
  );
}

function FieldWrap({ label, error, children }: { label: string; error?: string | false; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  );
}
