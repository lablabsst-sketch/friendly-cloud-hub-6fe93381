import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Plus, Users, Settings, Power, Share2, Copy, Check, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { AddClienteModal } from "@/components/clientes/AddClienteModal";
import { WorkerAssignmentModal } from "@/components/clientes/WorkerAssignmentModal";
import { getPlanLimits, normalizePlan, type PlanName } from "@/lib/planLimits";
import { PlanLimitBanner } from "@/components/plan/PlanLimitBanner";

interface Cliente {
  id: string;
  nombre: string;
  nit_cedula: string;
  tipo: string;
  contacto: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  notas: string | null;
  worker_count?: number;
}

export default function Clientes() {
  const { empresa } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editData, setEditData] = useState<Cliente | null>(null);
  const [assignModal, setAssignModal] = useState<{ id: string; nombre: string } | null>(null);
  const [shareCliente, setShareCliente] = useState<Cliente | null>(null);
  const [copiedPortal, setCopiedPortal] = useState(false);
  const [plan, setPlan] = useState<PlanName>("pyme");

  const activeClientesCount = clientes.filter(c => c.activo).length;
  const clienteLimit = getPlanLimits(plan).clientes;
  const clienteLimitReached = activeClientesCount >= clienteLimit;

  const handleOpenAdd = () => {
    if (clienteLimitReached) {
      toast({
        title: "Límite del plan alcanzado",
        description: `Has alcanzado el límite de tu plan. Actualiza para añadir más clientes (${activeClientesCount}/${clienteLimit}).`,
        variant: "destructive",
      });
      return;
    }
    setEditData(null);
    setAddOpen(true);
  };

  const fetchClientes = async () => {
    if (!empresa?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("clientes_portal")
      .select("id, nombre, nit_cedula, tipo, contacto, email, telefono, activo, notas")
      .eq("empresa_id", empresa.id)
      .order("nombre");

    if (data) {
      // Get worker counts
      const { data: counts } = await supabase
        .from("trabajadores_cliente")
        .select("cliente_id")
        .eq("empresa_id", empresa.id)
        .eq("activo", true);

      const countMap: Record<string, number> = {};
      (counts ?? []).forEach(r => {
        countMap[r.cliente_id] = (countMap[r.cliente_id] ?? 0) + 1;
      });

      setClientes(data.map(c => ({ ...c, worker_count: countMap[c.id] ?? 0 })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, [empresa?.id]);

  useEffect(() => {
    if (!empresa?.id) return;
    (supabase as any).from("empresas").select("plan").eq("id", empresa.id).maybeSingle()
      .then(({ data }: any) => setPlan(normalizePlan(data?.plan)));
  }, [empresa?.id]);

  const copyPortalMessage = (c: Cliente) => {
    const url = `${window.location.origin}/portal`;
    const msg = `Hola ${c.nombre},\n\nTe compartimos acceso al portal de SSTLink para consultar documentos y trabajadores asignados.\n\nEnlace: ${url}\nTu NIT/Cédula de acceso: ${c.nit_cedula}\n\nSaludos.`;
    navigator.clipboard.writeText(msg);
    setCopiedPortal(true);
    setTimeout(() => setCopiedPortal(false), 2000);
  };

  const toggleActivo = async (cliente: Cliente) => {
    const { error } = await supabase
      .from("clientes_portal")
      .update({ activo: !cliente.activo })
      .eq("id", cliente.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: cliente.activo ? "Cliente desactivado" : "Cliente activado" });
      fetchClientes();
    }
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gestiona los clientes que acceden al portal de trabajadores.</p>
          </div>
          <Button onClick={handleOpenAdd} disabled={clienteLimitReached} size="sm">
            <Plus className="w-4 h-4 mr-1" /> Agregar Cliente
          </Button>
        </div>

        <PlanLimitBanner plan={plan} resource="clientes" count={activeClientesCount} limit={clienteLimit} />


        {loading ? (
          <div className="text-center text-muted-foreground py-12">Cargando…</div>
        ) : clientes.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            No hay clientes registrados. Haz clic en "Agregar Cliente" para empezar.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clientes.map(c => (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{c.nombre}</h3>
                    <p className="text-xs text-muted-foreground">{c.nit_cedula}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={c.tipo === "empresa" ? "default" : "secondary"} className="text-[10px]">
                      {c.tipo}
                    </Badge>
                    <Badge variant={c.activo ? "default" : "destructive"} className="text-[10px]">
                      {c.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="w-3.5 h-3.5" />
                  <span>{c.worker_count} trabajador{c.worker_count !== 1 ? "es" : ""} asignado{c.worker_count !== 1 ? "s" : ""}</span>
                </div>

                {(c.contacto || c.email || c.telefono) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {[c.contacto, c.email, c.telefono].filter(Boolean).join(" · ")}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="text-xs flex-1"
                    onClick={() => setAssignModal({ id: c.id, nombre: c.nombre })}>
                    <Settings className="w-3.5 h-3.5 mr-1" /> Trabajadores
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs"
                    onClick={() => { setShareCliente(c); setCopiedPortal(false); }}>
                    <Share2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-xs"
                    onClick={() => toggleActivo(c)}>
                    <Power className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddClienteModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={fetchClientes}
        editData={editData}
      />

      {assignModal && (
        <WorkerAssignmentModal
          open={!!assignModal}
          onClose={() => setAssignModal(null)}
          clienteId={assignModal.id}
          clienteNombre={assignModal.nombre}
          onSaved={fetchClientes}
        />
      )}

      {/* Share portal dialog */}
      <Dialog open={!!shareCliente} onOpenChange={open => !open && setShareCliente(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Compartir acceso al portal</DialogTitle>
          </DialogHeader>
          {shareCliente && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Envía este acceso a <strong>{shareCliente.nombre}</strong> para que consulte sus documentos y trabajadores asignados.
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Enlace del portal</p>
                    <p className="text-[12px] font-mono">{window.location.origin}/portal</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">NIT / Cédula de acceso</p>
                    <p className="text-[13px] font-semibold">{shareCliente.nit_cedula}</p>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">El cliente ingresa con su NIT o cédula directamente en el portal, sin contraseña.</p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyPortalMessage(shareCliente)}
                >
                  {copiedPortal
                    ? <><Check className="w-3.5 h-3.5 mr-1.5 text-green-600" /> Copiado</>
                    : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copiar mensaje</>
                  }
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  asChild
                >
                  <a
                    href={`mailto:${shareCliente.email ?? ""}?subject=Acceso al portal SSTLink&body=${encodeURIComponent(`Hola ${shareCliente.nombre},%0A%0ATe compartimos acceso al portal de SSTLink para consultar documentos y trabajadores asignados.%0A%0AEnlace: ${window.location.origin}/portal%0ATu NIT/Cédula de acceso: ${shareCliente.nit_cedula}%0A%0ASaludos.`)}`}
                    target="_blank"
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" /> Enviar correo
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
