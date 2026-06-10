import { useState, useEffect } from "react";
import logoSstlink from "@/assets/logo-sstlink.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { StepIndicator } from "@/components/auth/StepIndicator";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { z } from "zod";

const STEPS = ["Empresa", "Administrador", "Detalles SST", "Confirmación"];

const nitRegex = /^[0-9-]+$/;

const step1Schema = z.object({
  nit: z.string().trim().min(1, "El NIT es requerido").max(20)
    .refine((val) => nitRegex.test(val), "Solo se permiten números y guiones (sin puntos)")
    .refine((val) => /\d/.test(val), "Debe contener al menos un número"),
  nombre: z.string().trim().min(1, "La razón social es requerida").max(200),
  sector: z.string().trim().min(1, "El sector es requerido").max(100),
});

const step2Schema = z.object({
  fullName: z.string().trim().min(1, "El nombre es requerido").max(200),
  email: z.string().trim().email("Correo electrónico inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

const step3Schema = z.object({
  numEmpleados: z.number().int().min(1, "Mínimo 1 empleado"),
  tieneContratistas: z.boolean(),
});

function describeAuthError(err: any): { title: string; description: string } {
  const msg = String(err?.message ?? "");
  const code = String(err?.code ?? "");
  if (
    code === "user_already_exists" ||
    /user already registered|already registered|already exists/i.test(msg)
  ) {
    return {
      title: "Correo ya registrado",
      description: "Este correo ya tiene una cuenta. Inicia sesión o usa otro correo.",
    };
  }
  return { title: "Error en el registro", description: msg || "No se pudo completar el registro." };
}

export default function Register() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Proveedor invite mode
  const provToken = searchParams.get("prov");
  const [provData, setProvData] = useState<{ nombre: string; nit: string | null; email: string | null; empresa_cliente_id: string } | null>(null);
  const [provTokenValid, setProvTokenValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!provToken) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("proveedores")
        .select("nombre, nit, email, empresa_id")
        .eq("invite_token", provToken)
        .single();
      if (data) {
        setProvData({ nombre: data.nombre, nit: data.nit, email: data.email, empresa_cliente_id: data.empresa_id });
        setNombre(data.nombre ?? "");
        setNit(data.nit ?? "");
        setProvTokenValid(true);
      } else {
        setProvTokenValid(false);
      }
    })();
  }, [provToken]);

  // Team invite mode
  const invToken = searchParams.get("inv");
  const [invEmpresaNombre, setInvEmpresaNombre] = useState<string | null>(null);
  const [invRol, setInvRol] = useState<string | null>(null);
  const [invValid, setInvValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!invToken) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("invitaciones")
        .select("rol, estado, empresas(nombre)")
        .eq("token", invToken)
        .eq("estado", "pendiente")
        .single();
      if (data) {
        setInvRol(data.rol);
        setInvEmpresaNombre(data.empresas?.nombre ?? null);
        setInvValid(true);
      } else {
        setInvValid(false);
      }
    })();
  }, [invToken]);

  // Step 1
  const [nit, setNit] = useState("");
  const [nombre, setNombre] = useState("");
  const [sector, setSector] = useState("");

  // Step 2
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 3
  const [numEmpleados, setNumEmpleados] = useState("");
  const [tieneContratistas, setTieneContratistas] = useState(false);

  const validateStep = (): boolean => {
    setErrors({});
    let result;

    if (step === 0) {
      result = step1Schema.safeParse({ nit, nombre, sector });
    } else if (step === 1) {
      result = step2Schema.safeParse({ fullName, email, password });
    } else if (step === 2) {
      result = step3Schema.safeParse({
        numEmpleados: parseInt(numEmpleados) || 0,
        tieneContratistas,
      });
    } else {
      return true;
    }

    if (result && !result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    return true;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    if (step === 0 && nit.trim()) {
      const { data: existing } = await (supabase as any)
        .rpc("find_empresa_by_nit", { p_nit: nit.trim() });
      const match = Array.isArray(existing) ? existing[0] : existing;
      if (match) {
        setErrors({ nit: `Ya existe una empresa registrada con este NIT (${match.nombre}). Si eres proveedor invitado, usa el enlace que te enviaron.` });
        return;
      }
    }
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: fullName,
            empresa_nombre: nombre,
            empresa_nit: nit,
            empresa_sector: sector,
            empresa_num_empleados: String(parseInt(numEmpleados) || 0),
            empresa_tiene_contratistas: String(tieneContratistas),
          },
        },
      });
      if (authError) throw authError;

      const authUserId = authData.user?.id;
      if (!authUserId) {
        throw new Error("No se pudo crear la sesión inicial del usuario.");
      }

      const { data: empresaData, error: empresaError } = await supabase
        .from("empresas")
        .insert({
          nombre,
          nit,
          sector_industria: sector,
          num_empleados_directos: parseInt(numEmpleados) || 0,
          tiene_contratistas: tieneContratistas,
        })
        .select("id")
        .single();

      if (empresaError || !empresaData) throw empresaError ?? new Error("No se pudo crear la empresa.");

      const [firstName, ...restName] = fullName.trim().split(" ").filter(Boolean);
      const apellido = restName.join(" ") || null;

      const { error: usuarioError } = await supabase
        .from("usuarios")
        .insert({
          user_id: authUserId,
          auth_user_id: authUserId,
          empresa_id: empresaData.id,
          nombre: firstName || fullName.trim(),
          apellido,
          nombre_completo: fullName.trim(),
          email: email.trim().toLowerCase(),
          rol: "administrador",
        });

      if (usuarioError) throw usuarioError;

      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authUserId, role: "administrador" });

      if (roleError) throw roleError;

      // Si el trigger creó solicitudes de enlace automáticamente, avisar
      try {
        const { count } = await (supabase as any)
          .from("solicitudes_enlace")
          .select("id", { count: "exact", head: true })
          .eq("empresa_proveedor_id", empresaData.id)
          .eq("estado", "pendiente");
        if ((count ?? 0) > 0) {
          toast({
            title: "Solicitudes de enlace pendientes",
            description: "Tu empresa ya tiene solicitudes de enlace pendientes. Revísalas en Mi Empresa.",
          });
        }
      } catch { /* no-op */ }

      setSuccess(true);
    } catch (err: any) {
      const { title, description } = describeAuthError(err);
      toast({ title, description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Invite mode finish ────────────────────────────────────────────────────
  const handleFinishInvite = async () => {
    const r = step2Schema.safeParse({ fullName, email, password });
    if (!r.success) {
      const fe: Record<string, string> = {};
      r.error.errors.forEach(e => { if (e.path[0]) fe[e.path[0] as string] = e.message; });
      setErrors(fe);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre: fullName, invite_token: invToken } },
      });
      if (authError) throw authError;
      const authUserId = authData.user?.id;
      if (!authUserId) throw new Error("No se pudo crear la sesión.");

      // Look up invitation (user now has a session)
      const { data: inv, error: invErr } = await (supabase as any)
        .from("invitaciones")
        .select("empresa_id, rol")
        .eq("token", invToken)
        .eq("estado", "pendiente")
        .single();
      if (invErr || !inv) throw new Error("La invitación ya no es válida.");

      const [firstName, ...rest] = fullName.trim().split(" ").filter(Boolean);
      const apellido = rest.join(" ") || null;

      const { error: uErr } = await supabase.from("usuarios").insert({
        user_id: authUserId,
        auth_user_id: authUserId,
        empresa_id: inv.empresa_id,
        nombre: firstName || fullName.trim(),
        apellido,
        nombre_completo: fullName.trim(),
        email: email.trim().toLowerCase(),
        rol: inv.rol,
      });
      if (uErr) throw uErr;

      await supabase.from("user_roles").insert({ user_id: authUserId, role: inv.rol });
      await (supabase as any)
        .from("invitaciones")
        .update({ estado: "aceptada", accepted_at: new Date().toISOString() })
        .eq("token", invToken);

      setSuccess(true);
    } catch (err: any) {
      const { title, description } = describeAuthError(err);
      toast({ title, description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ── Proveedor invite: invalid token ───────────────────────────────────────
  if (provToken && provTokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-card rounded-xl border-[0.5px] border-border p-8">
            <p className="text-sm text-destructive font-medium mb-4">Este enlace de invitación no es válido o ya fue usado.</p>
            <Button variant="outline" onClick={() => navigate("/login")}>Ir al inicio de sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Proveedor invite: registration ─────────────────────────────────────────
  if (provToken && provTokenValid === true) {
    const handleFinishProv = async () => {
      const r = step2Schema.safeParse({ fullName, email, password });
      if (!r.success) {
        const fe: Record<string, string> = {};
        r.error.errors.forEach(e => { if (e.path[0]) fe[e.path[0] as string] = e.message; });
        setErrors(fe);
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { data: { nombre: fullName, empresa_nombre: provData!.nombre, empresa_nit: provData!.nit ?? "" } },
        });
        if (authError) throw authError;
        const authUserId = authData.user?.id;
        if (!authUserId) throw new Error("No se pudo crear la sesión.");

        const { data: empresaCreada, error: empErr } = await supabase
          .from("empresas")
          .insert({ nombre: provData!.nombre, nit: provData!.nit })
          .select("id").single();
        if (empErr || !empresaCreada) throw empErr ?? new Error("No se pudo crear la empresa.");

        await (supabase as any).from("empresas").update({ plan: "free", limite_trabajadores: 11 }).eq("id", empresaCreada.id);

        const [firstName, ...rest] = fullName.trim().split(" ").filter(Boolean);
        await supabase.from("usuarios").insert({
          user_id: authUserId, auth_user_id: authUserId,
          empresa_id: empresaCreada.id,
          nombre: firstName || fullName.trim(),
          apellido: rest.join(" ") || null,
          nombre_completo: fullName.trim(),
          email: email.trim().toLowerCase(),
          rol: "administrador",
        });
        await supabase.from("user_roles").insert({ user_id: authUserId, role: "administrador" });
        await (supabase as any).from("proveedores")
          .update({ empresa_proveedor_id: empresaCreada.id, invite_token: null })
          .eq("invite_token", provToken);

        setSuccess(true);
      } catch (err: any) {
        const { title, description } = describeAuthError(err);
        toast({ title, description, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={logoSstlink} alt="SSTLink" className="h-10 w-auto" />
          </div>
          {success ? (
            <div className="bg-card rounded-xl border-[0.5px] border-border p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              </div>
              <h1 className="text-lg font-medium mb-2">¡Cuenta creada!</h1>
              <p className="text-sm text-muted-foreground mb-6">Tu empresa quedó registrada. Revisa tu correo para confirmar tu cuenta.</p>
              <Button onClick={() => navigate("/login")} className="w-full">Ir al inicio de sesión</Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border-[0.5px] border-border p-6 space-y-5">
              <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium">Registro como proveedor</p>
                  <p className="text-[12px] text-muted-foreground">{provData?.nombre}</p>
                  {provData?.nit && <p className="text-[11px] text-muted-foreground">NIT: {provData.nit}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tu nombre completo</Label>
                <Input placeholder="Nombre del administrador" value={fullName} onChange={e => setFullName(e.target.value)} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input type="email" placeholder="tu@empresa.com" value={email} onChange={e => setEmail(e.target.value)} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contraseña</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <p className="text-[10px] text-muted-foreground">Obtendrás un plan gratuito con acceso limitado. Tu empresa quedará vinculada automáticamente como proveedor.</p>
              <Button onClick={handleFinishProv} disabled={loading} className="w-full">
                {loading ? "Creando cuenta…" : "Crear mi cuenta"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Invite mode: invalid token ─────────────────────────────────────────────
  if (invToken && invValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-card rounded-xl border-[0.5px] border-border p-8">
            <p className="text-sm text-destructive font-medium mb-4">Esta invitación no es válida o ya fue usada.</p>
            <Button variant="outline" onClick={() => navigate("/login")}>Ir al inicio de sesión</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Invite mode: simplified registration ───────────────────────────────────
  if (invToken && invValid === true) {
    const ROL_LABEL: Record<string, string> = { administrador: "Administrador", asistente: "Asistente", lector: "Lector" };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <img src={logoSstlink} alt="SSTLink" className="h-10 w-auto" />
          </div>
          {success ? (
            <div className="bg-card rounded-xl border-[0.5px] border-border p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-secondary" />
              </div>
              <h1 className="text-lg font-medium mb-2">¡Bienvenido al equipo!</h1>
              <p className="text-sm text-muted-foreground mb-6">Tu cuenta fue creada. Revisa tu correo para confirmarla antes de iniciar sesión.</p>
              <Button onClick={() => navigate("/login")} className="w-full">Ir al inicio de sesión</Button>
            </div>
          ) : (
            <div className="bg-card rounded-xl border-[0.5px] border-border p-6 space-y-5">
              <div className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-[13px] font-medium">Fuiste invitado a unirte</p>
                  {invEmpresaNombre && <p className="text-[12px] text-muted-foreground">{invEmpresaNombre}</p>}
                  {invRol && <p className="text-[11px] text-muted-foreground">Rol: {ROL_LABEL[invRol] ?? invRol}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre completo</Label>
                <Input placeholder="Tu nombre" value={fullName} onChange={e => setFullName(e.target.value)} />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input type="email" placeholder="tu@correo.com" value={email} onChange={e => setEmail(e.target.value)} />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contraseña</Label>
                <Input type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <Button onClick={handleFinishInvite} disabled={loading} className="w-full">
                {loading ? "Creando cuenta…" : "Unirme al equipo"}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm text-center">
          <div className="bg-card rounded-xl border-[0.5px] border-border p-8">
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-lg font-medium text-foreground mb-2">¡Cuenta creada exitosamente!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Ir al inicio de sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <img src={logoSstlink} alt="SSTLink" className="h-10 w-auto" />
        </div>

        <div className="bg-card rounded-xl border-[0.5px] border-border p-6">
          <StepIndicator steps={STEPS} currentStep={step} />

          {/* Step 1: Company */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Datos de la empresa</h2>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">NIT</Label>
                <Input
                  placeholder="900123456-7"
                  value={nit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\./g, "");
                    setNit(val);
                  }}
                  maxLength={20}
                />
                <p className="text-[10px] text-muted-foreground/70">
                  Ingresa el NIT sin puntos y con el dígito de verificación (Ej: 900123456-7)
                </p>
                {errors.nit && <p className="text-xs text-destructive">{errors.nit}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Razón social</Label>
                <Input
                  placeholder="Nombre legal de la empresa"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  maxLength={200}
                />
                {errors.nombre && <p className="text-xs text-destructive">{errors.nombre}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sector de la industria</Label>
                <Input
                  placeholder="Ej: Construcción, Manufactura..."
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  maxLength={100}
                />
                {errors.sector && <p className="text-xs text-destructive">{errors.sector}</p>}
              </div>
            </div>
          )}

          {/* Step 2: Admin account */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Cuenta del administrador</h2>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre completo</Label>
                <Input
                  placeholder="Juan Carlos Pérez"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={200}
                />
                {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Correo electrónico</Label>
                <Input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Contraseña</Label>
                <Input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={128}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
            </div>
          )}

          {/* Step 3: SST Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Detalles SST</h2>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Número de empleados directos</Label>
                <Input
                  type="number"
                  placeholder="Ej: 50"
                  value={numEmpleados}
                  onChange={(e) => setNumEmpleados(e.target.value)}
                  min={1}
                />
                {errors.numEmpleados && <p className="text-xs text-destructive">{errors.numEmpleados}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">¿Tiene contratistas o proveedores?</Label>
                <div className="flex gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setTieneContratistas(true)}
                    className={`flex-1 py-2.5 rounded-lg border-[0.5px] text-sm transition-colors ${
                      tieneContratistas
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    Sí
                  </button>
                  <button
                    type="button"
                    onClick={() => setTieneContratistas(false)}
                    className={`flex-1 py-2.5 rounded-lg border-[0.5px] text-sm transition-colors ${
                      !tieneContratistas
                        ? "border-primary bg-accent text-accent-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-base font-medium text-foreground">Confirmar registro</h2>
              <p className="text-sm text-muted-foreground">Revisa los datos antes de crear tu cuenta.</p>

              <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Empresa</span>
                  <p className="text-sm text-foreground">{nombre}</p>
                  <p className="text-xs text-muted-foreground">NIT: {nit} · {sector}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Administrador</span>
                  <p className="text-sm text-foreground">{fullName}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                </div>
                <div className="border-t border-border pt-3">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">SST</span>
                  <p className="text-xs text-muted-foreground">
                    {numEmpleados} empleados · {tieneContratistas ? "Con contratistas" : "Sin contratistas"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Atrás
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={handleNext} className="flex-1">
                Siguiente
              </Button>
            ) : (
              <Button onClick={handleFinish} disabled={loading} className="flex-1">
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-sm text-center text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
