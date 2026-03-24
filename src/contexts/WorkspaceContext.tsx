import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceContextType {
  workspaceId: string | null;
  loading: boolean;
  hasAccess: boolean;
  subscriptionStatus: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  loading: true,
  hasAccess: true,
  subscriptionStatus: null,
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null);
      setHasAccess(true);
      setSubscriptionStatus(null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!member) {
        setLoading(false);
        return;
      }

      setWorkspaceId(member.workspace_id);

      const { data: ws } = await supabase
        .from("workspaces")
        .select("subscription_status, trial_ends_at")
        .eq("id", member.workspace_id)
        .single();

      if (ws) {
        setSubscriptionStatus(ws.subscription_status);
        const status = ws.subscription_status;
        const trialEnds = ws.trial_ends_at ? new Date(ws.trial_ends_at) : null;
        const now = new Date();

        const access =
          status === "active" ||
          (status === "trialing" && trialEnds !== null && trialEnds > now);

        setHasAccess(access);
      }

      setLoading(false);
    })();
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, loading, hasAccess, subscriptionStatus }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
