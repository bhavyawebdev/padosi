import { toApiError } from "@/lib/errors";
import { supabase } from "@/lib/supabase";

export interface ActivityItem {
  type: "post" | "request" | "review" | "reply";
  title: string;
  detail: string;
  created_at: string;
}

export interface Activity {
  posts_count: number;
  requests_count: number;
  reviews_count: number;
  replies_count: number;
  items: ActivityItem[];
}

export async function fetchMyActivity(): Promise<Activity> {
  const { data, error } = await supabase.rpc("my_activity");
  if (error) throw toApiError(error);
  return data as Activity;
}
