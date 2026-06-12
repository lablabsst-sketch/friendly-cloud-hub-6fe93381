import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

interface Empleado {
  id: string;
  nombres: string;
  apellidos: string;
  tipo_documento: string;
  numero_documento: string;
  cargo: string | null;
  estado: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  contratistaId: string;
  contratistaNombre: string;
  canEdit: boolean;
  onChanged?: () => void;
}

const emptyForm = { nombres: "", apellidos: "", tipo_documento: "CC", numero_documento: "", cargo: "" };

export function EmpleadosContratistaModal({ open, onClose, contratistaId, contratistaNombre, canEdit, onChanged }: Props) {
  const { empresa } = useAuth();
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchEmpleados = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("empleados_contratista")
      .select("id, nombres, apellidos, tipo_documento, numero_documento, cargo, estado")
      .eq("contratista_id", contratistaId)
      .order("nombres");
    setEmpleados(data ?? []);
    setLoading(false);
  };

  useEffect(() => { if (open) { fetchEmpleados(); setForm(emptyForm); } }, [open, contratistaId]);

  const handleAdd = async () => {
    if (!empresa?.id) return;
    if (!form.nombres.trim() || !form.apellidos.trim() || !form.numero_documento.trim()) {
      toast.error("Nombres, apellidos y documento son obligatorios");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("empleados_contratista").insert({
      empresa_id: empresa.id,
      contratista_id: contratistaId,
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      tipo_documento: form.tipo_documento,
      numero_documento: form.numero_documento.trim(),
      cargo: form.cargo.trim() || null,
      estado: "activo",
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") toast.error("Este documento ya está registrado");
      else toast.error("No se pudo agregar el empleado");
      return;
    }
    toast.success("Empleado agregado");
    setForm(emptyForm);
    fetchEmpleados();
    onChanged?.();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any).from("empleados_contratista").delete().eq("id", id);
    if (error) { toast.error("No se pudo eliminar"); return; }
    toast.success("Empleado eliminado");
    fetchEmpleados();
    onChanged?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> Empleados de {contratistaNombre}
          </DialogTitle>
        </DialogHeader>

        {canEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-3 rounded-lg bg-muted/30 border border-border">
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[10px]">Nombres *</Label>
              <Input className="h-8 text-xs" value={form.nombres} onChange={e => setForm(p => ({ ...p, nombres: e.target.value }))} disabled={saving} />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label className="text-[10px]">Apellidos *</Label>
              <Input className="h-8 text-xs" value={form.apellidos} onChange={e => setForm(p => ({ ...p, apellidos: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Tipo</Label>
              <Select value={form.tipo_documento} onValueChange={v => setForm(p => ({ ...p, tipo_documento: v }))} disabled={saving}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CC">CC</SelectItem>
                  <SelectItem value="CE">CE</SelectItem>
                  <SelectItem value="PP">PP</SelectItem>
                  <SelectItem value="TI">TI</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Documento *</Label>
              <Input className="h-8 text-xs" value={form.numero_documento} onChange={e => setForm(p => ({ ...p, numero_documento: e.target.value.replace(/[^0-9A-Za-z]/g, "") }))} disabled={saving} />
            </div>
            <div className="sm:col-span-5 space-y-1">
              <Label className="text-[10px]">Cargo</Label>
              <Input className="h-8 text-xs" value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))} disabled={saving} placeholder="Ej: Operario" />
            </div>
            <div className="sm:col-span-1 flex items-end">
              <Button size="sm" className="h-8 w-full text-xs" onClick={handleAdd} disabled={saving}>
                <Plus className="w-3 h-3 mr-1" /> {saving ? "..." : "Agregar"}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-3">
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
          ) : empleados.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Sin empleados registrados.</div>
          ) : (
            <div className="divide-y border border-border rounded-lg overflow-hidden">
              {empleados.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-3 py-2 group hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{e.nombres} {e.apellidos}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {e.tipo_documento} {e.numero_documento}{e.cargo ? ` · ${e.cargo}` : ""}
                    </p>
                  </div>
                  <Badge variant={e.estado === "activo" ? "default" : "secondary"} className="text-[9px] h-4">{e.estado}</Badge>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDelete(e.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
