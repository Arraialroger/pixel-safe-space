import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceInfo {
  id: string;
  name: string;
  subscriptionPlan: string | null;
}

interface WorkspaceContextType {
  workspaceId: string | null;
  loading: boolean;
  hasAccess: boolean;
  subscriptionStatus: string | null;
  subscriptionPlan: string | null;
  allWorkspaces: WorkspaceInfo[];
  switchWorkspace: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  loading: true,
  hasAccess: true,
  subscriptionStatus: null,
  subscriptionPlan: null,
  allWorkspaces: [],
  switchWorkspace: () => {},
});

export const useWorkspace = () => useContext(WorkspaceContext);

const ACTIVE_WS_KEY = "pixelsafe_active_workspace";

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
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  const loadSubscription = useCallback(async (wsId: string) => {
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
  }, []);

  const setupRealtimeChannel = useCallback((wsId: string) => {
    const ch = supabase
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
    return ch;
  }, []);

  const switchWorkspace = useCallback((id: string) => {
    // Clean up old channel
    if (channel) supabase.removeChannel(channel);

    setWorkspaceId(id);
    localStorage.setItem(ACTIVE_WS_KEY, id);

    // Load new workspace data
    loadSubscription(id);
    const newChannel = setupRealtimeChannel(id);
    setChannel(newChannel);
  }, [channel, loadSubscription, setupRealtimeChannel]);

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null);
      setAllWorkspaces([]);
      setHasAccess(true);
      setSubscriptionStatus(null);
      setSubscriptionPlan(null);
      setLoading(false);
      return;
    }

    let currentChannel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      // Fetch ALL workspaces the user belongs to
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(id, name, subscription_plan)")
        .eq("user_id", user.id);

      if (!memberships || memberships.length === 0) {
        setLoading(false);
        return;
      }

      const wsList: WorkspaceInfo[] = memberships
        .filter((m) => m.workspaces)
        .map((m) => {
          const ws = m.workspaces as unknown as { id: string; name: string; subscription_plan: string | null };
          return { id: ws.id, name: ws.name, subscriptionPlan: ws.subscription_plan };
        });

      setAllWorkspaces(wsList);

      // Determine active workspace: localStorage preference → first in list
      const savedId = localStorage.getItem(ACTIVE_WS_KEY);
      const activeId = wsList.find((w) => w.id === savedId)?.id ?? wsList[0].id;

      setWorkspaceId(activeId);
      localStorage.setItem(ACTIVE_WS_KEY, activeId);

      await loadSubscription(activeId);
      setLoading(false);

      currentChannel = setupRealtimeChannel(activeId);
      setChannel(currentChannel);
    })();

    return () => {
      if (currentChannel) supabase.removeChannel(currentChannel);
    };
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{ workspaceId, loading, hasAccess, subscriptionStatus, subscriptionPlan, allWorkspaces, switchWorkspace }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
