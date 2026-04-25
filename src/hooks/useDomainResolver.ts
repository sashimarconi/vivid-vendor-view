import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PLATFORM_HOSTNAMES = [
  "localhost",
  "voidtok.site",
  "www.voidtok.site",
  "voidtok.lovable.app",
];

export interface DomainInfo {
  isCustomDomain: boolean;
  ownerUserId: string | null;
  domain: string;
  verified: boolean;
}

/**
 * Resolves the current hostname against custom_domains.
 * If the hostname matches a custom domain, returns the owner's user_id.
 * Otherwise, returns null (platform domain).
 */
export function useDomainResolver() {
  const hostname = window.location.hostname;

  const isPlatform = PLATFORM_HOSTNAMES.some(
    (h) => hostname === h || hostname.endsWith(`.lovableproject.com`) || hostname.endsWith(`.lovable.app`)
  );

  const { data, isLoading } = useQuery({
    queryKey: ["domain-resolve", hostname],
    queryFn: async (): Promise<DomainInfo> => {
      if (isPlatform) {
        return { isCustomDomain: false, ownerUserId: null, domain: hostname, verified: false };
      }

      // Use the safe view that excludes verification_token
      const { data: domainRow, error } = await (supabase as any)
        .from("custom_domains_public")
        .select("user_id, domain, verified")
        .eq("domain", hostname)
        .maybeSingle();

      if (error || !domainRow) {
        return { isCustomDomain: false, ownerUserId: null, domain: hostname, verified: false };
      }

      return {
        isCustomDomain: true,
        ownerUserId: domainRow.user_id,
        domain: domainRow.domain,
        verified: domainRow.verified,
      };
    },
    staleTime: 5 * 60 * 1000, // Cache 5 min
  });

  return {
    domainInfo: data ?? { isCustomDomain: false, ownerUserId: null, domain: hostname, verified: false },
    isLoading,
    isPlatform,
  };
}
