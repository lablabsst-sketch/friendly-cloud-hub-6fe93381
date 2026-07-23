import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ClipboardList, Loader2, AlertCircle, CheckCircle2, RotateCcw,
  Award, XCircle,
} from "lucide-react";

type Tipo = "si_no" | "multiple";

interface Pregunta {
  id: string;
  orden: number;
  enunciado: string;
  tipo: Tipo;
  opciones: string[] | null;
}

interface EvalData {
  tiene_evaluacion: boolean;
  preguntas: Pregunta[];
  intentos_usados: number;
  max_intentos: number;
  mejor_puntaje: number | null;
  cerrada: boolean;
}

interface Resultado {
  puntaje: number;
  correctas: number;
  total: number;
  numero_intento: number;
  intentos_restantes: number;
  mejor_puntaje: number;
}

interface Props {
  firmaToken: string;
}

const db = supabase as any;

export function EvaluacionQuiz({ firmaToken }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EvalData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data: d, error: err } = await db.rpc("get_evaluacion_by_firma_token", {
      p_firma_token: firmaToken,
    });
    if (err) {
      setError(err.message);
    } else {
      setData(d as EvalData | null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (firmaToken) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaToken]);

  const setAnswer = (preguntaId: string, respuesta: string) => {
    setAnswers((prev) => ({ ...prev, [preguntaId]: respuesta }));
  };

  const startRetry = () => {
    setResultado(null);
    setAnswers({});
    load();
  };

  const submit = async () => {
    if (!data) return;
    const missing = data.preguntas.some((p) => !answers[p.id]);
    if (missing) {
      setError("Responde todas las preguntas antes de enviar.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const payload = data.preguntas.map((p) => ({
      pregunta_id: p.id,
      respuesta: answers[p.id],
    }));
    const { data: res, error: err } = await db.rpc("registrar_intento_evaluacion", {
      p_firma_token: firmaToken,
      p_respuestas: payload,
    });
    setSubmitting(false);
    if (err) {
      setError(err.message);
      return;
    }
    setResultado(res as Resultado);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando evaluación…
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.tiene_evaluacion) return null;

  // ── Resultado ─────────────────────────────────────
  if (resultado) {
    const aprobado = resultado.puntaje >= 70;
    const puedeReintentar = resultado.intentos_restantes > 0 && !data.cerrada;
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
          <div className={`rounded-full p-3 ${aprobado ? "bg-green-100" : "bg-amber-100"}`}>
            {aprobado
              ? <Award className="h-8 w-8 text-green-600" />
              : <AlertCircle className="h-8 w-8 text-amber-600" />}
          </div>
          <div>
            <p className={`text-3xl font-bold ${aprobado ? "text-green-700" : "text-amber-700"}`}>
              {resultado.puntaje}/100
            </p>
            <p className="text-sm text-muted-foreground">
              {resultado.correctas} de {resultado.total} correctas
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Intento {resultado.numero_intento} · Mejor puntaje: <strong>{resultado.mejor_puntaje}</strong>
          </div>
          {puedeReintentar ? (
            <>
              <p className="text-xs text-muted-foreground">
                Te queda{resultado.intentos_restantes !== 1 ? "n" : ""} {resultado.intentos_restantes} intento
                {resultado.intentos_restantes !== 1 ? "s" : ""}. Un nuevo intento puede mejorar tu puntaje.
              </p>
              <Button size="sm" variant="outline" onClick={startRetry}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reintentar
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              {data.cerrada
                ? "La capacitación está cerrada."
                : "No quedan intentos disponibles."}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Sin intentos / cerrada (bloqueo antes de responder) ────
  const sinIntentos = data.intentos_usados >= data.max_intentos;
  if (sinIntentos || data.cerrada) {
    return (
      <Card>
        <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full bg-slate-100 p-3">
            <XCircle className="h-7 w-7 text-slate-500" />
          </div>
          <p className="font-semibold text-slate-700">
            {data.cerrada ? "Capacitación cerrada" : "No quedan intentos"}
          </p>
          {data.mejor_puntaje !== null && (
            <p className="text-sm text-muted-foreground">
              Tu mejor puntaje: <strong>{data.mejor_puntaje}/100</strong>
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Formulario ────────────────────────────────────
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[#F97316]" />
          <CardTitle className="text-base">Evaluación</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          {data.preguntas.length} pregunta{data.preguntas.length !== 1 ? "s" : ""} ·
          Intento {data.intentos_usados + 1} de {data.max_intentos}
          {data.mejor_puntaje !== null && ` · Mejor: ${data.mejor_puntaje}/100`}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.preguntas.map((p, idx) => (
          <div key={p.id} className="space-y-2 pb-3 border-b last:border-b-0">
            <p className="text-sm font-medium">
              <span className="text-slate-400 mr-1">{idx + 1}.</span>
              {p.enunciado}
            </p>
            {p.tipo === "si_no" ? (
              <div className="flex gap-2">
                {(["si", "no"] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    size="sm"
                    variant={answers[p.id] === v ? "default" : "outline"}
                    onClick={() => setAnswer(p.id, v)}
                    className="flex-1"
                  >
                    {v === "si" ? "Sí" : "No"}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {(p.opciones ?? []).map((op, opIdx) => (
                  <label
                    key={opIdx}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                      answers[p.id] === op
                        ? "bg-orange-50 border-orange-300"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`preg-${p.id}`}
                      value={op}
                      checked={answers[p.id] === op}
                      onChange={() => setAnswer(p.id, op)}
                      className="h-3.5 w-3.5 accent-[#F97316]"
                    />
                    <span>{op}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {error && (
          <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />{error}
          </p>
        )}

        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</>
            : <><CheckCircle2 className="mr-2 h-4 w-4" />Enviar respuestas</>}
        </Button>
      </CardContent>
    </Card>
  );
}
