import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileHeader } from "@/components/MobileHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { MobileHeaderActionProvider } from "@/components/MobileHeaderActionContext";

function PaywallBanner({ compact }: { compact?: boolean }) {
  const { hasAccess, loading } = useWorkspace();
  if (loading || hasAccess) return null;
  return (
    <Link
      to="/assinatura"
      className={`flex items-center gap-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 hover:bg-amber-500/15 transition-colors ${
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-sm"
      }`}
    >
      <AlertTriangle className={compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 shrink-0"} />
      <span className="truncate">
        {compact
          ? "Período expirado. Toque para escolher um plano."
          : "Seu período de uso expirou. Clique aqui para escolher um plano e liberar seu acesso."}
      </span>
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobileHeaderActionProvider>
        <div className="min-h-screen flex flex-col bg-background">
          <MobileHeader />
          <PaywallBanner compact />
          <main className="flex-1 px-3 pt-3 pb-24">{children}</main>
          <MobileBottomNav />
        </div>
      </MobileHeaderActionProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-white/5 bg-background/80 backdrop-blur-sm px-4">
            <SidebarTrigger />
          </header>
          <PaywallBanner />
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
