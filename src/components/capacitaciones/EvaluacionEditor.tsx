import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, ChevronUp, ChevronDown, Save, ClipboardList, Loader2,
} from "lucide-react";

type Tipo = "si_no" | "multiple";

interface Pregunta {
  id: string;
  capacitacion_id: string;
  empresa_id: string;
  orden: number;
  tipo: Tipo;
  enunciado: string;
  opciones: string[] | null;
  respuesta_correcta: string;
}

interface Draft {
  id?: string;
  orden: number;
  tipo: Tipo;
  enunciado: string;
  opciones: string[];
  respuesta_correcta: string;
  dirty?: boolean;
}

interface Props {
  capacitacionId: string;
  empresaId: string;
}

// Small helper: table types are behind — use `as any` on the from() call locally.
const db = supabase as any;

export function EvaluacionEditor({ capacitacionId, empresaId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Draft[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await db
      .from("evaluacion_preguntas")
      .select("*")
      .eq("capacitacion_id", capacitacionId)
      .order("orden", { ascending: true });
    if (error) {
      toast({ title: "Error cargando preguntas", description: error.message, variant: "destructive" });
      setItems([]);
    } else {
      setItems(
        (data as Pregunta[] | null ?? []).map((p) => ({
          id: p.id,
          orden: p.orden,
          tipo: p.tipo,
          enunciado: p.enunciado ?? "",
          opciones: Array.isArray(p.opciones) ? p.opciones : [],
          respuesta_correcta: p.respuesta_correcta ?? "",
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (capacitacionId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitacionId]);

  const addPregunta = (tipo: Tipo) => {
    setItems((prev) => [
      ...prev,
      {
        orden: prev.length + 1,
        tipo,
        enunciado: "",
        opciones: tipo === "multiple" ? ["", ""] : [],
        respuesta_correcta: tipo === "si_no" ? "si" : "",
        dirty: true,
      },
    ]);
  };

  const updateItem = (idx: number, patch: Partial<Draft>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch, dirty: true } : it)));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setItems((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next.map((it, i) => ({ ...it, orden: i + 1, dirty: true }));
    });
  };

  const removeItem = async (idx: number) => {
    const it = items[idx];
    if (it.id) {
      const { error } = await db.from("evaluacion_preguntas").delete().eq("id", it.id);
      if (error) {
        toast({ title: "Error eliminando", description: error.message, variant: "destructive" });
        return;
      }
    }
    setItems((prev) => prev.filter((_, i) => i !== idx).map((x, i) => ({ ...x, orden: i + 1 })));
  };

  const addOpcion = (idx: number) => {
    updateItem(idx, { opciones: [...items[idx].opciones, ""] });
  };

  const removeOpcion = (idx: number, opIdx: number) => {
    const it = items[idx];
    const nuevas = it.opciones.filter((_, i) => i !== opIdx);
    const patch: Partial<Draft> = { opciones: nuevas };
    if (it.respuesta_correcta === it.opciones[opIdx]) patch.respuesta_correcta = "";
    updateItem(idx, patch);
  };

  const updateOpcion = (idx: number, opIdx: number, value: string) => {
    const it = items[idx];
    const prevValue = it.opciones[opIdx];
    const nuevas = it.opciones.map((o, i) => (i === opIdx ? value : o));
    const patch: Partial<Draft> = { opciones: nuevas };
    if (it.respuesta_correcta === prevValue) patch.respuesta_correcta = value;
    updateItem(idx, patch);
  };

  const validate = (): string | null => {
    for (const [i, it] of items.entries()) {
      if (!it.enunciado.trim()) return `Pregunta ${i + 1}: falta el enunciado.`;
      if (it.tipo === "si_no") {
        if (!["si", "no"].includes(it.respuesta_correcta)) return `Pregunta ${i + 1}: elige la respuesta correcta.`;
      } else {
        const ops = it.opciones.map((o) => o.trim()).filter(Boolean);
        if (ops.length < 2) return `Pregunta ${i + 1}: agrega al menos 2 opciones.`;
        if (!it.respuesta_correcta || !ops.includes(it.respuesta_correcta.trim())) {
          return `Pregunta ${i + 1}: marca la opción correcta.`;
        }
      }
    }
    return null;
  };

  const saveAll = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Revisa las preguntas", description: err, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      for (const it of items) {
        const payload = {
          capacitacion_id: capacitacionId,
          empresa_id: empresaId,
          orden: it.orden,
          tipo: it.tipo,
          enunciado: it.enunciado.trim(),
          opciones: it.tipo === "multiple" ? it.opciones.map((o) => o.trim()).filter(Boolean) : null,
          respuesta_correcta: it.tipo === "si_no" ? it.respuesta_correcta : it.respuesta_correcta.trim(),
        };
        if (it.id) {
          const { error } = await db.from("evaluacion_preguntas").update(payload).eq("id", it.id);
          if (error) throw error;
        } else {
          const { error } = await db.from("evaluacion_preguntas").insert(payload);
          if (error) throw error;
        }
      }
      toast({ title: "Evaluación guardada" });
      await load();
    } catch (e) {
      toast({ title: "Error al guardar", description: (e as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="py-10 flex items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando preguntas…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardList className="h-4 w-4 text-[#F97316]" />
          <span>
            {items.length === 0
              ? "Sin preguntas. Agrega la primera abajo."
              : `${items.length} pregunta${items.length !== 1 ? "s" : ""}`}
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => addPregunta("si_no")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Sí/No
          </Button>
          <Button size="sm" variant="outline" onClick={() => addPregunta("multiple")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Múltiple
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {items.map((it, idx) => (
          <div key={it.id ?? `new-${idx}`} className="border rounded-lg p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-500">
                #{it.orden} · {it.tipo === "si_no" ? "Sí / No" : "Opción múltiple"}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(idx, -1)} disabled={idx === 0}>
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => move(idx, 1)} disabled={idx === items.length - 1}>
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeItem(idx)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Enunciado</Label>
              <Textarea
                value={it.enunciado}
                onChange={(e) => updateItem(idx, { enunciado: e.target.value })}
                rows={2}
                placeholder="Escribe la pregunta…"
                className="text-sm"
              />
            </div>

            {it.tipo === "si_no" ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Respuesta correcta</Label>
                <Select
                  value={it.respuesta_correcta || "si"}
                  onValueChange={(v) => updateItem(idx, { respuesta_correcta: v })}
                >
                  <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Sí</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Opciones (marca la correcta)</Label>
                <div className="space-y-1">
                  {it.opciones.map((op, opIdx) => {
                    const isCorrect = op.trim() !== "" && op === it.respuesta_correcta;
                    return (
                      <div key={opIdx} className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`correct-${idx}`}
                          checked={isCorrect}
                          onChange={() => updateItem(idx, { respuesta_correcta: op })}
                          disabled={!op.trim()}
                          className="h-3.5 w-3.5 accent-[#F97316]"
                        />
                        <Input
                          value={op}
                          onChange={(e) => updateOpcion(idx, opIdx, e.target.value)}
                          placeholder={`Opción ${opIdx + 1}`}
                          className="h-8 text-sm"
                        />
                        <Button
                          variant="ghost" size="icon" className="h-6 w-6"
                          onClick={() => removeOpcion(idx, opIdx)}
                          disabled={it.opciones.length <= 2}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addOpcion(idx)}>
                    <Plus className="h-3 w-3 mr-1" /> Añadir opción
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={saveAll} disabled={saving || items.length === 0}>
          {saving ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Guardando…</> : <><Save className="mr-1.5 h-3.5 w-3.5" />Guardar evaluación</>}
        </Button>
      </div>
    </div>
  );
}
