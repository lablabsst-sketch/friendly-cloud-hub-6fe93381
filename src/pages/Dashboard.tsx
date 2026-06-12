import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardHero } from "@/components/dashboard/DashboardHero";
import { DashboardMetrics } from "@/components/dashboard/DashboardMetrics";
import { DashboardPanels } from "@/components/dashboard/DashboardPanels";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";

export default function Dashboard() {
  const { usuario, empresa, loading: authLoading } = useAuth();
  const { data, loading: dataLoading } = useDashboardData(empresa?.id);
  const [entered, setEntered] = useState(false);
  const loading = authLoading || dataLoading;

  useEffect(() => {
    if (!loading) requestAnimationFrame(() => setEntered(true));
  }, [loading]);

  const mesAnio = new Date().toLocaleDateString("es-CO", { month: "short", year: "numeric" }).toUpperCase();
  const nombreCompleto = usuario ? `${usuario.nombre}${usuario.apellido ? " " + usuario.apellido : ""}` : "Usuario";

  return (
    <AppLayout breadcrumbs={["SSTLink", "Inicio"]}>
      <div className="space-y-3.5 max-w-6xl transition-all duration-300"
        style={{ opacity: entered ? 1 : 0, transform: entered ? "translateY(0)" : "translateY(8px)" }}>
        {!loading && <OnboardingChecklist />}
        {loading ? (
          <Skeleton className="h-[140px] w-full rounded-[14px]" />
        ) : (
          <DashboardHero
            empresaNombre={empresa?.nombre ?? "Sin empresa"}
            nombreCompleto={nombreCompleto}
            numTrabajadores={data.totalTrabajadores}
            nivelProteccion={data.nivelProteccion}
            accidentes={data.accidentesAnio}
            mesAnio={mesAnio}
            mesLabel={mesAnio}
          />
        )}
        <DashboardMetrics loading={loading} data={data} />
        <DashboardPanels loading={loading} data={data} />
      </div>
    </AppLayout>
  );
}
