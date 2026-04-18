import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { Users, UserCircle, Building2, CreditCard, LogOut, Check, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const secondaryItems = [
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Meu Perfil", url: "/configuracoes", icon: UserCircle },
  { title: "Estúdio/Agência", url: "/configuracoes-workspace", icon: Building2 },
  { title: "Minha Assinatura", url: "/assinatura", icon: CreditCard },
];

export function MobileMoreSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { signOut, user } = useAuth();
  const { workspaceId, allWorkspaces, switchWorkspace } = useWorkspace();

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[85vw] sm:max-w-sm flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-left flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Menu
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {allWorkspaces.length > 1 && (
            <div>
              <p className="px-2 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Workspace
              </p>
              <div className="space-y-1">
                {allWorkspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => {
                      switchWorkspace(ws.id);
                      close();
                    }}
                    className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    <span className="truncate text-left">{ws.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ws.subscriptionPlan === "full_access" ? (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          Acesso Total
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Free
                        </Badge>
                      )}
                      {ws.id === workspaceId && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="px-2 mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Navegação
            </p>
            <div className="space-y-1">
              {secondaryItems.map((item) => (
                <Link
                  key={item.url}
                  to={item.url}
                  onClick={close}
                  className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm hover:bg-accent transition-colors"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                  {item.title}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-border/40 p-4 space-y-3">
          {user && (
            <p className="text-xs text-muted-foreground truncate px-1">{user.email}</p>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              signOut();
              close();
            }}
            className="w-full justify-start hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
