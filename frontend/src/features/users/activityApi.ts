import { api } from "@/lib/api";

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
  return api<Activity>("/users/me/activity");
}
