import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void; icon?: LucideIcon };
  className?: string;
}

/**
 * Estado vacío estandarizado: icono Lucide + texto + botón opcional.
 * Usado en listas y tablas cuando no hay datos.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const ActionIcon = action?.icon;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4 gap-3",
        className
      )}
      role="status"
    >
      <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center">
        <Icon className="w-7 h-7 text-[#64748B]" strokeWidth={1.5} />
      </div>
      <div className="space-y-1 max-w-sm">
        <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
        {description && <p className="text-xs text-[#64748B] leading-relaxed">{description}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick} className="mt-2">
          {ActionIcon && <ActionIcon className="w-4 h-4 mr-1.5" />}
          {action.label}
        </Button>
      )}
    </div>
  );
}
