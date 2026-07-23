import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SignaturePad, { SignaturePadHandle } from "@/components/capacitaciones/SignaturePad";
import { EvaluacionQuiz } from "@/components/capacitaciones/EvaluacionQuiz";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoSstlink from "@/assets/logo-sstlink.png";
import {
  CheckCircle2, GraduationCap, Loader2, AlertCircle,
  Calendar, Clock, Monitor, Building2, PenLine,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "loading" | "verify" | "cedula" | "sign" | "done" | "already_signed" | "error";

interface CapacitacionInfo {
  id: string;
  titulo: string;
  fecha: string;
  duracion_horas: number | null;
  modalidad: string;
  responsable: string | null;
  descripcion: string | null;
  link_reunion: string | null;
}

interface AsistenciaData {
  id: string;
  firma_token: string;
  tipo_asistente: string;
  trabajador_id: string | null;
  empleado_contratista_id: string | null;
  firma_url: string | null;
  firmado_en: string | null;
  capacitacion: CapacitacionInfo;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FirmaCapacitacion() {
  const [params] = useSearchParams();
  const tokenIndividual = params.get("t");
  const tokenGeneral = params.get("c");

  const [step, setStep] = useState<Step>("loading");
  const [asistencia, setAsistencia] = useState<AsistenciaData | null>(null);
  const [capacitacionInfo, setCapacitacionInfo] = useState<CapacitacionInfo | null>(null);
  const [cerrada, setCerrada] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // firma_token used for submit-firma + evaluation (either from ?t= or resolved from cédula)
  const [firmaToken, setFirmaToken] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [docError, setDocError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sigError, setSigError] = useState("");

  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (tokenIndividual) {
      setFirmaToken(tokenIndividual);
      loadAsistenciaIndividual(tokenIndividual);
    } else if (tokenGeneral) {
      loadCapacitacionGeneral(tokenGeneral);
    } else {
      setStep("error");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Individual link (?t=) ─────────────────────────────────────────────────

  const loadAsistenciaIndividual = async (token: string) => {
    const { data, error } = await (supabase as any)
      .from("asistencia_capacitacion")
      .select(`
        id, firma_token, tipo_asistente, trabajador_id, empleado_contratista_id, firma_url, firmado_en,
        capacitacion:capacitaciones(id, titulo, fecha, duracion_horas, modalidad, responsable, descripcion, link_reunion)
      `)
      .eq("firma_token", token)
      .single();

    if (error || !data) { setStep("error"); return; }
    setAsistencia(data as AsistenciaData);
    setCapacitacionInfo((data as AsistenciaData).capacitacion);
    if (data.firma_url) { setStep("already_signed"); return; }
    setStep("verify");
  };

  // ─── General link (?c=) ────────────────────────────────────────────────────

  const loadCapacitacionGeneral = async (linkToken: string) => {
    const { data, error } = await (supabase as any).rpc("get_capacitacion_by_link_token", {
      p_link_token: linkToken,
    });
    if (error || !data) { setStep("error"); return; }
    setCapacitacionInfo({
      id: data.id,
      titulo: data.titulo,
      fecha: data.fecha,
      duracion_horas: data.duracion_horas,
      modalidad: data.modalidad,
      responsable: data.responsable,
      descripcion: data.descripcion,
      link_reunion: data.link_reunion,
    });
    setCerrada(!!data.cerrada);
    setStep("cedula");
  };

  const submitCedula = async () => {
    if (!tokenGeneral || !documento.trim()) return;
    setDocError("");
    setVerifying(true);
    try {
      const { data, error } = await (supabase as any).rpc("registrar_asistencia_por_cedula", {
        p_link_token: tokenGeneral,
        p_numero_documento: documento.trim(),
      });
      if (error) throw error;
      const res = data as { firma_token: string; nombre: string; ya_firmo: boolean };
      setFirmaToken(res.firma_token);
      setNombre(res.nombre);
      if (res.ya_firmo) {
        setStep("already_signed");
      } else {
        setStep("sign");
      }
    } catch (e: any) {
      setDocError(e.message ?? "No se pudo verificar el documento.");
    }
    setVerifying(false);
  };

  // ─── Verify document (individual link flow) ────────────────────────────────

  const verifyDocument = async () => {
    if (!asistencia || !documento.trim()) return;
    setDocError("");
    setVerifying(true);

    const docClean = documento.trim().replace(/\D/g, "");

    try {
      if (asistencia.tipo_asistente === "trabajador" && asistencia.trabajador_id) {
        const { data } = await supabase
          .from("trabajadores")
          .select("numero_documento, nombres, apellidos")
          .eq("id", asistencia.trabajador_id)
          .single();

        if (!data) { setDocError("No se encontró el registro."); setVerifying(false); return; }
        const stored = (data.numero_documento ?? "").replace(/\D/g, "");
        if (stored !== docClean) { setDocError("El número de documento no coincide. Verifícalo e intenta de nuevo."); setVerifying(false); return; }
        setNombre(`${data.nombres} ${data.apellidos}`);
      } else if (asistencia.tipo_asistente === "contratista" && asistencia.empleado_contratista_id) {
        const { data } = await (supabase as any)
          .from("empleados_contratista")
          .select("numero_documento, nombres, apellidos")
          .eq("id", asistencia.empleado_contratista_id)
          .single();

        if (!data) { setDocError("No se encontró el registro."); setVerifying(false); return; }
        const stored = (data.numero_documento ?? "").replace(/\D/g, "");
        if (stored !== docClean) { setDocError("El número de documento no coincide. Verifícalo e intenta de nuevo."); setVerifying(false); return; }
        setNombre(`${data.nombres} ${data.apellidos}`);
      } else {
        setDocError("Error al verificar. Contacta al administrador.");
        setVerifying(false);
        return;
      }

      setStep("sign");
    } catch {
      setDocError("Ocurrió un error. Intenta de nuevo.");
    }
    setVerifying(false);
  };

  // ─── Submit signature ──────────────────────────────────────────────────────

  const submitFirma = async () => {
    if (!firmaToken || !padRef.current) return;
    setSigError("");

    if (padRef.current.isEmpty()) {
      setSigError("Por favor dibuja tu firma antes de confirmar.");
      return;
    }

    setUploading(true);

    const dataURL = padRef.current.getDataURL();
    if (!dataURL) { setUploading(false); return; }

    try {
      const { data, error } = await supabase.functions.invoke("submit-firma", {
        body: { firma_token: firmaToken, dataURL },
      });
      if (error) throw error;
      if (data && (data as any).error) throw new Error((data as any).error);
      setStep("done");
    } catch (err) {
      console.error(err);
      setSigError("No se pudo guardar la firma. Intenta de nuevo.");
    }

    setUploading(false);
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const formatFecha = (fecha: string) =>
    new Date(fecha + "T12:00:00").toLocaleDateString("es-CO", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-2.5">
        <img src={logoSstlink} alt="SSTLink" className="h-7 w-7 object-contain" />
        <span className="font-semibold text-sm text-foreground">SSTLink</span>
        <span className="text-border mx-1">·</span>
        <span className="text-sm text-muted-foreground">Firma digital de asistencia</span>
      </header>

      <main className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-md space-y-4">

          {/* ── Loading ── */}
          {step === "loading" && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Cargando información…</p>
              </CardContent>
            </Card>
          )}

          {/* ── Error ── */}
          {step === "error" && (
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <p className="font-semibold">Enlace no válido</p>
                <p className="text-sm text-muted-foreground">
                  Este enlace de firma no existe o ya no está disponible.<br />
                  Contacta al responsable de la capacitación.
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Already signed ── */}
          {step === "already_signed" && capacitacionInfo && (
            <>
              <Card>
                <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
                  <div className="rounded-full bg-green-100 p-3">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="font-semibold text-green-700">Ya firmaste esta capacitación</p>
                  <p className="text-sm text-muted-foreground">
                    <strong>{capacitacionInfo.titulo}</strong>
                    {asistencia?.firmado_en && (
                      <>
                        <br />
                        Tu asistencia fue confirmada el{" "}
                        {new Date(asistencia.firmado_en).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                      </>
                    )}
                  </p>
                </CardContent>
              </Card>
              {firmaToken && <EvaluacionQuiz firmaToken={firmaToken} />}
            </>
          )}

          {/* ── Info card + step ── */}
          {(step === "verify" || step === "sign" || step === "cedula") && capacitacionInfo && (
            <>
              {/* Training info card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-indigo-100 p-1.5">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-base">{capacitacionInfo.titulo}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{formatFecha(capacitacionInfo.fecha)}</span>
                    </div>
                    {capacitacionInfo.duracion_horas && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{capacitacionInfo.duracion_horas}h</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      {capacitacionInfo.modalidad === "virtual"
                        ? <Monitor className="h-3.5 w-3.5 flex-shrink-0" />
                        : <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      }
                      <span className="capitalize">{capacitacionInfo.modalidad}</span>
                      {capacitacionInfo.responsable && (
                        <span className="text-muted-foreground/60 ml-1">· {capacitacionInfo.responsable}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step: cédula (general link) */}
              {step === "cedula" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Registrar asistencia</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ingresa tu número de cédula para firmar esta capacitación.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cerrada && (
                      <p className="text-xs text-red-600 flex items-center gap-1 bg-red-50 p-2 rounded">
                        <AlertCircle className="h-3 w-3" />
                        Esta capacitación está cerrada.
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="ced">Número de documento</Label>
                      <Input
                        id="ced"
                        value={documento}
                        onChange={(e) => { setDocumento(e.target.value); setDocError(""); }}
                        placeholder="Ej: 1234567890"
                        onKeyDown={(e) => e.key === "Enter" && submitCedula()}
                        autoFocus
                        disabled={cerrada}
                      />
                      {docError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{docError}
                        </p>
                      )}
                    </div>
                    <Button className="w-full" onClick={submitCedula} disabled={verifying || !documento.trim() || cerrada}>
                      {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando…</> : "Continuar"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step: verify document (individual link) */}
              {step === "verify" && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Verificar identidad</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Ingresa tu número de documento de identidad para continuar.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="doc">Número de documento</Label>
                      <Input
                        id="doc"
                        value={documento}
                        onChange={(e) => { setDocumento(e.target.value); setDocError(""); }}
                        placeholder="Ej: 1234567890"
                        onKeyDown={(e) => e.key === "Enter" && verifyDocument()}
                        autoFocus
                      />
                      {docError && (
                        <p className="text-xs text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />{docError}
                        </p>
                      )}
                    </div>
                    <Button className="w-full" onClick={verifyDocument} disabled={verifying || !documento.trim()}>
                      {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando…</> : "Continuar"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Step: sign */}
              {step === "sign" && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <PenLine className="h-4 w-4 text-indigo-500" />
                      <CardTitle className="text-base">Firma tu asistencia</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Hola <strong>{nombre}</strong>, dibuja tu firma en el recuadro para confirmar tu participación.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <SignaturePad ref={padRef} width={440} height={180} />
                    {sigError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{sigError}
                      </p>
                    )}
                    <Button className="w-full" onClick={submitFirma} disabled={uploading}>
                      {uploading
                        ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando firma…</>
                        : "Confirmar asistencia"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Al firmar confirmas tu participación en esta capacitación.
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Done ── */}
          {step === "done" && (
            <>
              <Card>
                <CardContent className="py-10 flex flex-col items-center gap-4 text-center">
                  <div className="rounded-full bg-green-100 p-4">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-green-700">¡Asistencia confirmada!</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tu firma ha sido registrada exitosamente.
                    </p>
                  </div>
                  {capacitacionInfo && (
                    <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                      <strong>{capacitacionInfo.titulo}</strong><br />
                      {formatFecha(capacitacionInfo.fecha)}
                    </div>
                  )}
                </CardContent>
              </Card>
              {firmaToken && <EvaluacionQuiz firmaToken={firmaToken} />}
            </>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-muted-foreground/60">
        SSTLink · Gestión de Seguridad y Salud en el Trabajo
      </footer>
    </div>
  );
}
