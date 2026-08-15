import { api } from "@/lib/api";
import type { AuthResponse, Locality, LoginPayload, LoginSession, SignupPayload, User } from "@/types";

export async function signup(payload: SignupPayload): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/signup", { method: "POST", body: payload });
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/login", { method: "POST", body: payload });
}

export async function apiLogout(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/auth/logout", { method: "POST" });
}

export async function forgotPassword(email: string): Promise<{
  sent: boolean;
  expires_min: number;
  dev_reset_token: string | null;
  dev_reset_url: string | null;
}> {
  return api("/auth/forgot-password", { method: "POST", body: { email } });
}

export async function resetPassword(token: string, newPassword: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/auth/reset-password", {
    method: "POST",
    body: { token, new_password: newPassword },
  });
}

export async function recoverEmail(phone: string): Promise<{
  found: boolean;
  email: string | null;
  name: string | null;
}> {
  return api("/auth/recover-email", { method: "POST", body: { phone } });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/change-password", {
    method: "POST",
    body: { current_password: currentPassword, new_password: newPassword },
  });
}

export async function signOutOthers(): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/signout-others", { method: "POST" });
}

export async function fetchSessions(): Promise<LoginSession[]> {
  return api<LoginSession[]>("/users/me/sessions");
}

export async function fetchMe(): Promise<User> {
  return api<User>("/users/me");
}

export async function fetchLocalities(city?: string, q?: string, state?: string): Promise<Locality[]> {
  const params = new URLSearchParams();
  if (city) params.set("city", city);
  if (state) params.set("state", state);
  if (q) params.set("q", q);
  const qs = params.toString();
  return api<Locality[]>(`/localities${qs ? `?${qs}` : ""}`);
}

export async function updateMe(payload: Partial<Pick<User, "full_name" | "phone" | "about">> & { locality_id?: string }): Promise<User> {
  return api<User>("/users/me", { method: "PATCH", body: payload });
}
