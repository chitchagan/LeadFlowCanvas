import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { InstallPWA } from "@/components/InstallPWA";
import { UpdateBanner } from "@/components/UpdateBanner";
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import Landing from "@/pages/landing";
import AdminDashboard from "@/pages/admin-dashboard";
import SupportDashboard from "@/pages/support-dashboard";
import Campaigns from "@/pages/campaigns";
import Users from "@/pages/users";
import NotFound from "@/pages/not-found";

function AuthenticatedApp({ isAdmin }: { isAdmin: boolean }) {
  // Initialize WebSocket notifications for authenticated users
  useNotifications();

  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={sidebarStyle}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="border-b border-border px-4 py-3 flex items-center gap-4">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex-1" />
            <NotificationBell />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              {isAdmin ? (
                <>
                  <Route path="/" component={AdminDashboard} />
                  <Route path="/campaigns" component={Campaigns} />
                  <Route path="/users" component={Users} />
                </>
              ) : (
                <>
                  <Route path="/" component={SupportDashboard} />
                  <Route path="/support" component={SupportDashboard} />
                </>
              )}
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return <AuthenticatedApp isAdmin={isAdmin} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UpdateBanner />
        <Router />
        <Toaster />
        <InstallPWA />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
