import {
  LayoutDashboard, Users, Truck, GraduationCap,
  ClipboardCheck, BarChart3, CalendarRange,
  Building2, MessageCircle, UserCheck, ShieldCheck,
  AlertTriangle, CalendarOff, Stethoscope,
  ChevronDown, LayoutGrid, HeartPulse, BookOpen,
  PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import logoSstlink from "@/assets/logo-sstlink.png";

const STORAGE_KEY = "sstlink:sidebar:expanded";

type NavItem = {
  title: string;
  url: string;
  icon: typeof LayoutDashboard;
  badge?: boolean;
  badgeCount?: number;
  color?: string;
};

type NavCategory = {
  id: string;
  title: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
};

const categories: NavCategory[] = [
  {
    id: "general",
    title: "General",
    icon: LayoutGrid,
    items: [
      { title: "Inicio", url: "/dashboard", icon: LayoutDashboard },
      { title: "SG-SST", url: "/sgsst", icon: ShieldCheck },
    ],
  },
  {
    id: "personas",
    title: "Personas",
    icon: Users,
    items: [
      { title: "Trabajadores", url: "/trabajadores", icon: Users },
      { title: "Clientes", url: "/clientes", icon: UserCheck },
      { title: "Proveedores", url: "/proveedores", icon: Truck },
    ],
  },
  {
    id: "salud",
    title: "Salud y riesgos",
    icon: HeartPulse,
    items: [
      { title: "Accidentalidad", url: "/accidentalidad", icon: AlertTriangle },
      { title: "Ausentismo", url: "/ausentismo", icon: CalendarOff },
      { title: "Exámenes Médicos", url: "/examenes-medicos", icon: Stethoscope },
    ],
  },
  {
    id: "gestion",
    title: "Gestión",
    icon: BookOpen,
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
  { title: "Soporte", url: "#soporte", icon: MessageCircle, color: "#22C55E" },
];

export function AppSidebar() {
  const location = useLocation();
  const { empresa } = useAuth();
  const [pendingEnlaces, setPendingEnlaces] = useState(0);

  useEffect(() => {
    if (!empresa?.id) { setPendingEnlaces(0); return; }
    let cancelled = false;
    (async () => {
      try {
        const { count } = await (supabase as any)
          .from("solicitudes_enlace")
          .select("id", { count: "exact", head: true })
          .eq("empresa_proveedor_id", empresa.id)
          .eq("estado", "pendiente");
        if (!cancelled) setPendingEnlaces(count ?? 0);
      } catch {
        if (!cancelled) setPendingEnlaces(0);
      }
    })();
    return () => { cancelled = true; };
  }, [empresa?.id]);

  // Categoría activa por ruta — para abrirla por defecto
  const activeCategoryId = categories.find((c) =>
    c.items.some((i) => i.url === location.pathname)
  )?.id;

  const [openMap, setOpenMap] = useState<Record<string, boolean>>(() =>
    categories.reduce((acc, c) => {
      acc[c.id] = activeCategoryId ? c.id === activeCategoryId : c.id === "general";
      return acc;
    }, {} as Record<string, boolean>)
  );

  const toggle = (id: string) =>
    setOpenMap((prev) => ({ ...prev, [id]: !prev[id] }));

  // Estado expandido/compacto persistido en localStorage
  const [expanded, setExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, expanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [expanded]);

  // Ref al <nav> raíz para navegación con flechas entre todos los elementos focuseables
  const navRef = useRef<HTMLElement>(null);

  const focusables = () => {
    if (!navRef.current) return [] as HTMLElement[];
    return Array.from(
      navRef.current.querySelectorAll<HTMLElement>('[data-sidebar-focusable="true"]')
    ).filter((el) => !el.hasAttribute("disabled"));
  };

  const moveFocus = (current: HTMLElement, dir: 1 | -1) => {
    const items = focusables();
    const idx = items.indexOf(current);
    if (idx === -1) return;
    const next = items[(idx + dir + items.length) % items.length];
    next?.focus();
  };

  const handleNavKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (!target.matches('[data-sidebar-focusable="true"]')) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(target, 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(target, -1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusables()[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const items = focusables();
      items[items.length - 1]?.focus();
    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // En toggles de categoría: → abre, ← cierra
      const catId = target.getAttribute("data-category-toggle");
      if (catId) {
        e.preventDefault();
        setOpenMap((prev) => ({ ...prev, [catId]: e.key === "ArrowRight" }));
      }
    }
  };

  const focusRing =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface";

  const renderItem = (item: NavItem) => {
    const isActive = location.pathname === item.url;
    const link = (
      <NavLink
        to={item.url}
        data-sidebar-focusable="true"
        aria-current={isActive ? "page" : undefined}
        aria-label={item.title}
        className={cn(
          "group relative flex items-center rounded-lg",
          "transition-all duration-200 ease-out",
          focusRing,
          expanded
            ? "w-[calc(100%-1rem)] h-9 px-2.5 gap-2.5 mx-2 active:scale-[0.99]"
            : "w-10 h-10 justify-center hover:scale-125 hover:-translate-y-0.5 active:scale-110",
          isActive
            ? "bg-accent text-accent-foreground shadow-sm"
            : "text-hint hover:bg-background hover:text-foreground"
        )}
      >
        <item.icon
          className={cn(
            "shrink-0 transition-transform duration-200",
            expanded ? "w-[18px] h-[18px]" : "w-[18px] h-[18px] group-hover:scale-110"
          )}
          style={item.color ? { color: item.color } : undefined}
          aria-hidden="true"
        />
        {expanded && (
          <span className="text-[13px] truncate">{item.title}</span>
        )}
        {item.badgeCount && item.badgeCount > 0 ? (
          <>
            <span
              className={cn(
                "absolute min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground",
                "text-[9px] font-medium flex items-center justify-center leading-none",
                expanded ? "top-1.5 right-2" : "-top-0.5 -right-0.5"
              )}
              aria-hidden="true"
            >
              {item.badgeCount > 99 ? "99+" : item.badgeCount}
            </span>
            <span className="sr-only">({item.badgeCount} pendientes)</span>
          </>
        ) : item.badge && (
          <>
            <span
              className={cn(
                "absolute w-1.5 h-1.5 rounded-full bg-destructive",
                expanded ? "top-2 right-2.5" : "top-1.5 right-1.5"
              )}
              aria-hidden="true"
            />
            <span className="sr-only">(novedades)</span>
          </>
        )}
      </NavLink>
    );

    // En modo expandido, los labels son visibles → no necesitamos tooltip
    if (expanded) return <div key={item.url} className="w-full">{link}</div>;

    return (
      <Tooltip key={item.url}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="bg-foreground text-background text-[11px]">
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  };

  const renderCategory = (cat: NavCategory) => {
    const open = openMap[cat.id];
    const hasActive = cat.items.some((i) => i.url === location.pathname);
    const headerId = `sidebar-cat-header-${cat.id}`;
    const panelId = `sidebar-cat-panel-${cat.id}`;

    const headerBtn = (
      <button
        id={headerId}
        type="button"
        onClick={() => toggle(cat.id)}
        data-sidebar-focusable="true"
        data-category-toggle={cat.id}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`${cat.title}, ${open ? "contraer" : "expandir"} categoría`}
        className={cn(
          "group flex items-center rounded-md relative",
          "transition-all duration-200 ease-out",
          "text-hint/70 hover:text-foreground hover:bg-background",
          focusRing,
          hasActive && "text-foreground",
          expanded
            ? "w-[calc(100%-1rem)] h-7 px-2.5 gap-2 mx-2 justify-between"
            : "w-10 h-7 justify-center"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <cat.icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {expanded && (
            <span className="text-[11px] uppercase tracking-wide truncate">
              {cat.title}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-2.5 h-2.5 transition-transform duration-200 shrink-0",
            expanded ? "" : "ml-0.5",
            !open && "-rotate-90"
          )}
          aria-hidden="true"
        />
      </button>
    );

    return (
      <div
        key={cat.id}
        role="group"
        aria-labelledby={headerId}
        className="flex flex-col items-center w-full"
      >
        {expanded ? (
          headerBtn
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>{headerBtn}</TooltipTrigger>
            <TooltipContent side="right" className="bg-foreground text-background text-[11px]">
              {cat.title}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Items de la categoría */}
        <div
          id={panelId}
          role="region"
          aria-labelledby={headerId}
          aria-hidden={!open}
          className={cn(
            "flex flex-col gap-1 overflow-hidden transition-all duration-300 ease-out w-full",
            expanded ? "items-stretch" : "items-center",
            open ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
          )}
        >
          {open && cat.items.map(renderItem)}
        </div>

        {/* Separador sutil */}
        <div
          className={cn("h-px bg-border/60 my-2", expanded ? "w-[calc(100%-1.5rem)] mx-3" : "w-6")}
          aria-hidden="true"
        />
      </div>
    );
  };

  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-surface border-r-[0.5px] border-border py-4 shrink-0 overflow-y-auto",
        "transition-[width] duration-300 ease-out",
        expanded ? "w-[220px] items-stretch" : "w-16 items-center"
      )}
    >
      {/* Skip link para saltar al contenido principal */}
      <a
        href="#main-content"
        className={cn(
          "sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50",
          "focus:bg-foreground focus:text-background focus:px-2 focus:py-1 focus:rounded"
        )}
      >
        Saltar al contenido
      </a>

      {/* Logo + toggle */}
      <div
        className={cn(
          "flex items-center mb-4",
          expanded ? "justify-between px-3" : "flex-col gap-2 justify-center"
        )}
      >
        <div className={cn("flex items-center gap-2", expanded && "min-w-0")}>
          <img src={logoSstlink} alt="SSTLink" className="w-9 h-9 object-contain shrink-0" />
          {expanded && (
            <span className="text-[14px] font-medium text-foreground truncate">SSTLink</span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-label={expanded ? "Contraer barra lateral" : "Expandir barra lateral"}
              aria-pressed={expanded}
              className={cn(
                "w-7 h-7 flex items-center justify-center rounded-md",
                "text-hint hover:text-foreground hover:bg-background",
                "transition-colors duration-200",
                focusRing
              )}
            >
              <ToggleIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-foreground text-background text-[11px]">
            {expanded ? "Contraer" : "Expandir"}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Navegación principal */}
      <nav
        ref={navRef}
        aria-label="Navegación principal"
        onKeyDown={handleNavKeyDown}
        className={cn(
          "flex flex-col flex-1 w-full",
          expanded ? "items-stretch" : "items-center"
        )}
      >
        {categories.map(renderCategory)}
      </nav>

      {/* Bottom nav */}
      <nav
        aria-label="Navegación secundaria"
        onKeyDown={handleNavKeyDown}
        className={cn(
          "flex flex-col gap-1 mt-auto pt-2 w-full",
          expanded ? "items-stretch" : "items-center"
        )}
      >
        {bottomItems.map(renderItem)}
      </nav>
    </aside>
  );
}
