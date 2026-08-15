/**
 * Auth API — Supabase Auth is the source of truth. No custom JWT handling:
 * the browser client stores sessions through the storage adapter in
 * lib/supabase.ts.
 */
import { ApiError, toApiError } from "@/lib/errors";
import { setSessionPersistence, supabase } from "@/lib/supabase";
import type { Locality, LoginPayload, SignupPayload, User, UserRole } from "@/types";

/** A profiles row with the embedded localities relation. */
interface ProfileWithLocality {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  phone_verified: boolean;
  govt_id_verified: boolean;
  role: UserRole;
  about: string | null;
  locality_id: string | null;
  created_at: string;
  localities: Locality | null;
}

const PROFILE_SELECT =
  "id, email, full_name, phone, phone_verified, govt_id_verified, role, about, locality_id, created_at, localities(*)";

function mapProfile(row: ProfileWithLocality): User {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    phone: row.phone,
    phone_verified: row.phone_verified,
    govt_id_verified: row.govt_id_verified,
    role: row.role,
    about: row.about,
    locality: row.localities ?? null,
    created_at: row.created_at,
  };
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new ApiError(401, "Please sign in.");
  return data.user.id;
}

export async function fetchMe(): Promise<User> {
  const id = await currentUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "We couldn't find your profile. Try signing out and back in.");
  return mapProfile(data as unknown as ProfileWithLocality);
}

/** Sign in. `remember=false` stores the session in sessionStorage only. */
export async function login(payload: LoginPayload, remember = true): Promise<User> {
  setSessionPersistence(remember);
  const { error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });
  if (error) throw toApiError(error);
  return fetchMe();
}

/**
 * Sign up. Returns the new user when a session is granted immediately, or
 * null when the project requires email confirmation (profile is created by
 * trigger; the user signs in after confirming).
 */
export async function signup(payload: SignupPayload): Promise<User | null> {
  setSessionPersistence(true);
  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        full_name: payload.full_name,
        phone: payload.phone ?? null,
        role: payload.role,
        locality_id: payload.locality_id,
      },
      // Signup confirmations land on the app (they create a session);
      // password-recovery links use /reset-password instead.
      emailRedirectTo: `${window.location.origin}/nearby`,
    },
  });
  if (error) throw toApiError(error);
  if (!data.session) return null; // email confirmation required
  return fetchMe();
}

export async function apiLogout(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw toApiError(error);
}

export async function forgotPassword(email: string): Promise<{ sent: boolean }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw toApiError(error);
  return { sent: true };
}

/** Complete a password reset — the recovery session must be active. */
export async function resetPassword(newPassword: string): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new ApiError(401, "This reset link is invalid or expired. Request a new one.");
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw toApiError(error);
  // Reset is done — sign out everywhere so the new password is proven with a
  // fresh, deliberate login.
  await supabase.auth.signOut();
}

/**
 * Change password: re-authenticate with the current password (Supabase
 * requires a recent login for updateUser), then revoke other sessions.
 */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password: currentPassword,
  });
  if (signInError) throw toApiError(signInError);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw toApiError(error);
  await supabase.auth.signOut({ scope: "others" });
}

/** Sign out every other device while keeping this one signed in. */
export async function signOutOthers(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw toApiError(error);
}

export async function updateMe(
  payload: Partial<Pick<User, "full_name" | "phone" | "about">> & { locality_id?: string },
): Promise<User> {
  const id = await currentUserId();
  const updates: Record<string, unknown> = {};
  if (payload.full_name !== undefined) updates.full_name = payload.full_name;
  if (payload.phone !== undefined) updates.phone = payload.phone;
  if (payload.about !== undefined) updates.about = payload.about;
  if (payload.locality_id !== undefined) updates.locality_id = payload.locality_id;

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", id)
    .select(PROFILE_SELECT)
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(404, "We couldn't find your profile.");
  return mapProfile(data as unknown as ProfileWithLocality);
}

export async function fetchLocalities(city?: string, q?: string, state?: string): Promise<Locality[]> {
  let query = supabase
    .from("localities")
    .select("id, name, city, state, lat, lng")
    .order("name");
  if (city) query = query.eq("city", city);
  if (state) query = query.eq("state", state);
  if (q) query = query.ilike("name", `%${q}%`);
  const { data, error } = await query.limit(200);
  if (error) throw toApiError(error);
  return (data ?? []) as Locality[];
}
