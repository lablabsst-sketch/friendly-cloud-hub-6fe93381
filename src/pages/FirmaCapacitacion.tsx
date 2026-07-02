import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SignaturePad, { SignaturePadHandle } from "@/components/capacitaciones/SignaturePad";
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

type Step = "loading" | "verify" | "sign" | "done" | "already_signed" | "error";

interface AsistenciaData {
  id: string;
  firma_token: string;
  tipo_asistente: string;
  trabajador_id: string | null;
  empleado_contratista_id: string | null;
  firma_url: string | null;
  firmado_en: string | null;
  capacitacion: {
    id: string;
    titulo: string;
    fecha: string;
    duracion_horas: number | null;
    modalidad: string;
    responsable: string | null;
    descripcion: string | null;
    link_reunion: string | null;
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FirmaCapacitacion() {
  const [params] = useSearchParams();
  const token = params.get("t");

  const [step, setStep] = useState<Step>("loading");
  const [asistencia, setAsistencia] = useState<AsistenciaData | null>(null);
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [docError, setDocError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sigError, setSigError] = useState("");

  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    if (!token) { setStep("error"); return; }
    loadAsistencia();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Load ──────────────────────────────────────────────────────────────────

  const loadAsistencia = async () => {
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
    if (data.firma_url) { setStep("already_signed"); return; }
    setStep("verify");
  };

  // ─── Verify document ───────────────────────────────────────────────────────

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
    if (!asistencia || !padRef.current) return;
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
        body: { firma_token: token, dataURL },
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
          {step === "already_signed" && asistencia && (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-semibold text-green-700">Ya firmaste esta capacitación</p>
                <p className="text-sm text-muted-foreground">
                  <strong>{asistencia.capacitacion.titulo}</strong><br />
                  Tu asistencia fue confirmada el{" "}
                  {asistencia.firmado_en
                    ? new Date(asistencia.firmado_en).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })
                    : ""}
                </p>
              </CardContent>
            </Card>
          )}

          {/* ── Verify ── */}
          {(step === "verify" || step === "sign") && asistencia && (
            <>
              {/* Training info card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-indigo-100 p-1.5">
                      <GraduationCap className="h-4 w-4 text-indigo-600" />
                    </div>
                    <CardTitle className="text-base">{asistencia.capacitacion.titulo}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{formatFecha(asistencia.capacitacion.fecha)}</span>
                    </div>
                    {asistencia.capacitacion.duracion_horas && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{asistencia.capacitacion.duracion_horas}h</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
                      {asistencia.capacitacion.modalidad === "virtual"
                        ? <Monitor className="h-3.5 w-3.5 flex-shrink-0" />
                        : <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                      }
                      <span className="capitalize">{asistencia.capacitacion.modalidad}</span>
                      {asistencia.capacitacion.responsable && (
                        <span className="text-muted-foreground/60 ml-1">· {asistencia.capacitacion.responsable}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step: verify document */}
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
            <Card>
              <CardContent className="py-16 flex flex-col items-center gap-4 text-center">
                <div className="rounded-full bg-green-100 p-4">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-green-700">¡Asistencia confirmada!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tu firma ha sido registrada exitosamente.<br />
                    Puedes cerrar esta ventana.
                  </p>
                </div>
                {asistencia && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
                    <strong>{asistencia.capacitacion.titulo}</strong><br />
                    {formatFecha(asistencia.capacitacion.fecha)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <footer className="py-4 text-center text-[11px] text-muted-foreground/60">
        SSTLink · Gestión de Seguridad y Salud en el Trabajo
      </footer>
    </div>
  );
}
