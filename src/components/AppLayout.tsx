import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { hasAccess, loading } = useWorkspace();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-white/5 bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger />
          </header>
          {!loading && !hasAccess && (
            <Link
              to="/assinatura"
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/15 transition-colors"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Seu período de uso expirou. Clique aqui para escolher um plano e liberar seu acesso.</span>
            </Link>
          )}
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
