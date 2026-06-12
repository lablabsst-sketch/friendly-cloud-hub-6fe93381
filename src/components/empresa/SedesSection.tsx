import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MapPin, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { canEdit } from "@/lib/roles";

interface Sede {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
}

interface Props { rol?: string | null }

const empty: Omit<Sede, "id"> = { nombre: "", direccion: "", ciudad: "", departamento: "" };

export function SedesSection({ rol }: Props) {
  const { empresa } = useAuth();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Sede | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const allowEdit = canEdit(rol);

  const fetchSedes = async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("sedes")
      .select("id, nombre, direccion, ciudad, departamento")
      .eq("empresa_id", empresa.id)
      .order("nombre");
    setSedes(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchSedes(); }, [empresa?.id]);

  const openNew = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Sede) => {
    setEditing(s);
    setForm({ nombre: s.nombre, direccion: s.direccion ?? "", ciudad: s.ciudad ?? "", departamento: s.departamento ?? "" });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!empresa?.id || !form.nombre.trim()) {
      toast.error("El nombre de la sede es obligatorio");
      return;
    }
    setSaving(true);
    const payload = {
      empresa_id: empresa.id,
      nombre: form.nombre.trim(),
      direccion: form.direccion?.trim() || null,
      ciudad: form.ciudad?.trim() || null,
      departamento: form.departamento?.trim() || null,
    };
    const { error } = editing
      ? await (supabase as any).from("sedes").update(payload).eq("id", editing.id)
      : await (supabase as any).from("sedes").insert(payload);
    setSaving(false);
    if (error) { toast.error("No se pudo guardar la sede"); return; }
    toast.success(editing ? "Sede actualizada" : "Sede agregada");
    setOpen(false);
    fetchSedes();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from("sedes").delete().eq("id", deleteId);
    if (error) { toast.error("No se pudo eliminar"); return; }
    toast.success("Sede eliminada");
    setDeleteId(null);
    fetchSedes();
  };

  return (
    <div className="bg-surface rounded-xl border-[0.5px] border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-medium flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground" /> Sedes
        </h3>
        {allowEdit && (
          <Button size="sm" onClick={openNew}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Agregar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}</div>
      ) : sedes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
          <MapPin className="w-8 h-8 opacity-20" />
          <p className="text-sm">Sin sedes registradas.</p>
        </div>
      ) : (
        <div className="divide-y">
          {sedes.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-2.5 group">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate">{s.nombre}</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {[s.direccion, s.ciudad, s.departamento].filter(Boolean).join(" · ") || "Sin dirección"}
                </p>
              </div>
              {allowEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Editar sede" : "Agregar sede"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input className="h-9" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Sede principal" disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Dirección</Label>
              <Input className="h-9" value={form.direccion ?? ""} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} disabled={saving} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Ciudad</Label>
                <Input className="h-9" value={form.ciudad ?? ""} onChange={e => setForm(p => ({ ...p, ciudad: e.target.value }))} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Departamento</Label>
                <Input className="h-9" value={form.departamento ?? ""} onChange={e => setForm(p => ({ ...p, departamento: e.target.value }))} disabled={saving} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sede?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
