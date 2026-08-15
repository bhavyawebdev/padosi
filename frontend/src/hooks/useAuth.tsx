import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import { apiLogout, login as loginCall, signup as signupCall, fetchMe } from "@/features/auth/authApi";
import { ApiError, getToken, setToken } from "@/lib/api";
import type { AuthResponse, LoginPayload, SignupPayload, User } from "@/types";

const SESSION_KEY = "lp_session_id";

interface AuthContextValue {
  user: User | null;
  /** True while the session is being rehydrated from the stored token. */
  loading: boolean;
  login: (payload: LoginPayload, remember?: boolean) => Promise<AuthResponse>;
  signup: (payload: SignupPayload) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Rehydrate the session: if a token exists, load /users/me once.
  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: getToken() !== null,
    retry: false,
    staleTime: 60_000,
  });

  // Only a 401 means the token is dead — clear it. Transient network errors
  // (status 0) must NOT log the user out.
  useEffect(() => {
    const err = meQuery.error;
    if (meQuery.isError && err instanceof ApiError && err.status === 401 && getToken() !== null) {
      setToken(null);
      queryClient.setQueryData(["me"], null);
    }
  }, [meQuery.isError, meQuery.error, queryClient]);

  const applyAuth = (data: AuthResponse, remember: boolean) => {
    setToken(data.access_token, remember);
    if (data.session_id) localStorage.setItem(SESSION_KEY, data.session_id);
    queryClient.setQueryData(["me"], data.user);
  };

  const loginMutation = useMutation({
    mutationFn: ({ payload }: { payload: LoginPayload; remember: boolean }) => loginCall(payload),
    onSuccess: (data, vars) => applyAuth(data, vars.remember),
  });

  const signupMutation = useMutation({
    mutationFn: signupCall,
    onSuccess: (data) => applyAuth(data, true),
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: (meQuery.data as User | null) ?? null,
      loading: meQuery.isLoading,
      login: (payload, remember = true) => loginMutation.mutateAsync({ payload, remember }),
      signup: signupMutation.mutateAsync,
      logout: () => {
        // Secure logout: tell the server to invalidate the session (bumps the
        // token version so every issued JWT dies), then clear local state.
        // Best-effort — local cleanup happens even if the network call fails.
        apiLogout().catch(() => {
          /* token is cleared locally regardless */
        });
        setToken(null);
        localStorage.removeItem(SESSION_KEY);
        queryClient.setQueryData(["me"], null);
        queryClient.clear();
      },
    }),
    [meQuery.data, meQuery.isLoading, loginMutation.mutateAsync, signupMutation.mutateAsync, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The session id of the current login (for the sessions audit list). */
export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}
