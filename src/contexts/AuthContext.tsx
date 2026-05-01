import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Empresa {
  id: string;
  nombre: string;
  nit: string | null;
  nivel_proteccion: string | null;
  num_empleados_directos: number | null;
  sector_industria: string | null;
  tiene_contratistas: boolean | null;
  logo_url: string | null;
}

interface Usuario {
  id: string;
  nombre: string;
  apellido: string | null;
  cargo: string | null;
  empresa_id: string | null;
  nombre_completo?: string | null;
  rol?: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  usuario: Usuario | null;
  empresa: Empresa | null;
  loading: boolean;
  authError: string | null;
}

const AuthContext = createContext<AuthState>({
  session: null,
  user: null,
  usuario: null,
  empresa: null,
  loading: true,
  authError: null,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    usuario: null,
    empresa: null,
    loading: true,
    authError: null,
  });

  useEffect(() => {
    // Set up listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          setState(prev => ({ ...prev, session, user: session.user, authError: null }));
          // Defer data fetch to avoid deadlocks
          setTimeout(() => fetchUserData(session.user), 0);
        } else {
          setState({ session: null, user: null, usuario: null, empresa: null, loading: false, authError: null });
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState(prev => ({ ...prev, session, user: session.user, authError: null }));
        fetchUserData(session.user);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function ensureProfileFromMetadata(authUser: User) {
    const metadata = authUser.user_metadata ?? {};
    const empresaNombre = typeof metadata.empresa_nombre === "string" ? metadata.empresa_nombre.trim() : "";
    const empresaNit = typeof metadata.empresa_nit === "string" ? metadata.empresa_nit.trim() : null;
    const empresaSector = typeof metadata.empresa_sector === "string" ? metadata.empresa_sector.trim() : null;
    const empresaNumEmpleados = typeof metadata.empresa_num_empleados === "string" ? Number.parseInt(metadata.empresa_num_empleados, 10) || 0 : 0;
    const empresaTieneContratistas = metadata.empresa_tiene_contratistas === "true" || metadata.empresa_tiene_contratistas === true;
    const fullName = typeof metadata.nombre === "string" && metadata.nombre.trim().length > 0
      ? metadata.nombre.trim()
      : authUser.email ?? "Usuario";
    const [firstName, ...restName] = fullName.split(" ").filter(Boolean);
    const nombre = firstName || fullName;
    const apellido = restName.join(" ") || null;

    // ── Invite token path ─────────────────────────────────────────────────
    const inviteToken = typeof metadata.invite_token === "string" ? metadata.invite_token : null;
    if (inviteToken) {
      const { data: inv } = await (supabase as any)
        .from("invitaciones")
        .select("empresa_id, rol, empresas(id, nombre, nit, nivel_proteccion, num_empleados_directos, sector_industria, tiene_contratistas)")
        .eq("token", inviteToken)
        .eq("estado", "pendiente")
        .single();
      if (inv) {
        const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");
        const { data: usuarioCreado } = await supabase.from("usuarios").insert({
          user_id: authUser.id,
          auth_user_id: authUser.id,
          empresa_id: inv.empresa_id,
          nombre,
          apellido,
          nombre_completo: nombreCompleto,
          email: authUser.email ?? "",
          rol: inv.rol,
        }).select("id, nombre, apellido, cargo, empresa_id, nombre_completo, rol").single();

        await supabase.from("user_roles").insert({ user_id: authUser.id, role: inv.rol });
        await (supabase as any).from("invitaciones").update({ estado: "aceptada", accepted_at: new Date().toISOString() }).eq("token", inviteToken);

        if (usuarioCreado && inv.empresas) {
          return { usuario: usuarioCreado, empresa: inv.empresas, error: null };
        }
      }
      return { usuario: null, empresa: null, error: "Invitación inválida o expirada. Contacta al administrador." };
    }

    if (!empresaNombre) {
      return { usuario: null, empresa: null, error: "Perfil de usuario no encontrado. Contacta soporte." };
    }

    let empresa: Empresa | null = null;

    if (empresaNit) {
      const { data: empresaExistente } = await supabase
        .from("empresas")
        .select("id, nombre, nit, nivel_proteccion, num_empleados_directos, sector_industria, tiene_contratistas")
        .eq("nit", empresaNit)
        .maybeSingle();

      empresa = empresaExistente;
    }

    if (!empresa) {
      const { data: empresaCreada, error: empresaError } = await supabase
        .from("empresas")
        .insert({
          nombre: empresaNombre,
          nit: empresaNit,
          sector_industria: empresaSector,
          num_empleados_directos: empresaNumEmpleados,
          tiene_contratistas: empresaTieneContratistas,
        })
        .select("id, nombre, nit, nivel_proteccion, num_empleados_directos, sector_industria, tiene_contratistas")
        .single();

      if (empresaError || !empresaCreada) {
        return { usuario: null, empresa: null, error: empresaError?.message ?? "Empresa no encontrada. Contacta soporte." };
      }

      empresa = empresaCreada;
    }

    const nombreCompleto = [nombre, apellido].filter(Boolean).join(" ");

    const { data: usuarioCreado, error: usuarioError } = await supabase
      .from("usuarios")
      .insert({
        user_id: authUser.id,
        auth_user_id: authUser.id,
        empresa_id: empresa.id,
        nombre,
        apellido,
        cargo: null,
        nombre_completo: nombreCompleto,
        email: authUser.email ?? "",
        rol: "administrador",
      })
      .select("id, nombre, apellido, cargo, empresa_id, nombre_completo, rol")
      .single();

    if (usuarioError || !usuarioCreado) {
      return { usuario: null, empresa: null, error: usuarioError?.message ?? "Perfil de usuario no encontrado. Contacta soporte." };
    }

    await supabase.from("user_roles").insert({ user_id: authUser.id, role: "administrador" });

    return { usuario: usuarioCreado, empresa, error: null };
  }

  async function fetchUserData(authUser: User) {
    try {
      console.log("=== DASHBOARD LOAD DEBUG ===");
      console.log("A. Auth user id:", authUser?.id);
      console.log("B. Query: usuarios where auth_user_id =", authUser?.id);

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("id, nombre, apellido, cargo, empresa_id, nombre_completo, rol")
        .or(`auth_user_id.eq.${authUser.id},user_id.eq.${authUser.id}`)
        .maybeSingle();

      console.log("C. Usuario result:", usuarioData, usuarioError);

      let usuario = usuarioData;

      if (!usuario) {
        const repaired = await ensureProfileFromMetadata(authUser);

        if (repaired.error || !repaired.usuario || !repaired.empresa) {
          console.error("usuario not found for auth_user_id:", authUser.id, usuarioError ?? repaired.error);
          setState(prev => ({ ...prev, usuario: null, empresa: null, loading: false, authError: repaired.error ?? "Perfil de usuario no encontrado. Contacta soporte." }));
          return;
        }

        console.log("C. Usuario result:", repaired.usuario, null);
        console.log("D. Empresa result:", repaired.empresa, null);
        setState(prev => ({ ...prev, usuario: repaired.usuario, empresa: repaired.empresa, loading: false, authError: null }));
        return;
      }

      let empresa: Empresa | null = null;
      let empresaError: Error | null = null;

      if (usuario.empresa_id) {
        const { data, error } = await supabase
          .from("empresas")
          .select("id, nombre, nit, nivel_proteccion, num_empleados_directos, sector_industria, tiene_contratistas")
          .eq("id", usuario.empresa_id)
          .maybeSingle();

        empresa = data;
        empresaError = error;
      }

      console.log("D. Empresa result:", empresa, empresaError);

      if (!empresa) {
        console.error("empresa not found:", usuario.empresa_id, empresaError);
        setState(prev => ({ ...prev, usuario, empresa: null, loading: false, authError: "Empresa no encontrada. Contacta soporte." }));
        return;
      }

      setState(prev => ({ ...prev, usuario, empresa, loading: false, authError: null }));
    } catch (error) {
      setState(prev => ({ ...prev, loading: false, authError: error instanceof Error ? error.message : "Error cargando tu perfil." }));
    }
  }

  return (
    <AuthContext.Provider value={state}>
      {children}
    </AuthContext.Provider>
  );
}
