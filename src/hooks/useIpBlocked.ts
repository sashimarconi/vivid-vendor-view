import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useIpBlocked(userId: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ["ip-blocked", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-ip-blocked", {
        body: { user_id: userId },
      });
      if (error) return { blocked: false };
      return data as { blocked: boolean; reason?: string | null };
    },
  });
  return { blocked: !!data?.blocked, reason: data?.reason || null };
}
