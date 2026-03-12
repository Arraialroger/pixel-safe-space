import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface WorkspaceContextType {
  workspaceId: string | null;
  loading: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaceId: null,
  loading: true,
});

export const useWorkspace = () => useContext(WorkspaceContext);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setWorkspaceId(null);
      setLoading(false);
      return;
    }

    supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data, error }) => {
        if (data) setWorkspaceId(data.workspace_id);
        setLoading(false);
      });
  }, [user]);

  return (
    <WorkspaceContext.Provider value={{ workspaceId, loading }}>
      {children}
    </WorkspaceContext.Provider>
  );
}
