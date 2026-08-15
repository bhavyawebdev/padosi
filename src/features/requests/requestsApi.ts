import { ApiError, toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import type {
  CreateRequestPayload,
  LocalRequest,
  RequestDetail,
  RequestReply,
  RequestStatus,
  RequestType,
} from "@/types";

export interface RequestsQueryParams {
  lat: number;
  lng: number;
  radiusKm?: number;
  type?: RequestType | null;
  status?: RequestStatus;
  q?: string;
}

export async function fetchRequests(params: RequestsQueryParams): Promise<LocalRequest[]> {
  const { data, error } = await supabase.rpc("requests_list", {
    p_lat: params.lat,
    p_lng: params.lng,
    p_radius_km: params.radiusKm ?? 3,
    p_type: params.type ?? null,
    p_status: params.status ?? "open",
    p_q: params.q ?? null,
  });
  if (error) throw toApiError(error);
  return (data ?? []) as LocalRequest[];
}

export async function fetchRequest(id: string): Promise<RequestDetail> {
  const { data, error } = await supabase.rpc("request_get", { p_request_id: id });
  if (error) throw toApiError(error);
  return data as RequestDetail;
}

export async function createRequest(payload: CreateRequestPayload): Promise<LocalRequest> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      type: payload.type,
      text: payload.text,
      lat: payload.lat,
      lng: payload.lng,
      needed_by: payload.needed_by,
    })
    .select("id")
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(400, "needed_by must be in the future.");
  return fetchRequest((data as { id: string }).id);
}

export async function createReply(requestId: string, message: string): Promise<RequestReply> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("request_replies")
    .insert({ request_id: requestId, user_id: user.id, message })
    .select("id, request_id, user_id, message, created_at, author:profiles!request_replies_user_id_fkey(full_name)")
    .single();
  if (error) throw toApiError(error);
  const row = data as unknown as {
    id: string;
    request_id: string;
    user_id: string;
    message: string;
    created_at: string;
    author: { full_name: string } | null;
  };
  return {
    id: row.id,
    request_id: row.request_id,
    user_id: row.user_id,
    author_name: row.author?.full_name ?? "",
    message: row.message,
    created_at: row.created_at,
  };
}

export async function fulfillRequest(requestId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { data, error } = await supabase
    .from("requests")
    .update({ status: "fulfilled" })
    .eq("id", requestId)
    .select("id")
    .maybeSingle();
  if (error) throw toApiError(error);
  if (!data) throw new ApiError(403, "Only the requester can mark this fulfilled.");
}

export async function reportRequest(requestId: string, reason: string): Promise<{ ok: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ApiError(401, "Please sign in.");

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: "request",
    target_id: requestId,
    reason,
  });
  if (error) throw toApiError(error);
  return { ok: true };
}
