import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Truck, Plus, Pencil, Trash2, Users, Power } from "lucide-react";
import { toast } from "sonner";
import { canEdit, canAdmin } from "@/lib/roles";
import { EmpleadosContratistaModal } from "@/components/contratistas/EmpleadosContratistaModal";

interface Contratista {
  id: string;
  nombre: string;
  nit: string | null;
  contacto: string | null;
  telefono: string | null;
  email: string | null;
  estado: string;
  empleados_count?: number;
}

interface Usuario { rol?: string | null }

const emptyForm = { nombre: "", nit: "", contacto: "", telefono: "", email: "" };

export default function Contratistas() {
  const { empresa, user } = useAuth();
  const [rol, setRol] = useState<string | null>(null);
  const [items, setItems] = useState<Contratista[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contratista | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [empleadosOf, setEmpleadosOf] = useState<{ id: string; nombre: string } | null>(null);

  const allowEdit = canEdit(rol);
  const allowDelete = canAdmin(rol);

  useEffect(() => {
    if (!user?.id) return;
    (supabase as any).from("usuarios").select("rol").eq("auth_user_id", user.id).maybeSingle()
      .then(({ data }: any) => setRol(data?.rol ?? null));
  }, [user?.id]);

  const fetchData = async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("contratistas")
      .select("id, nombre, nit, contacto, telefono, email, estado")
      .eq("empresa_id", empresa.id)
      .order("nombre");

    const { data: emp } = await (supabase as any)
      .from("empleados_contratista")
      .select("contratista_id")
      .eq("empresa_id", empresa.id);

    const counts: Record<string, number> = {};
    (emp ?? []).forEach((e: any) => { counts[e.contratista_id] = (counts[e.contratista_id] ?? 0) + 1; });

    setItems((data ?? []).map((c: any) => ({ ...c, empleados_count: counts[c.id] ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [empresa?.id]);

  const openNew = () => { setEditing(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (c: Contratista) => {
    setEditing(c);
    setForm({
      nombre: c.nombre, nit: c.nit ?? "", contacto: c.contacto ?? "",
      telefono: c.telefono ?? "", email: c.email ?? "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!empresa?.id) return;
    if (!form.nombre.trim()) { toast.error("El nombre es obligatorio"); return; }
    setSaving(true);
    const payload = {
      empresa_id: empresa.id,
      nombre: form.nombre.trim(),
      nit: form.nit.trim() || null,
      contacto: form.contacto.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
    };
    const { error } = editing
      ? await (supabase as any).from("contratistas").update(payload).eq("id", editing.id)
      : await (supabase as any).from("contratistas").insert({ ...payload, estado: "activo" });
    setSaving(false);
    if (error) { toast.error("No se pudo guardar el contratista"); return; }
    toast.success(editing ? "Contratista actualizado" : "Contratista agregado");
    setModalOpen(false);
    fetchData();
  };

  const toggleEstado = async (c: Contratista) => {
    const nuevo = c.estado === "activo" ? "inactivo" : "activo";
    const { error } = await (supabase as any).from("contratistas").update({ estado: nuevo }).eq("id", c.id);
    if (error) { toast.error("No se pudo cambiar el estado"); return; }
    toast.success(`Contratista ${nuevo}`);
    fetchData();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase as any).from("contratistas").delete().eq("id", deleteId);
    if (error) { toast.error("No se pudo eliminar (verifica empleados asociados)"); return; }
    toast.success("Contratista eliminado");
    setDeleteId(null);
    fetchData();
  };

  return (
    <AppLayout breadcrumbs={["SSTLink", "Contratistas"]}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="page-header !pb-3 !mb-3 flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#F97316]" /> Contratistas
            </h1>
            <p className="page-subtitle">Gestiona contratistas y sus empleados.</p>
          </div>
          {allowEdit && (
            <Button onClick={openNew} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Agregar
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Truck className="w-10 h-10 mx-auto opacity-20 mb-2" />
            <p className="text-sm">No hay contratistas registrados.</p>
            {allowEdit && <p className="text-xs mt-1">Haz clic en "Agregar" para empezar.</p>}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(c => (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground truncate">{c.nombre}</h3>
                    {c.nit && <p className="text-[11px] text-muted-foreground">NIT {c.nit}</p>}
                  </div>
                  <Badge variant={c.estado === "activo" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {c.estado}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{c.empleados_count ?? 0} empleado{(c.empleados_count ?? 0) !== 1 ? "s" : ""}</span>
                </div>

                {(c.contacto || c.email || c.telefono) && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[c.contacto, c.email, c.telefono].filter(Boolean).join(" · ")}
                  </p>
                )}

                <div className="flex gap-1.5 pt-1">
                  <Button variant="outline" size="sm" className="text-xs flex-1"
                    onClick={() => setEmpleadosOf({ id: c.id, nombre: c.nombre })}>
                    <Users className="w-3.5 h-3.5 mr-1" /> Empleados
                  </Button>
                  {allowEdit && (
                    <Button variant="outline" size="sm" className="text-xs" onClick={() => openEdit(c)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {allowEdit && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => toggleEstado(c)}>
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  {allowDelete && (
                    <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">{editing ? "Editar contratista" : "Agregar contratista"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nombre *</Label>
              <Input className="h-9" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">NIT</Label>
              <Input className="h-9" value={form.nit} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))} disabled={saving} placeholder="Ej: 900123456-7" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contacto</Label>
              <Input className="h-9" value={form.contacto} onChange={e => setForm(p => ({ ...p, contacto: e.target.value }))} disabled={saving} placeholder="Nombre del contacto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input className="h-9" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} disabled={saving} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Teléfono</Label>
                <Input className="h-9" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} disabled={saving} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Guardando…" : editing ? "Guardar" : "Agregar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Empleados modal */}
      {empleadosOf && (
        <EmpleadosContratistaModal
          open={!!empleadosOf}
          onClose={() => setEmpleadosOf(null)}
          contratistaId={empleadosOf.id}
          contratistaNombre={empleadosOf.nombre}
          canEdit={allowEdit}
          onChanged={fetchData}
        />
      )}

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar contratista?</AlertDialogTitle>
            <AlertDialogDescription>
              Si el contratista tiene empleados registrados, primero debes eliminarlos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
