import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonRowsProps {
  rows?: number;
  height?: string;
}

/**
 * Skeleton genérico para listas / tablas en estado de carga.
 */
export function SkeletonRows({ rows = 5, height = "h-12" }: SkeletonRowsProps) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Cargando datos">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className={`w-full ${height} bg-[#F1F5F9]`} />
      ))}
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Cargando datos">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border border-[#E2E8F0] rounded-md p-4 space-y-3 bg-white">
          <Skeleton className="h-4 w-1/2 bg-[#F1F5F9]" />
          <Skeleton className="h-3 w-3/4 bg-[#F1F5F9]" />
          <Skeleton className="h-3 w-2/3 bg-[#F1F5F9]" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 flex-1 bg-[#F1F5F9]" />
            <Skeleton className="h-8 w-8 bg-[#F1F5F9]" />
          </div>
        </div>
      ))}
    </div>
  );
}
