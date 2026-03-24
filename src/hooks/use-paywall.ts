import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

export function usePaywall() {
  const { hasAccess } = useWorkspace();
  const navigate = useNavigate();

  const guard = useCallback(
    (callback: () => void) => {
      if (hasAccess) {
        callback();
      } else {
        toast.error("Seu acesso expirou. Assine um plano para continuar criando.");
        navigate("/assinatura");
      }
    },
    [hasAccess, navigate]
  );

  return { hasAccess, guard };
}
