import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useMobileHeaderActionSlot } from "./MobileHeaderActionContext";
import { ThemeToggle } from "./ThemeToggle";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/propostas": "Propostas",
  "/propostas/nova": "Nova Proposta",
  "/contratos": "Contratos",
  "/cofre": "Meu Cofre",
  "/clientes": "Clientes",
  "/configuracoes": "Meu Perfil",
  "/configuracoes-workspace": "Estúdio",
  "/assinatura": "Assinatura",
  "/assinatura/faturas": "Faturas",
};

function resolveTitle(path: string): string {
  if (titleMap[path]) return titleMap[path];
  if (path.startsWith("/propostas/")) return "Proposta";
  if (path.startsWith("/contratos/")) return "Contrato";
  return "PixelSafe";
}

export function MobileHeader() {
  const location = useLocation();
  const { workspaceId } = useWorkspace();
  const { action } = useMobileHeaderActionSlot();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    supabase
      .from("workspaces")
      .select("logo_url")
      .eq("id", workspaceId)
      .single()
      .then(({ data }) => setLogoUrl(data?.logo_url ?? null));
  }, [workspaceId]);

  const title = resolveTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-3 px-4 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex items-center gap-2 min-w-0">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo" className="h-6 max-w-[28px] object-contain shrink-0" />
        ) : (
          <Shield className="h-5 w-5 text-primary shrink-0" />
        )}
        <h1 className="text-base font-semibold truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <ThemeToggle />
        {action}
      </div>
    </header>
  );
}
