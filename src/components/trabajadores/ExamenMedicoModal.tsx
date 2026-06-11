import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Paperclip, Loader2 } from "lucide-react";

export interface ExamenMedicoRecord {
  id: string;
  tipo: string;
  fecha: string;
  resultado: string | null;
  concepto: string | null;
  restricciones: string | null;
  proximo_control: string | null;
  soporte_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  empresaId: string;
  trabajadorId: string;
  editing?: ExamenMedicoRecord | null;
  onSaved: () => void;
}

const empty = {
  tipo: "ingreso",
  fecha: new Date().toISOString().slice(0, 10),
  resultado: "pendiente",
  concepto: "",
  restricciones: "",
  proximo_control: "",
  soporte_url: "" as string | null,
};

export function ExamenMedicoModal({ open, onOpenChange, empresaId, trabajadorId, editing, onSaved }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        tipo: editing.tipo,
        fecha: editing.fecha,
        resultado: editing.resultado ?? "pendiente",
        concepto: editing.concepto ?? "",
        restricciones: editing.restricciones ?? "",
        proximo_control: editing.proximo_control ?? "",
        soporte_url: editing.soporte_url ?? "",
      });
    } else {
      setForm(empty);
    }
  }, [open, editing]);

  const handleUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 10 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${empresaId}/examenes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("documentos").upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      toast({ title: "Error al subir archivo", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data } = await supabase.storage.from("documentos").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
    setForm((f) => ({ ...f, soporte_url: data?.signedUrl ?? "" }));
    setUploading(false);
    toast({ title: "Archivo cargado" });
  };

  const save = async () => {
    if (!form.fecha || !form.tipo) {
      toast({ title: "Datos incompletos", description: "Tipo y fecha son obligatorios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      empresa_id: empresaId,
      trabajador_id: trabajadorId,
      tipo: form.tipo,
      fecha: form.fecha,
      resultado: form.resultado,
      concepto: form.concepto || null,
      restricciones: form.resultado === "apto_con_restricciones" ? (form.restricciones || null) : null,
      proximo_control: form.proximo_control || null,
      soporte_url: form.soporte_url || null,
    };
    const { error } = editing
      ? await (supabase as any).from("examenes_medicos").update(payload).eq("id", editing.id)
      : await (supabase as any).from("examenes_medicos").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: editing ? "Examen actualizado" : "Examen registrado" });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar examen médico" : "Nuevo examen médico"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo *</Label>
            <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ingreso">Ingreso</SelectItem>
                <SelectItem value="periodico">Periódico</SelectItem>
                <SelectItem value="egreso">Egreso</SelectItem>
                <SelectItem value="reintegro">Reintegro</SelectItem>
                <SelectItem value="post_incapacidad">Post-incapacidad</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fecha *</Label>
            <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Resultado</Label>
            <Select value={form.resultado} onValueChange={(v) => setForm({ ...form, resultado: v })}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="apto">Apto</SelectItem>
                <SelectItem value="apto_con_restricciones">Apto con restricciones</SelectItem>
                <SelectItem value="no_apto">No apto</SelectItem>
                <SelectItem value="aplazado">Aplazado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Próximo control</Label>
            <Input type="date" value={form.proximo_control} onChange={(e) => setForm({ ...form, proximo_control: e.target.value })} className="h-9 text-sm" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Concepto</Label>
          <Textarea rows={2} value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} className="text-sm" />
        </div>

        {form.resultado === "apto_con_restricciones" && (
          <div className="space-y-1.5">
            <Label className="text-xs">Restricciones</Label>
            <Textarea rows={2} value={form.restricciones} onChange={(e) => setForm({ ...form, restricciones: e.target.value })} className="text-sm" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">Soporte (PDF/imagen, máx. 10 MB)</Label>
          {form.soporte_url ? (
            <div className="flex items-center gap-2 text-xs border rounded-md px-3 py-2">
              <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
              <a href={form.soporte_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex-1">Ver archivo cargado</a>
              <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setForm({ ...form, soporte_url: "" })}>Quitar</Button>
            </div>
          ) : (
            <Input
              type="file"
              accept="application/pdf,image/*"
              disabled={uploading}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
              className="h-9 text-sm"
            />
          )}
          {uploading && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Subiendo…</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} disabled={saving || uploading}>{saving ? "Guardando…" : editing ? "Guardar cambios" : "Registrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
