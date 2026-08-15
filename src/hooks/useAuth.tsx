import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { fetchMe, login as loginCall, signup as signupCall } from "@/features/auth/authApi";
import { setSessionPersistence, supabase } from "@/lib/supabase";
import type { LoginPayload, SignupPayload, User } from "@/types";

interface AuthContextValue {
  user: User | null;
  /** True while the session + profile are being restored from storage. */
  loading: boolean;
  login: (payload: LoginPayload, remember?: boolean) => Promise<User>;
  signup: (payload: SignupPayload) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // The auth user id from the persisted session (null = signed out).
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  // True until the stored session has been read once.
  const [sessionLoading, setSessionLoading] = useState(true);

  // Restore the session on load and react to auth events.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSessionUserId(data.session?.user.id ?? null);
      setSessionLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY" || event === "USER_UPDATED") {
        setSessionUserId(session?.user.id ?? null);
        setSessionLoading(false);
        if (session) void queryClient.invalidateQueries({ queryKey: ["me"] });
      } else if (event === "SIGNED_OUT") {
        setSessionUserId(null);
        setSessionLoading(false);
        queryClient.setQueryData(["me"], null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

  // Load the profile whenever a session exists (guarded by RLS: own row only).
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: sessionUserId !== null,
    retry: false,
    staleTime: 60_000,
  });

  const login = useCallback(
    async (payload: LoginPayload, remember = true): Promise<User> => {
      setSessionPersistence(remember);
      const user = await loginCall(payload, remember);
      setSessionUserId(user.id);
      setSessionLoading(false);
      queryClient.setQueryData(["me"], user);
      return user;
    },
    [queryClient],
  );

  const signup = useCallback(
    async (payload: SignupPayload): Promise<User | null> => {
      setSessionPersistence(true);
      const user = await signupCall(payload);
      if (user) {
        setSessionUserId(user.id);
        setSessionLoading(false);
        queryClient.setQueryData(["me"], user);
      }
      return user;
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    // Best-effort server-side revoke; local state is cleared regardless.
    void supabase.auth.signOut().catch(() => {});
    setSessionUserId(null);
    setSessionLoading(false);
    queryClient.setQueryData(["me"], null);
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: (meQuery.data as User | null) ?? null,
      // Signed out → wait only for the initial restore; signed in → wait for
      // the profile too, so guarded routes never flash.
      loading: sessionUserId === null ? sessionLoading : meQuery.isPending,
      login,
      signup,
      logout,
    }),
    [meQuery.data, meQuery.isPending, sessionUserId, sessionLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
