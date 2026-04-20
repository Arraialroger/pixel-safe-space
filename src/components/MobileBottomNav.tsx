import { LayoutDashboard, FileText, FileCheck, FolderLock, Menu } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/haptics";
import { MobileMoreSheet } from "./MobileMoreSheet";

const slots = [
  { label: "Dashboard", url: "/", icon: LayoutDashboard, exact: true },
  { label: "Propostas", url: "/propostas", icon: FileText },
  { label: "Contratos", url: "/contratos", icon: FileCheck },
  { label: "Cofre", url: "/cofre", icon: FolderLock },
];

export function MobileBottomNav() {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (url: string, exact?: boolean) =>
    exact ? location.pathname === url : location.pathname.startsWith(url);

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5 h-16">
          {slots.map((s) => {
            const active = isActive(s.url, s.exact);
            const Icon = s.icon;
            return (
              <Link
                key={s.url}
                to={s.url}
                onClick={() => haptic(10)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-b bg-primary" />}
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium leading-none">{s.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => { haptic(10); setMoreOpen(true); }}
            className="relative flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-none">Mais</span>
          </button>
        </div>
      </nav>
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </>
  );
}
