import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@core/supabase/client";
import { type User, type Session, type AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "owner" | "client" | "admin" | null;
  /** profiles.id del usuario autenticado (distinto de auth.users.id).
   *  Disponible tras el primer fetchRole exitoso. Centraliza el lookup
   *  para que ningún componente necesite re-consultar la tabla profiles. */
  profileId: string | null;
  businessActive: boolean | null;
  loading: boolean;
  isAuthReady: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phoneNumber: string
  ) => Promise<{ error: AuthError | null }>;
  signUpOwner: (
    email: string,
    password: string,
    fullName: string,
    businessName: string,
    businessAddress: string,
    phoneNumber: string
  ) => Promise<{ error: AuthError | null; userId?: string }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
  signInWithGoogle: () => Promise<{ error: AuthError | null }>;
  signInWithFacebook: () => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"owner" | "client" | "admin" | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [businessActive, setBusinessActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    // Migración: eliminar cualquier entrada de caché de rol que pueda haber
    // quedado de versiones anteriores (evita roles incorrectos entre sesiones)
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("dlizza-role")) localStorage.removeItem(key);
      });
    } catch {
      // ignore — entorno sin localStorage (SSR, tests)
    }

    let cancelled = false;

    /**
     * Fuente de verdad única para el rol:
     * 1. Consulta profiles (autoritativa — única fuente válida)
     * 2. Si profiles falla o no responde, retorna "client" de forma segura (fail closed)
     * 3. NUNCA usa user_metadata del JWT como fallback: ese campo es establecido por el
     *    cliente al momento del registro y puede ser manipulado para auto-asignarse roles
     *    elevados (owner/admin) si la DB está temporalmente no disponible.
     * 4. Nunca usa caché local — elimina riesgo de roles incorrectos entre sesiones
     */
    const fetchRole = async (
      userId: string,
    ): Promise<{ role: "owner" | "client" | "admin"; profileId: string | null }> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, user_role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data?.user_role) {
          return {
            role: data.user_role as "owner" | "client" | "admin",
            profileId: data.id ?? null,
          };
        }
      } catch {
        // profiles no respondió — fail closed: retornar el rol mínimo
      }

      // Fail closed: si la DB no responde, asumir rol mínimo.
      // No se usa user_metadata (inseguro, manipulable por el cliente).
      return { role: "client", profileId: null };
    };

    const fetchBusinessStatus = async (userId: string): Promise<boolean> => {
      const MAX_ATTEMPTS = 5;
      const RETRY_DELAY_MS = 1500;
      const QUERY_TIMEOUT_MS = 8000;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          const profilePromise = supabase
            .from("profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`TIMEOUT profiles intento ${attempt}`)), QUERY_TIMEOUT_MS)
          );

          const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]) as Awaited<typeof profilePromise>;

          if (profileError) {
            if (attempt < MAX_ATTEMPTS) {
              await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
              continue;
            }
            return false;
          }

          if (!profile) {
            if (attempt < MAX_ATTEMPTS) {
              await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
              continue;
            }
            return false;
          }

          const businessPromise = supabase
            .from("businesses")
            .select("active")
            .eq("owner_id", profile.id)
            .maybeSingle();

          const businessTimeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`TIMEOUT businesses intento ${attempt}`)), QUERY_TIMEOUT_MS)
          );

          const { data: business, error: businessError } = await Promise.race([businessPromise, businessTimeoutPromise]) as Awaited<typeof businessPromise>;

          if (businessError) {
            if (attempt < MAX_ATTEMPTS) {
              await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
              continue;
            }
            return false;
          }

          if (!business) {
            if (attempt < MAX_ATTEMPTS) {
              await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
              continue;
            }
            return false;
          }

          return business.active ?? false;
        } catch {
          if (attempt < MAX_ATTEMPTS) {
            await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
          }
        }
      }

      return false;
    };

    const applySession = async (_event: string, currentSession: Session | null, previousUserId?: string) => {
      if (cancelled) return;

      // Solo bajar isAuthReady cuando cambia el usuario (login, logout, cambio de cuenta).
      // En eventos de refresco de token (TOKEN_REFRESHED) el userId es el mismo,
      // por lo que no hace falta bloquear la UI con el spinner — el rol no cambia.
      // Esto evita flashes de spinner cada ~55 min cuando Supabase renueva el JWT.
      const incomingUserId = currentSession?.user?.id ?? null;
      const userChanged = incomingUserId !== previousUserId;
      if (userChanged) {
        setIsAuthReady(false);
      }

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        const { role: userRole, profileId: fetchedProfileId } = await fetchRole(currentSession.user.id);
        if (cancelled) return;
        setRole(userRole);
        setProfileId(fetchedProfileId);

        if (userRole === "owner") {
          const active = await fetchBusinessStatus(currentSession.user.id);
          if (cancelled) return;
          setBusinessActive(active);
        } else {
          setBusinessActive(null);
        }
      } else {
        setRole(null);
        setProfileId(null);
        setBusinessActive(null);
      }

      setLoading(false);
      setIsAuthReady(true);
    };

    // Rastrea el userId de la sesión anterior para detectar cambios de usuario.
    // Permite que applySession decida si debe mostrar el spinner (userChanged=true)
    // o actualizar silenciosamente (TOKEN_REFRESHED del mismo usuario).
    let lastKnownUserId: string | null = null;

    // Se usa únicamente onAuthStateChange (que incluye el evento INITIAL_SESSION)
    // como fuente de verdad. Llamar también a getSession() causaba que applySession
    // se ejecutara dos veces al inicio: una por INITIAL_SESSION y otra por la
    // Promise de getSession(), duplicando las queries de rol y causando flicker.
    // Queries are deferred with setTimeout(0) to avoid the Supabase JS v2 deadlock
    // that occurs when making DB calls directly inside onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      const incomingId = currentSession?.user?.id ?? null;
      const prevId = lastKnownUserId;
      lastKnownUserId = incomingId;
      setTimeout(() => {
        applySession(event, currentSession, prevId ?? undefined);
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string, phoneNumber: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            user_role: "client",
          },
        },
      });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };
      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      if (error) {
        console.error('❌ [AuthContext] Google Auth Error:', error);
        return { error };
      }
      return { error: null };
    } catch (error) {
      console.error('❌ [AuthContext] Google Auth Exception:', error);
      return { error: error as AuthError };
    }
  };

  const signInWithFacebook = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/`,
        }
      });
      if (error) {
        console.error('❌ [AuthContext] Facebook Auth Error:', error);
        return { error };
      }
      return { error: null };
    } catch (error) {
      console.error('❌ [AuthContext] Facebook Auth Exception:', error);
      return { error: error as AuthError };
    }
  };

  const signUpOwner = async (
    email: string,
    password: string,
    fullName: string,
    businessName: string,
    businessAddress: string,
    phoneNumber: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            user_role: "owner",
            business_name: businessName,
            business_address: businessAddress,
            business_phone: phoneNumber,
          },
        },
      });

      if (error) {
        console.error("SignUpOwner: Auth signup error:", error);
        return { error };
      }

      return { error: null, userId: data.user?.id };
    } catch (error) {
      console.error("SignUpOwner: Unexpected error:", error);
      return { error: error as AuthError };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const forgotPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (newPassword: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error };
  };

  const value = {
    user,
    session,
    role,
    profileId,
    businessActive,
    loading,
    isAuthReady,
    signUp,
    signUpOwner,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    forgotPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
