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
import { settingsService } from "@/services/settings";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

import LoginPage from "@/pages/login";
import RegisterPage from "@/pages/register";
import ForgotPasswordPage from "@/pages/forgot-password";
import VerifyOtpPage from "@/pages/verify-otp";
import ResetPasswordPage from "@/pages/reset-password";
import AuthCallbackPage from "@/pages/auth-callback";
import DashboardPage from "@/pages/dashboard";
import LeadGenerationPage from "@/pages/lead-generation";
import LeadManagementPage from "@/pages/lead-management";
import LeadAutomationPage from "@/pages/lead-automation";
import SegmentsPage from "@/pages/segments";
import InsightsPage from "@/pages/insights";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import LeadRequestsPage from "@/pages/lead-requests";
import AdminPage from "@/pages/admin";
import AdminLeadRequestsPage from "@/pages/admin-lead-requests";
import AdminUsersPage from "@/pages/admin-users";
import AdminActivityPage from "@/pages/admin-activity";
import AdminAutomationsPage from "@/pages/admin-automations";
import AdminEmailsPage from "@/pages/admin-emails";
import AdminSettingsPage from "@/pages/admin-settings";

/**
 * Redirects "/" to /dashboard (if authenticated) or /login (if not).
 * Shows a loading spinner while auth state is being resolved.
 */
function RootRedirect() {
  const { user, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        setLocation("/login", { replace: true });
      } else {
        const isAdmin = userProfile?.role === "admin";
        setLocation(isAdmin ? "/admin" : "/dashboard", { replace: true });
      }
    }
  }, [user, userProfile, loading, setLocation]);

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
 * If user is already authenticated, redirects to /dashboard or /admin.
 */
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) {
      const isAdmin = userProfile?.role === "admin";
      setLocation(isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, userProfile, loading, setLocation]);

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

  const formatTime = (dateString?: string) => {
    if (!dateString) return "Just now";
    const safeDateString = dateString.endsWith("Z") ? dateString : `${dateString}Z`;
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) return "Just now";
    return formatDistanceToNow(date, { addSuffix: true });
  };

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
              onClick={(e) => { e.preventDefault(); markAllReadMutation.mutate(); }}
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
              <span className="text-xs text-muted-foreground" title={n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}>
                {formatTime(n.createdAt)}
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

  const { data: settings } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => settingsService.get(),
    staleTime: Infinity, // don't keep refetching needlessly
  });

  useEffect(() => {
    if (settings?.theme) {
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (settings.theme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      }
    }
  }, [settings?.theme]);

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

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation(to, { replace: true });
  }, [setLocation, to]);
  return null;
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
        <ProtectedRoute userOnly={true}>
          <AuthenticatedLayout>
            <DashboardPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/leads">
        <RedirectTo to="/lead-management" />
      </Route>
      <Route path="/leads/:id">
        {(params) => <RedirectTo to={`/lead-management?lead=${params.id}`} />}
      </Route>
      <Route path="/lead-generation">
        <ProtectedRoute userOnly={true}>
          <AuthenticatedLayout>
            <LeadGenerationPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/lead-management">
        <ProtectedRoute userOnly={true}>
          <AuthenticatedLayout>
            <LeadManagementPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/lead-automation">
        <ProtectedRoute userOnly={true}>
          <AuthenticatedLayout>
            <LeadAutomationPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/segments">
        <ProtectedRoute userOnly={true}>
          <AuthenticatedLayout>
            <SegmentsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/insights">
        <ProtectedRoute userOnly={true}>
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
      <Route path="/lead-requests">
        <ProtectedRoute userOnly={true}>
          <AuthenticatedLayout>
            <LeadRequestsPage />
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
      <Route path="/admin">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/users">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminUsersPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/lead-requests">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminLeadRequestsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/activity">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminActivityPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/automations">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminAutomationsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/emails">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminEmailsPage />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      <Route path="/admin/settings">
        <ProtectedRoute adminOnly={true}>
          <AuthenticatedLayout>
            <AdminSettingsPage />
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
