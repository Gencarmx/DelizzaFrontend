import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@core/supabase/client";
import { type User, type Session, type AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "owner" | "client" | null;
  businessActive: boolean | null;
  loading: boolean;
  isAuthReady: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_CACHE_KEY = "dlizza-role";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<"owner" | "client" | null>(null);
  const [businessActive, setBusinessActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const getCachedRole = (userId: string): "owner" | "client" | null => {
    try {
      const cached = localStorage.getItem(`${ROLE_CACHE_KEY}-${userId}`);
      return cached as "owner" | "client" | null;
    } catch {
      return null;
    }
  };

  const setCachedRole = (userId: string, userRole: "owner" | "client") => {
    try {
      localStorage.setItem(`${ROLE_CACHE_KEY}-${userId}`, userRole);
    } catch {
      // ignore
    }
  };

  const clearRoleCache = (userId?: string) => {
    try {
      if (userId) {
        localStorage.removeItem(`${ROLE_CACHE_KEY}-${userId}`);
      } else {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(ROLE_CACHE_KEY)) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchRole = async (userId: string, userMetadata?: Record<string, unknown>): Promise<"owner" | "client"> => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_role")
          .eq("user_id", userId)
          .maybeSingle();

        if (!error && data?.user_role) {
          const userRole = data.user_role as "owner" | "client";
          setCachedRole(userId, userRole);
          return userRole;
        }
      } catch {
        // fall through to metadata/cache
      }

      if (userMetadata?.user_role) {
        const metadataRole = userMetadata.user_role as "owner" | "client";
        setCachedRole(userId, metadataRole);
        return metadataRole;
      }

      const cachedRole = getCachedRole(userId);
      if (cachedRole) return cachedRole;

      return "client";
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

    const applySession = async (_event: string, currentSession: Session | null) => {
      if (cancelled) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      console.log('🔄 [AuthContext] applySession - Event:', _event, 'User:', currentSession?.user?.id);

      if (currentSession?.user) {
        const userRole = await fetchRole(currentSession.user.id, currentSession.user.user_metadata);
        if (cancelled) return;
        setRole(userRole);

        if (userRole === "owner") {
          const active = await fetchBusinessStatus(currentSession.user.id);
          if (cancelled) return;
          setBusinessActive(active);
        } else {
          setBusinessActive(null);
        }
      } else {
        setRole(null);
        setBusinessActive(null);
      }

      setLoading(false);
      setIsAuthReady(true);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (cancelled) return;
      applySession("INITIAL_SESSION", initialSession ?? null);
    });

    // Queries are deferred with setTimeout(0) to avoid the Supabase JS v2 deadlock
    // that occurs when making DB calls directly inside onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setTimeout(() => {
        applySession(event, currentSession);
      }, 0);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
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
      console.log('🔄 [AuthContext] Initiating Google Auth, Redirect URL:', `${window.location.origin}/`);
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
    if (user?.id) {
      clearRoleCache(user.id);
    }
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    role,
    businessActive,
    loading,
    isAuthReady,
    signUp,
    signUpOwner,
    signIn,
    signInWithGoogle,
    signOut,
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
