import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";

export type ActiveOrg = {
  org_id: string;
  org_name: string;
  role: string;
};

type OrgContextValue = {
  orgs: ActiveOrg[];
  activeOrg: ActiveOrg | null;
  setActiveOrg: (org: ActiveOrg) => void;
  isLoading: boolean;
};

const ORG_KEY = "active_org_id";

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isSiteAdmin = user?.role.name === "SITE_ADMIN";

  const { data: allOrgsData, isLoading: allOrgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const { data } = await api.GET("/organizations/");
      return data;
    },
    enabled: !!user && isSiteAdmin,
  });

  const orgs: ActiveOrg[] = isSiteAdmin
    ? (allOrgsData?.organizations ?? []).map((o) => ({
        org_id: o.id,
        org_name: o.name,
        role: "ADMIN",
      }))
    : (user?.org_memberships ?? []).map((m) => ({
        org_id: m.org_id,
        org_name: m.org_name,
        role: m.role,
      }));

  const [activeOrgId, setActiveOrgId] = useState<string | null>(
    () => localStorage.getItem(ORG_KEY),
  );

  // Resolve to stored org if valid, otherwise fall back to first available.
  const activeOrg = useMemo(() => {
    if (orgs.length === 0) return null;
    return orgs.find((o) => o.org_id === activeOrgId) ?? orgs[0] ?? null;
  }, [orgs, activeOrgId]);

  // Keep localStorage in sync when the resolved org differs from stored ID.
  useEffect(() => {
    if (activeOrg && activeOrg.org_id !== localStorage.getItem(ORG_KEY)) {
      localStorage.setItem(ORG_KEY, activeOrg.org_id);
    }
  }, [activeOrg]);

  const setActiveOrg = useCallback((org: ActiveOrg) => {
    setActiveOrgId(org.org_id);
    localStorage.setItem(ORG_KEY, org.org_id);
  }, []);

  return (
    <OrgContext.Provider
      value={{
        orgs,
        activeOrg,
        setActiveOrg,
        isLoading: isSiteAdmin ? allOrgsLoading : false,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within <OrgProvider>");
  return ctx;
}
