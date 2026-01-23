import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@core/supabase/client";
import type { User, Session, AuthError } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: "owner" | "client" | null;
  businessActive: boolean | null;
  loading: boolean;
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
  ) => Promise<{ error: AuthError | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: AuthError | null }>;
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
      // Ignore localStorage errors
    }
  };

  const clearRoleCache = (userId?: string) => {
    try {
      if (userId) {
        localStorage.removeItem(`${ROLE_CACHE_KEY}-${userId}`);
      } else {
        // Clear all role caches
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(ROLE_CACHE_KEY)) {
            localStorage.removeItem(key);
          }
        });
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      // Check cache first
      const cachedRole = getCachedRole(userId);
      if (cachedRole) {
        return cachedRole;
      }

      try {
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Role fetch timeout")), 2000);
        });

        const queryPromise = supabase
          .from("profiles")
          .select("user_role")
          .eq("user_id", userId)
          .maybeSingle();

        const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;

        if (error) {
          // If table doesn't exist or permission denied, assume client role
          if (error.message?.includes("relation") || error.message?.includes("permission")) {
            const defaultRole = "client" as const;
            setCachedRole(userId, defaultRole);
            return defaultRole;
          }
          console.error("Error fetching role:", error);
          const defaultRole = "client" as const;
          setCachedRole(userId, defaultRole);
          return defaultRole;
        }

        const userRole = data ? (data.user_role as "owner" | "client") : "client";
        setCachedRole(userId, userRole);
        return userRole;
      } catch (error: any) {
        // If timeout or any other error, default to client
        const defaultRole = "client" as const;
        setCachedRole(userId, defaultRole);
        return defaultRole;
      }
    };

    const fetchBusinessStatus = async (userId: string) => {
      try {
        // First get the profile id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError || !profile) {
          console.error('Error fetching profile for business status:', profileError);
          return null;
        }

        // Get business active status using profile.id
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .select('active')
          .eq('owner_id', profile.id)
          .maybeSingle();

        if (businessError) {
          console.error('Error fetching business status:', businessError);
          return null;
        }

        return business?.active ?? null;
      } catch (error) {
        console.error('Error in fetchBusinessStatus:', error);
        return null;
      }
    };

    const initializeAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = await fetchRole(session.user.id);
        setRole(userRole);
        
        // Fetch business status only for owners
        if (userRole === 'owner') {
          const active = await fetchBusinessStatus(session.user.id);
          setBusinessActive(active);
        } else {
          setBusinessActive(null);
        }
      } else {
        setRole(null);
        setBusinessActive(null);
      }
      setLoading(false);
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const userRole = await fetchRole(session.user.id);
        setRole(userRole);
        
        // Fetch business status only for owners
        if (userRole === 'owner') {
          const active = await fetchBusinessStatus(session.user.id);
          setBusinessActive(active);
        } else {
          setBusinessActive(null);
        }
      } else {
        setRole(null);
        setBusinessActive(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            user_role: 'client',
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
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      return { error: null };
    } catch (error) {
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
      console.log('SignUpOwner: Starting signup with data:', {
        email,
        fullName,
        businessName,
        businessAddress,
        phoneNumber,
      });

      // Create user with phone number in metadata
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            user_role: 'owner',
            business_name: businessName,
            business_address: businessAddress,
          },
        },
      });

      if (error) {
        console.error('SignUpOwner: Auth signup error:', error);
        return { error };
      }

      console.log('SignUpOwner: User created successfully:', data.user?.id);

      // Profile and business will be created by Supabase triggers

      return { error: null };
    } catch (error) {
      console.error('SignUpOwner: Unexpected error:', error);
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
    signUp,
    signUpOwner,
    signIn,
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
