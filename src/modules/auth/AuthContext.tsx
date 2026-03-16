import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import {
  clearLocalPreviewMode,
  enableLocalPreviewMode,
  isLocalPreviewModeEnabled,
  LOCAL_AUTH_SESSION_KEY,
} from "./authMode";
import {
  authenticateLocalUsuario,
  getLocalUsuarioById,
} from "../soil-analysis/repository";

type PerfilAcceso = "admin" | "operador";

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

function isLocalPreviewSession(value: Session | null | undefined): boolean {
  return Boolean(value?.access_token?.startsWith("preview-token-"));
}

function buildLocalAuthState(localUser: {
  id: string;
  nombre: string | null;
  email: string | null;
  perfil_acceso: PerfilAcceso;
  estado: "activo" | "inactivo";
}) {
  const mockUser = {
    id: localUser.id,
    email: localUser.email ?? "",
  } as User;
  const mockSession = {
    access_token: `preview-token-${localUser.id}`,
    token_type: "bearer" as const,
    expires_in: 3600,
    refresh_token: `preview-refresh-${localUser.id}`,
    user: mockUser,
  } as Session;
  const mockPerfil: UsuarioPerfil = {
    id: localUser.id,
    nombre: localUser.nombre,
    email: localUser.email,
    perfil_acceso: localUser.perfil_acceso,
    estado: localUser.estado,
  };

  return {
    mockUser,
    mockSession,
    mockPerfil,
  };
}

function restoreLocalAuthState() {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(LOCAL_AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { userId?: string };
    if (!parsed.userId) return null;

    const localUser = getLocalUsuarioById(parsed.userId);
    if (!localUser || localUser.estado !== "activo") {
      localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
      return null;
    }

    return buildLocalAuthState(localUser);
  } catch (_error) {
    localStorage.removeItem(LOCAL_AUTH_SESSION_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapAttemptedRef = useRef<string | null>(null);
  const perfilRequestRef = useRef<Promise<UsuarioPerfil | null> | null>(null);
  const perfilRequestUserIdRef = useRef<string | null>(null);
  const sessionSyncRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const syncSessionState = (activeSession: Session | null) => {
      const syncId = ++sessionSyncRef.current;

      void (async () => {
        if (!mounted) return;

        if (activeSession?.user) {
          setLoading(true);
          setSession(activeSession);
          setUser(activeSession.user);

          const resolvedPerfil = await getPerfilForUser(
            activeSession.user,
            bootstrapAttemptedRef,
            perfilRequestRef,
            perfilRequestUserIdRef
          );

          if (!mounted || syncId !== sessionSyncRef.current) return;

          if (!resolvedPerfil) {
            await supabase.auth.signOut();
            if (!mounted || syncId !== sessionSyncRef.current) return;
            setSession(null);
            setUser(null);
            setPerfil(null);
          } else {
            setPerfil(resolvedPerfil);
          }

          setLoading(false);
          return;
        }

        if (isLocalPreviewModeEnabled()) {
          const localAuth = restoreLocalAuthState();
          if (localAuth) {
            setSession(localAuth.mockSession);
            setUser(localAuth.mockUser);
            setPerfil(localAuth.mockPerfil);
          } else {
            setSession(null);
            setUser(null);
            setPerfil(null);
            clearLocalPreviewMode();
          }
        } else {
          setSession(null);
          setUser(null);
          setPerfil(null);
        }

        setLoading(false);
      })();
    };

    const init = async () => {
      try {
        const {
          data: { session: currentSession }
        } = await supabase.auth.getSession();

        if (!mounted) return;

        syncSessionState(currentSession);
      } catch (err) {
        console.error("Auth initialization failed:", err);
        if (mounted) setLoading(false);
      } finally {
        // `syncSessionState` controls the loading lifecycle.
      }
    };

    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (
        !newSession &&
        isLocalPreviewModeEnabled()
      ) {
        return;
      }

      if (event === "SIGNED_OUT") {
        bootstrapAttemptedRef.current = null;
      }

      syncSessionState(newSession);
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
        if (isLocalPreviewModeEnabled()) {
          const localUser = authenticateLocalUsuario(email, password);
          if (!localUser) {
            return { error: "Credenciais locais inválidas." };
          }

          const localAuth = buildLocalAuthState(localUser);
          setSession(localAuth.mockSession);
          setUser(localAuth.mockUser);
          setPerfil(localAuth.mockPerfil);
          enableLocalPreviewMode();
          localStorage.setItem(
            LOCAL_AUTH_SESSION_KEY,
            JSON.stringify({ userId: localUser.id })
          );
          return {};
        }

        setLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          setLoading(false);
          return { error: error.message };
        }

        if (!data.session?.user) {
          setLoading(false);
          return { error: "Nao foi possivel iniciar a sessao." };
        }

        setSession(data.session);
        setUser(data.session.user);

        const resolvedPerfil = await getPerfilForUser(
          data.session.user,
          bootstrapAttemptedRef,
          perfilRequestRef,
          perfilRequestUserIdRef
        );

        if (!resolvedPerfil) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setPerfil(null);
          setLoading(false);
          return {
            error:
              "Nao foi possivel carregar o perfil do usuario. Confirme se o bootstrap do admin foi concluido no Supabase.",
          };
        }

        setPerfil(resolvedPerfil);
        setLoading(false);
        return {};
      },
      async signOut() {
        if (isSupabaseConfigured && !isLocalPreviewSession(session)) {
          await supabase.auth.signOut();
        }
        setSession(null);
        setUser(null);
        setPerfil(null);
        bootstrapAttemptedRef.current = null;
        clearLocalPreviewMode();
      }
    }),
    [session, user, perfil, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function fetchPerfil(userId: string): Promise<UsuarioPerfil | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, perfil_acceso, estado")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error cargando perfil de usuario", error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    nombre: data.nombre,
    email: data.email,
    perfil_acceso: data.perfil_acceso,
    estado: data.estado,
  };
}

async function tryBootstrapFirstAdmin(user: User): Promise<void> {
  const tenantName =
    typeof user.user_metadata?.tenant_name === "string"
      ? user.user_metadata.tenant_name
      : undefined;
  const adminName =
    typeof user.user_metadata?.nombre === "string" ? user.user_metadata.nombre : undefined;

  const { error } = await supabase.functions.invoke("bootstrap-first-admin", {
    body: {
      tenantName,
      adminName,
    },
  });

  if (error) {
    console.warn("Bootstrap do primeiro admin não executado:", error.message);
  }
}

async function getPerfilForUser(
  user: User,
  bootstrapAttemptedRef: { current: string | null },
  perfilRequestRef: { current: Promise<UsuarioPerfil | null> | null },
  perfilRequestUserIdRef: { current: string | null }
): Promise<UsuarioPerfil | null> {
  if (perfilRequestRef.current && perfilRequestUserIdRef.current === user.id) {
    return perfilRequestRef.current;
  }

  const request = (async () => {
    let perfil = await fetchPerfil(user.id);

    if (!perfil && bootstrapAttemptedRef.current !== user.id) {
      bootstrapAttemptedRef.current = user.id;
      await tryBootstrapFirstAdmin(user);
      perfil = await fetchPerfil(user.id);
    }

    return perfil;
  })();

  perfilRequestRef.current = request;
  perfilRequestUserIdRef.current = user.id;

  try {
    return await request;
  } finally {
    if (perfilRequestRef.current === request) {
      perfilRequestRef.current = null;
      perfilRequestUserIdRef.current = null;
    }
  }
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
