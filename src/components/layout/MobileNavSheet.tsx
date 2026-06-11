import {
  LayoutDashboard, Users, Truck, GraduationCap,
  ClipboardCheck, BarChart3, CalendarRange,
  Building2, MessageCircle, UserCheck, ShieldCheck,
  AlertTriangle, CalendarOff, Stethoscope,
  LayoutGrid, HeartPulse, BookOpen, LogOut, Lock,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useEmpresaPlan } from "@/hooks/useEmpresaPlan";
import { isRouteLockedForPlan } from "@/lib/planLimits";
import { toast } from "sonner";
import logoSstlink from "@/assets/logo-sstlink.png";


type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; badge?: boolean };
type NavCategory = { id: string; title: string; icon: typeof LayoutDashboard; items: NavItem[] };

const categories: NavCategory[] = [
  {
    id: "general", title: "General", icon: LayoutGrid,
    items: [
      { title: "Inicio", url: "/dashboard", icon: LayoutDashboard },
      { title: "SG-SST", url: "/sgsst", icon: ShieldCheck },
    ],
  },
  {
    id: "personas", title: "Personas", icon: Users,
    items: [
      { title: "Trabajadores", url: "/trabajadores", icon: Users },
      { title: "Clientes", url: "/clientes", icon: UserCheck },
      { title: "Proveedores", url: "/proveedores", icon: Truck, badge: true },
    ],
  },
  {
    id: "salud", title: "Salud y riesgos", icon: HeartPulse,
    items: [
      { title: "Accidentalidad", url: "/accidentalidad", icon: AlertTriangle },
      { title: "Ausentismo", url: "/ausentismo", icon: CalendarOff },
      { title: "Exámenes Médicos", url: "/examenes-medicos", icon: Stethoscope },
    ],
  },
  {
    id: "gestion", title: "Gestión", icon: BookOpen,
    items: [
      { title: "Capacitaciones", url: "/capacitaciones", icon: GraduationCap },
      { title: "Inspecciones", url: "/inspecciones", icon: ClipboardCheck },
      { title: "Estadísticas", url: "/estadisticas", icon: BarChart3 },
      { title: "Plan Anual", url: "/plan-anual", icon: CalendarRange },
    ],
  },
];

const bottomItems: NavItem[] = [
  { title: "Mi Empresa", url: "/empresa", icon: Building2 },
];

interface MobileNavSheetProps {
  trigger: ReactNode;
}

export function MobileNavSheet({ trigger }: MobileNavSheetProps) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    close();
    await supabase.auth.signOut();
    navigate("/login");
  };

  const renderItem = (item: NavItem) => {
    const isActive = pathname === item.url;
    return (
      <NavLink
        key={item.url}
        to={item.url}
        onClick={close}
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "flex items-center gap-3 px-3 rounded-lg min-h-[44px] text-[14px]",
          "transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "text-foreground hover:bg-background"
        )}
      >
        <item.icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate">{item.title}</span>
        {item.badge && (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" aria-hidden="true" />
            <span className="sr-only">(novedades)</span>
          </>
        )}
      </NavLink>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <SheetDescription className="sr-only">Accede a todos los módulos de SSTLink</SheetDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-4 h-14 border-b-[0.5px] border-border shrink-0">
          <NavLink to="/dashboard" onClick={close} className="flex items-center gap-2 min-h-[44px]" aria-label="SSTLink — Inicio">
            <img src={logoSstlink} alt="" className="h-8 w-auto" />
            <span className="text-[15px] font-medium text-foreground">SSTLink</span>
          </NavLink>
        </div>

        {/* Navigation */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto py-3">
          {categories.map((cat) => (
            <div key={cat.id} className="mb-4 px-2">
              <div className="flex items-center gap-2 px-3 mb-1.5">
                <cat.icon className="w-3.5 h-3.5 text-hint" aria-hidden="true" />
                <h3 className="text-[10px] uppercase tracking-wider text-hint font-medium">
                  {cat.title}
                </h3>
              </div>
              <div className="flex flex-col gap-0.5">
                {cat.items.map(renderItem)}
              </div>
            </div>
          ))}

          {/* Separator */}
          <div className="h-px bg-border/60 mx-4 my-2" aria-hidden="true" />

          {/* Bottom items */}
          <div className="px-2 flex flex-col gap-0.5">
            {bottomItems.map(renderItem)}
            <a
              href="https://wa.me/573001234567"
              target="_blank"
              rel="noopener noreferrer"
              onClick={close}
              className="flex items-center gap-3 px-3 rounded-lg min-h-[44px] text-[14px] text-foreground hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <MessageCircle className="w-[18px] h-[18px] shrink-0" style={{ color: "#22C55E" }} aria-hidden="true" />
              <span className="flex-1">Soporte</span>
            </a>
          </div>
        </nav>

        {/* Footer: Sign out */}
        <div className="border-t-[0.5px] border-border p-3 shrink-0">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 rounded-lg min-h-[44px] text-[14px] text-destructive hover:bg-destructive/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            <LogOut className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
