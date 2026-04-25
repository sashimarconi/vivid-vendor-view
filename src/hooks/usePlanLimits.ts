import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PLANS, PlanType, PlanInfo } from "@/lib/plans";

export function usePlanLimits() {
  const { data: userPlan, isLoading } = useQuery({
    queryKey: ["user-plan"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data } = await supabase
        .from("user_plans")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      return data;
    },
  });

  const planType: PlanType = (userPlan?.plan as PlanType) ?? "free";
  const plan: PlanInfo = PLANS[planType];

  return {
    plan,
    planType,
    userPlan,
    isLoading,
  };
}
