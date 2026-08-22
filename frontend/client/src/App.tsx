import { useEffect, useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { notificationsService, type NotificationsResponse } from "@/services/notifications";
import NotFound from "@/pages/not-found";
import { Loader2 } from "lucide-react";

/**
 * Redirects "/" to /dashboard (if authenticated) or /login (if not).
 * Shows a loading spinner while auth state is being resolved.
 */
function RootRedirect() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      setLocation(user ? "/dashboard" : "/login", { replace: true });
    }
  }, [user, loading, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading...</p>
      </div>
    </div>
  );
}

/**
 * Wraps public routes (login, register, etc.).
 * If user is already authenticated, redirects to /dashboard.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      setLocation("/dashboard", { replace: true });
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
}
import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import VerifyOtpPage from "@/pages/verify-otp";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import DashboardPage from "@/pages/dashboard";
import LeadsPage from "@/pages/leads";
import LeadGenerationPage from "@/pages/lead-generation";
import LeadManagementPage from "@/pages/lead-management";
import LeadAutomationPage from "@/pages/lead-automation";
import SegmentsPage from "@/pages/segments";
import InsightsPage from "@/pages/insights";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import LeadRequestsPage from "@/pages/lead-requests";
import AdminPage from "@/pages/admin";

function NotificationBell() {
  const [open, setOpen] = useState(false);

  const { data } = useQuery<NotificationsResponse>({
    queryKey: ["/api/notifications"],
    queryFn: () => notificationsService.getAll(),
    refetchInterval: 30000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsService.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
  });

  const unreadCount = data?.unreadCount ?? 0;
  const notifs = data?.notifications ?? [];

  const typeIcon = (type: string) => {
    if (type === "lead_created") return "🟢";
    if (type === "status_changed") return "🔄";
    if (type === "automation_triggered") return "⚡";
    if (type === "scored") return "⭐";
    return "🔔";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive text-destructive-foreground"
              data-testid="badge-notification-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={() => markAllReadMutation.mutate()}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="h-3 w-3" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifs.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          notifs.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={`flex flex-col items-start gap-0.5 px-3 py-2 cursor-pointer ${n.isRead ? "opacity-60" : "font-medium"}`}
              onClick={() => { if (!n.isRead) markReadMutation.mutate(n.id); }}
              data-testid={`notification-item-${n.id}`}
            >
              <span className="text-sm leading-snug">
                {typeIcon(n.type)} {n.message}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString()}
              </span>
              {!n.isRead && <span className="w-2 h-2 rounded-full bg-primary absolute right-3 top-1/2 -translate-y-1/2" />}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className="flex items-center justify-between gap-4 p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/">
        <RootRedirect />
      </Route>
      <Route path="/login">
        <PublicRoute><LoginPage /></PublicRoute>
      </Route>
      <Route path="/register">
        <PublicRoute><RegisterPage /></PublicRoute>
      </Route>
      <Route path="/forgot-password">
        <PublicRoute><ForgotPasswordPage /></PublicRoute>
      </Route>
      <Route path="/verify-otp">
        <PublicRoute><VerifyOtpPage /></PublicRoute>
      </Route>
      <Route path="/reset-password">
        <PublicRoute><ResetPasswordPage /></PublicRoute>
      </Route>
      <Route path="/auth-callback" component={AuthCallbackPage} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <DashboardPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <LeadsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads/:id">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <LeadsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/lead-generation">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <LeadGenerationPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/lead-management">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <LeadManagementPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/lead-automation">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <LeadAutomationPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/segments">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <SegmentsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/insights">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <InsightsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <ProfilePage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <SettingsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/lead-requests">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <LeadRequestsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
