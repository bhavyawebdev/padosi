"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { User } from "../db/types";
import { db } from "../db/local-db";
import { createClient } from "@/lib/supabase/client";
import {
  isSessionVerified,
  requiresEmailVerification,
} from "./verification";

interface AuthContextType {
  /** Local Aas-Paas profile used by the demo data layer. */
  user: User | null;
  loading: boolean;
  isGoogleLoading: boolean;
  /** True when the current Supabase session's email is verified. */
  emailVerified: boolean;
  /** True when a Supabase session exists but the email isn't verified yet. */
  requiresVerification: boolean;
  /** Local demo login (no Supabase). */
  login: (email: string) => Promise<{ error?: string }>;
  /** Local demo signup (no Supabase). */
  signup: (email: string, fullName: string) => Promise<{ error?: string }>;
  /** Production email + password sign in (Supabase). */
  signInWithPassword: (
    email: string,
    password: string
  ) => Promise<{ error?: string; requiresVerification?: boolean }>;
  /** Production email signup (Supabase, requires email confirmation). */
  signUpWithEmail: (input: {
    email: string;
    password: string;
    fullName: string;
    neighbourhood?: string;
  }) => Promise<{ error?: string; requiresVerification?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string }>;
  /** Send a password-reset email (Supabase). */
  resetPassword: (email: string) => Promise<{ error?: string }>;
  /** Set a new password for the current session (Supabase). */
  updatePassword: (password: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_ID_KEY = "aas_paas_user_id";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [supabase] = useState(() => createClient());
  // Guards against setState after unmount (e.g. slow IndexedDB reads).
  const mountedRef = useRef(true);

  /**
   * Upsert a Supabase-authenticated identity into the local database so the
   * demo data layer (Nearby / Help / Need / profiles) keeps working while the
   * production Supabase data layer is being adopted.
   */
  const upsertLocalProfile = useCallback(
    async (supabaseUser: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    }) => {
      const email = supabaseUser.email || "";
      const fullName =
        (supabaseUser.user_metadata?.full_name as string) ||
        (supabaseUser.user_metadata?.name as string) ||
        "";
      const avatarUrl =
        (supabaseUser.user_metadata?.avatar_url as string) ||
        (supabaseUser.user_metadata?.picture as string) ||
        "";

      const existing = await db.getUserByEmail(email);

      let localUser: User | null = null;

      if (existing) {
        localUser = await db.updateUser(existing.id, {
          full_name: fullName || existing.full_name,
          avatar_url: avatarUrl || existing.avatar_url,
        });
      } else {
        localUser = await db.createUser({
          email,
          full_name: fullName,
          avatar_url: avatarUrl,
          bio: "",
          neighbourhood: "",
          location_radius: 5,
          neighbour_score: 50,
        });
      }

      if (localUser && mountedRef.current) {
        localStorage.setItem(LOCAL_USER_ID_KEY, localUser.id);
        setUser(localUser);
      }
    },
    []
  );

