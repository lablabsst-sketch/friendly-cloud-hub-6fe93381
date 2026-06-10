import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PhvaFase { fase: string; total: number; completados: number; en_progreso: number; porcentaje: number; }
export interface CumplimientoPhva { porcentaje: number; total: number; completados: number; nivel: string; fases: PhvaFase[]; }

export interface DashboardData {
  totalTrabajadores: number;
  trabajadoresAprobados: number;
  trabajadoresPendientes: number;
  totalContratistas: number;
  contratistas: { id: string; nombre: string; estado: string; }[];
  accidentesAnio: number;
  diasPerdidosAnio: number;
  capacitacionesPendientes: number;
  capacitacionesCompletadas: number;
  docsProximosVencer: number;
  docsVencidos: number;
  nivelProteccion: number;
  itemsPlanMejora: { total: number; completados: number };
  cumplimientoPhva: CumplimientoPhva | null;
  proveedoresExpirando: number;
  inspeccionesPendientes: number;
  ausenciasAnio: number;
  diasAusenciaAnio: number;
  examenesMedicosAnio: number;
}

const empty: DashboardData = {
  totalTrabajadores: 0, trabajadoresAprobados: 0, trabajadoresPendientes: 0,
  totalContratistas: 0, contratistas: [], accidentesAnio: 0, diasPerdidosAnio: 0,
  capacitacionesPendientes: 0, capacitacionesCompletadas: 0,
  docsProximosVencer: 0, docsVencidos: 0, nivelProteccion: 0,
  itemsPlanMejora: { total: 0, completados: 0 },
  cumplimientoPhva: null,
  proveedoresExpirando: 0,
  inspeccionesPendientes: 0,
  ausenciasAnio: 0,
  diasAusenciaAnio: 0,
  examenesMedicosAnio: 0,
};

// Run a query and return [] if the table is missing or any error occurs.
async function safeList<T = any>(p: PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  try {
    const { data, error } = await p;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
}

async function safeRpc<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
  try {
    const { data, error } = await p;
    if (error) return null;
    return data ?? null;
  } catch {
    return null;
  }
}

export function useDashboardData(empresaId: string | null | undefined) {
  const [data, setData] = useState<DashboardData>(empty);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!empresaId) { setLoading(false); return; }

    const fetchAll = async () => {
      setLoading(true);
      const hoy = new Date();
      const inicioAnio = `${hoy.getFullYear()}-01-01`;
      const hoyStr = hoy.toISOString().split("T")[0];
      const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [
        trabajadores,
        contratistas,
        accidentes,
        caps,
        docsEmp,
        docsTrab,
        planItems,
        cumplPhva,
        proveedores,
        inspecciones,
        ausencias,
        examenes,
      ] = await Promise.all([
        safeList<any>(supabase.from("trabajadores").select("id, estado").eq("empresa_id", empresaId).eq("eliminado", false)),
        safeList<any>(supabase.from("contratistas").select("id, nombre, estado").eq("empresa_id", empresaId).eq("estado", "activo").limit(5)),
        safeList<any>(supabase.from("accidentes").select("id, dias_incapacidad").eq("empresa_id", empresaId).gte("fecha", inicioAnio)),
        safeList<any>(supabase.from("capacitaciones").select("id, estado").eq("empresa_id", empresaId)),
        safeList<any>(supabase.from("documentos_empresa").select("id, fecha_vencimiento").eq("empresa_id", empresaId).not("fecha_vencimiento", "is", null)),
        safeList<any>(supabase.from("documentos_trabajador").select("id, fecha_vencimiento").eq("empresa_id", empresaId).not("fecha_vencimiento", "is", null)),
        safeList<any>(supabase.from("items_plan_mejora").select("id, estado").eq("empresa_id", empresaId)),
        safeRpc<CumplimientoPhva>(supabase.rpc("get_cumplimiento_phva", { p_empresa_id: empresaId }) as any),
        safeList<any>((supabase as any).from("proveedores").select("id, fecha_fin_contrato").eq("empresa_id", empresaId).eq("estado", "activo").not("fecha_fin_contrato", "is", null)),
        safeList<any>((supabase as any).from("inspecciones").select("id, estado").eq("empresa_id", empresaId).in("estado", ["pendiente", "en-proceso"])),
        safeList<any>((supabase as any).from("ausencias").select("id, dias").eq("empresa_id", empresaId).gte("fecha_inicio", inicioAnio)),
        safeList<any>((supabase as any).from("examenes_medicos").select("id").eq("empresa_id", empresaId).gte("fecha", inicioAnio)),
      ]);

      const totalTrabajadores = trabajadores.length;
      const trabajadoresAprobados = trabajadores.filter((t: any) => t.estado === "aprobado" || t.estado === "activo").length;
      const trabajadoresPendientes = trabajadores.filter((t: any) => t.estado === "pendiente").length;
      const accidentesAnio = accidentes.length;
      const diasPerdidosAnio = accidentes.reduce((s: number, a: any) => s + (a.dias_incapacidad ?? 0), 0);
      const capacitacionesPendientes = caps.filter((c: any) => c.estado === "pendiente").length;
      const capacitacionesCompletadas = caps.filter((c: any) => c.estado === "completado").length;
      const todosDocs = [...docsEmp, ...docsTrab];
      const docsProximosVencer = todosDocs.filter((d: any) => d.fecha_vencimiento >= hoyStr && d.fecha_vencimiento <= en30Dias).length;
      const docsVencidos = todosDocs.filter((d: any) => d.fecha_vencimiento < hoyStr).length;
      const planTotal = planItems.length;
      const planCompletados = planItems.filter((i: any) => i.estado === "completado").length;

      let nivel = cumplPhva?.porcentaje ?? 0;
      if (!cumplPhva) {
        if (totalTrabajadores > 0) nivel += 25;
        if (accidentesAnio === 0 && totalTrabajadores > 0) nivel += 20;
        if (capacitacionesCompletadas > 0) nivel += 20;
        if (todosDocs.length > 0 && docsVencidos === 0) nivel += 20;
        if (planTotal > 0) nivel += 15;
      }

      const proveedoresExpirando = proveedores.filter((p: any) =>
        p.fecha_fin_contrato >= hoyStr && p.fecha_fin_contrato <= en30Dias
      ).length;
      const inspeccionesPendientes = inspecciones.length;
      const ausenciasAnio = ausencias.length;
      const diasAusenciaAnio = ausencias.reduce((s: number, a: any) => s + (a.dias ?? 0), 0);
      const examenesMedicosAnio = examenes.length;

      setData({
        totalTrabajadores, trabajadoresAprobados, trabajadoresPendientes,
        totalContratistas: contratistas.length,
        contratistas,
        accidentesAnio, diasPerdidosAnio,
        capacitacionesPendientes, capacitacionesCompletadas,
        docsProximosVencer, docsVencidos,
        nivelProteccion: nivel,
        itemsPlanMejora: { total: planTotal, completados: planCompletados },
        cumplimientoPhva: cumplPhva,
        proveedoresExpirando,
        inspeccionesPendientes,
        ausenciasAnio,
        diasAusenciaAnio,
        examenesMedicosAnio,
      });
      setLoading(false);
    };

    fetchAll();
  }, [empresaId]);

  return { data, loading };
}
