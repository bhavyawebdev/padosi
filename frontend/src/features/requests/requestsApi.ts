import { api } from "@/lib/api";
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
  const q = new URLSearchParams({ lat: String(params.lat), lng: String(params.lng) });
  if (params.radiusKm !== undefined) q.set("radius_km", String(params.radiusKm));
  if (params.type) q.set("type", params.type);
  if (params.status) q.set("status", params.status);
  if (params.q) q.set("q", params.q);
  return api<LocalRequest[]>(`/requests?${q.toString()}`);
}

export async function fetchRequest(id: string): Promise<RequestDetail> {
  return api<RequestDetail>(`/requests/${id}`);
}

export async function createRequest(payload: CreateRequestPayload): Promise<LocalRequest> {
  return api<LocalRequest>("/requests", { method: "POST", body: payload });
}

export async function createReply(requestId: string, message: string): Promise<RequestReply> {
  return api<RequestReply>(`/requests/${requestId}/replies`, { method: "POST", body: { message } });
}

export async function fulfillRequest(requestId: string): Promise<RequestDetail> {
  return api<RequestDetail>(`/requests/${requestId}/fulfill`, { method: "POST" });
}

export async function reportRequest(requestId: string, reason: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/requests/${requestId}/report`, { method: "POST", body: { reason } });
}
