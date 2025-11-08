import { 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  UserCircle,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { UserAvatar } from "./UserAvatar";
import { getFullName } from "@/lib/authUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";

export function AppSidebar() {
  const { user, isAdmin } = useAuth();
  const [location] = useLocation();

  const adminItems = [
    {
      title: "Dashboard",
      url: "/",
      icon: LayoutDashboard,
    },
    {
      title: "Campaigns",
      url: "/campaigns",
      icon: FolderKanban,
    },
    {
      title: "User Management",
      url: "/users",
      icon: Users,
    },
  ];

  const assistantItems = [
    {
      title: "My Leads",
      url: "/",
      icon: UserCircle,
    },
  ];

  const menuItems = isAdmin ? adminItems : assistantItems;

  if (!user) return null;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">LM</span>
          </div>
          <div>
            <h2 className="font-semibold text-sm">Lead Manager</h2>
            <p className="text-xs text-muted-foreground">Campaign Tracking</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground px-3">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.url}
                    data-testid={`link-sidebar-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                      {location === item.url && (
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar user={user} size="md" showRole />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate" data-testid="text-user-name">
              {getFullName(user.firstName, user.lastName)}
            </p>
            <Badge 
              variant="outline" 
              className="text-xs mt-1"
              data-testid={`badge-role-${user.role}`}
            >
              {isAdmin ? "Admin" : "Support"}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={async () => {
            try {
              await fetch("/api/logout", { method: "POST" });
              queryClient.setQueryData(["/api/user"], null);
              window.location.href = "/";
            } catch (error) {
              console.error("Logout error:", error);
              window.location.href = "/";
            }
          }}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