  const clearLocalSession = useCallback(() => {
    localStorage.removeItem(LOCAL_USER_ID_KEY);
    if (mountedRef.current) setUser(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Initial session restore — Supabase session takes priority, local DB is the
  // fallback for demo accounts that have no Supabase session.
  useEffect(() => {
    const initAuth = async () => {
      let sessionUser: SupabaseUser | null = null;

      if (supabase) {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          sessionUser = session.user;
          setSupabaseUser(session.user);
          await upsertLocalProfile(session.user);
        }
      }

      if (!mountedRef.current) return;

      // No Supabase session → restore the previously stored local user
      // (demo login). Re-assert it only when it differs, so a Supabase
      // upsert above is never overwritten by a stale local record.
      if (!sessionUser) {
        const storedUserId = localStorage.getItem(LOCAL_USER_ID_KEY);
        if (storedUserId) {
          const u = await db.getUser(storedUserId);
          if (u) {
            if (mountedRef.current) setUser(u);
          } else {
            localStorage.removeItem(LOCAL_USER_ID_KEY);
          }
        }
      }

      // Best-effort server-side presence update (last_seen_at) for production.
      if (sessionUser && mountedRef.current) {
        void fetch("/api/auth/heartbeat", { method: "POST" }).catch(() => {
          /* non-critical */
        });
      }

      if (mountedRef.current) setLoading(false);
    };
    initAuth();
  }, [supabase, upsertLocalProfile]);

  // Live auth events. INITIAL_SESSION fires when the client restores a session
  // on load; SIGNED_IN fires on new logins (e.g. after the OAuth callback).
  useEffect(() => {
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        setSupabaseUser(session.user);
        // Keep ProtectedRoute on the spinner until the local profile is
        // synced, so a fresh sign-in never flashes back to /login.
        setLoading(true);
        await upsertLocalProfile(session.user);
        if (mountedRef.current) setLoading(false);
      }
      if (event === "SIGNED_OUT") {
        setSupabaseUser(null);
        clearLocalSession();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, upsertLocalProfile, clearLocalSession]);

  const login = async (email: string) => {
    const u = await db.getUserByEmail(email);
    if (!u) {
      return { error: "User not found. Please sign up." };
    }
    localStorage.setItem(LOCAL_USER_ID_KEY, u.id);
    setUser(u);
    return {};
  };

  const signup = async (email: string, fullName: string) => {
    const existing = await db.getUserByEmail(email);
    if (existing) {
      return { error: "Email already in use." };
    }
    const newUser = await db.createUser({
      email,
      full_name: fullName,
      avatar_url: "",
      bio: "",
      neighbourhood: "Bandra West",
      location_radius: 5,
      neighbour_score: 50,
    });
    localStorage.setItem(LOCAL_USER_ID_KEY, newUser.id);
    setUser(newUser);
    return {};
  };

  const signInWithPassword = async (email: string, password: string) => {
    if (!supabase) {
      return {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
      };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Unverified accounts should be directed to the verification screen.
        if (error.code === "email_not_confirmed") {
          return {
            error: "Please verify your email address before signing in.",
            requiresVerification: true,
          };
        }
        return { error: error.message };
      }
      return {};
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to sign in. Please try again.",
      };
    }
  };

  const signUpWithEmail = async (input: {
    email: string;
    password: string;
    fullName: string;
    neighbourhood?: string;
  }) => {
    if (!supabase) {
      return {
        error:
          "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
      };
    }
    try {
      const { error } = await supabase.auth.signUp({
        email: input.email,
        password: input.password,
        options: {
          data: {
            full_name: input.fullName,
            neighbourhood: input.neighbourhood ?? "",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/home`,
        },
      });
      if (error) return { error: error.message };
      return { requiresVerification: true };
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to create account. Please try again.",
      };
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      return {
        error:
          "Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
      };
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/home`,
        },
      });

      if (error) {
        setIsGoogleLoading(false);
        return { error: error.message };
      }

      // The browser will redirect — isGoogleLoading stays true until then.
      return {};
    } catch (err: unknown) {
      setIsGoogleLoading(false);
      return {
        error:
          err instanceof Error
            ? err.message
            : "Failed to sign in with Google. Please try again.",
      };
    }
  };

  const resetPassword = async (email: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured." };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to send reset link. Please try again.",
      };
    }
  };

  const updatePassword = async (password: string) => {
    if (!supabase) {
      return { error: "Supabase is not configured." };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: error.message };
      return {};
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error ? err.message : "Failed to update password. Please try again.",
      };
    }
  };

  const logout = () => {
    clearLocalSession();
    setSupabaseUser(null);

    // Also sign out of Supabase if available.
    if (supabase) {
      supabase.auth.signOut().catch(() => {
        // Silent failure — local logout already succeeded.
      });
    }
  };

  const emailVerified = !supabaseUser || isSessionVerified(supabaseUser);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isGoogleLoading,
        emailVerified,
        requiresVerification: requiresEmailVerification(supabaseUser),
        login,
        signup,
        signInWithPassword,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
