// Roles de usuario en SSTLink
// Usar siempre estas constantes — nunca strings directos en el código
export const ROLES = {
  ADMINISTRADOR: "administrador",
  ASISTENTE:     "asistente",
  LECTOR:        "lector",
} as const;

export type UserRole = typeof ROLES[keyof typeof ROLES];

// Checks reutilizables
export const canEdit    = (rol?: string | null) => rol === ROLES.ADMINISTRADOR || rol === ROLES.ASISTENTE;
export const canAdmin   = (rol?: string | null) => rol === ROLES.ADMINISTRADOR;
export const canViewAll = (rol?: string | null) => rol === ROLES.ADMINISTRADOR || rol === ROLES.ASISTENTE;
