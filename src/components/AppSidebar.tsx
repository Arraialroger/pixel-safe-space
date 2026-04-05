import { LayoutDashboard, FileText, FileCheck, Users, UserCircle, LogOut, Shield, Building2, CreditCard, ChevronsUpDown, Check, FolderLock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar } from
"@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger } from
"@/components/ui/dropdown-menu";

const navItems = [
{ title: "Dashboard", url: "/", icon: LayoutDashboard },
{ title: "Propostas", url: "/propostas", icon: FileText },
{ title: "Contratos", url: "/contratos", icon: FileCheck },
{ title: "Meu Cofre", url: "/cofre", icon: FolderLock },
{ title: "Clientes", url: "/clientes", icon: Users },
{ title: "Meu Perfil", url: "/configuracoes", icon: UserCircle },
{ title: "Estúdio/Agência", url: "/configuracoes-workspace", icon: Building2 },
{ title: "Minha Assinatura", url: "/assinatura", icon: CreditCard }];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut, user } = useAuth();
  const { workspaceId, allWorkspaces, switchWorkspace } = useWorkspace();
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const activeWorkspace = allWorkspaces.find((w) => w.id === workspaceId);

  useEffect(() => {
    if (!workspaceId) return;
    supabase.
    from("workspaces").
    select("logo_url").
    eq("id", workspaceId).
    single().
    then(({ data }) => {
      setLogoUrl(data?.logo_url ?? null);
    });
  }, [workspaceId]);

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Workspace Switcher */}
        <div className="px-3 pt-4 pb-2">
          {allWorkspaces.length > 1 ?
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center gap-2 rounded-md border border-border/40 bg-card/50 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors">
                  {logoUrl ?
                <img src={logoUrl} alt="Logo" className="h-5 max-w-[24px] object-contain shrink-0" /> :

                <Shield className="h-5 w-5 text-primary shrink-0" />
                }
                  {!collapsed &&
                <>
                      <span className="text-sm font-semibold truncate flex-1">
                        {activeWorkspace?.name ?? "Workspace"}
                      </span>
                      <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </>
                }
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {allWorkspaces.map((ws) =>
              <DropdownMenuItem
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className="flex items-center justify-between gap-2">
                
                    <span className="truncate">{ws.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {ws.subscriptionPlan === "studio" ?
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">Studio</Badge> :

                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Free</Badge>
                  }
                      {ws.id === workspaceId && <Check className="h-4 w-4 text-primary" />}
                    </div>
                  </DropdownMenuItem>
              )}
              </DropdownMenuContent>
            </DropdownMenu> :

          <div className="flex items-center gap-2.5 px-1 py-1">
              {logoUrl ?
            <img src={logoUrl} alt="Logo" className="h-7 max-w-[120px] object-contain shrink-0" /> :

            <>
                  <Shield className="h-6 w-6 text-primary shrink-0" />
                  {!collapsed && <span className="text-lg font-bold tracking-tight">PixelSafe</span>}
                </>
            }
            </div>
          }
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className="hover:bg-sidebar-accent/60"
                    activeClassName="bg-sidebar-accent text-primary font-medium">
                    
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && user &&
        <p className="text-xs text-muted-foreground truncate px-2 mb-2">
            {user.email}
          </p>
        }
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Sair</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>);

}