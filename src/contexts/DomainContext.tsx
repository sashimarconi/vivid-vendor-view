import { createContext, useContext, type ReactNode } from "react";
import { useDomainResolver, type DomainInfo } from "@/hooks/useDomainResolver";

interface DomainContextType {
  domainInfo: DomainInfo;
  isLoading: boolean;
  isPlatform: boolean;
}

const DomainContext = createContext<DomainContextType>({
  domainInfo: { isCustomDomain: false, ownerUserId: null, domain: "", verified: false },
  isLoading: true,
  isPlatform: true,
});

export const useDomain = () => useContext(DomainContext);

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  const value = useDomainResolver();
  return <DomainContext.Provider value={value}>{children}</DomainContext.Provider>;
};
