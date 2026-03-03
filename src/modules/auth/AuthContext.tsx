import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";

type PerfilAcceso = "admin" | "rtv" | "cliente";

export interface UsuarioPerfil {
  id: string;
  nombre: string | null;
  email: string | null;
  perfil_acceso: PerfilAcceso;
  estado: "activo" | "inactivo";
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  perfil: UsuarioPerfil | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { session: currentSession }
      } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(currentSession ?? null);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await loadPerfil(currentSession.user.id, setPerfil);
      }

      setLoading(false);
    };

    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await loadPerfil(newSession.user.id, setPerfil);
      } else {
        setPerfil(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      perfil,
      loading,
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          return { error: error.message };
        }
        setSession(data.session);
        setUser(data.session?.user ?? null);
        if (data.session?.user) {
          await loadPerfil(data.session.user.id, setPerfil);
        }
        return {};
      },
      async signOut() {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setPerfil(null);
      }
    }),
    [session, user, perfil, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function loadPerfil(
  userId: string,
  setPerfil: (perfil: UsuarioPerfil | null) => void
) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, perfil_acceso, estado")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error cargando perfil de usuario", error.message);
    setPerfil(null);
    return;
  }

  if (!data) {
    setPerfil(null);
    return;
  }

  const perfil: UsuarioPerfil = {
    id: data.id,
    nombre: data.nombre,
    email: data.email,
    perfil_acceso: data.perfil_acceso,
    estado: data.estado
  };

  setPerfil(perfil);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

