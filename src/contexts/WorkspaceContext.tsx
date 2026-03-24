import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceContextType {
  workspaceId: string | null;
  loading: boolean;
  hasAccess: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  loading: true,
  hasAccess: true,
  subscriptionStatus: null,
  subscriptionPlan: null,
});

export const useWorkspace = () => useContext(WorkspaceContext);

function calcAccess(status: string | null, trialEndsAt: string | null): boolean {
  if (status === "active") return true;
  if (status === "trialing" && trialEndsAt) {
    return new Date(trialEndsAt) > new Date();
  }
  return false;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null);
      setHasAccess(true);
      setSubscriptionStatus(null);
      setSubscriptionPlan(null);
      setLoading(false);
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

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

      const wsId = member.workspace_id;
      setWorkspaceId(wsId);

      const { data: ws } = await supabase
        .from("workspaces")
        .select("subscription_status, subscription_plan, trial_ends_at")
        .eq("id", wsId)
        .single();

      if (ws) {
        setSubscriptionStatus(ws.subscription_status);
        setSubscriptionPlan(ws.subscription_plan);
        setHasAccess(calcAccess(ws.subscription_status, ws.trial_ends_at));
      }

      setLoading(false);

      // Realtime listener for instant paywall unlock
      channel = supabase
        .channel(`workspace-${wsId}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "workspaces", filter: `id=eq.${wsId}` },
          (payload) => {
            const newRow = payload.new as {
              subscription_status: string;
              subscription_plan: string | null;
              trial_ends_at: string | null;
            };
            setSubscriptionStatus(newRow.subscription_status);
            setSubscriptionPlan(newRow.subscription_plan);
            setHasAccess(calcAccess(newRow.subscription_status, newRow.trial_ends_at));
          }
        )
        .subscribe();
    })();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, loading, hasAccess, subscriptionStatus, subscriptionPlan }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
