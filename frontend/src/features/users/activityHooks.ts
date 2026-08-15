import { useQuery } from "@tanstack/react-query";

import { fetchMyActivity } from "./activityApi";

export function useMyActivity() {
  return useQuery({
    queryKey: ["me", "activity"],
    queryFn: fetchMyActivity,
  });
}
