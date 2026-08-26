import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Target,
  Settings,
  LogOut,
  Sparkles,
  Magnet,
  ClipboardList,
  Zap,
  FileText,
  Shield,
  ChevronUp,
  UserCircle,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";

const userOverviewItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const userLeadItems = [
  { title: "Lead Generation", url: "/lead-generation", icon: Magnet },
  { title: "Lead Management", url: "/lead-management", icon: ClipboardList },
];

const userAutomationItems = [
  { title: "Lead Automation", url: "/lead-automation", icon: Zap },
];

const userInsightsItems = [
  { title: "Segments", url: "/segments", icon: Target },
  { title: "AI Insights", url: "/insights", icon: Sparkles },
];

const userLeadFlowAIItems = [
  { title: "Lead Request", url: "/lead-requests", icon: FileText },
];

const userAccountItems = [
  { title: "Settings", url: "/settings", icon: Settings },
];

const adminOverviewItems = [
  { title: "Admin Dashboard", url: "/admin", icon: Shield },
];

const adminManagementItems = [
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Lead Management", url: "/lead-management", icon: ClipboardList },
  { title: "Lead Requests", url: "/admin/lead-requests", icon: FileText },
];

const adminMonitoringItems = [
  { title: "Activity Logs", url: "/admin/activity", icon: ClipboardList },
  { title: "Automations", url: "/admin/automations", icon: Zap },
  { title: "Emails", url: "/admin/emails", icon: Magnet }, // Using magnet as placeholder, maybe Mail?
];

const adminSystemItems = [
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { user, userProfile, signOut } = useAuth();
  
  const isAdmin = userProfile?.role === "admin";

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const f = firstName?.[0] || "";
    const l = lastName?.[0] || "";
    const initials = (f + l).toUpperCase();
    return initials || "U";
  };

  const handleLogout = async () => {
    await signOut();
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
    setLocation("/login");
  };

  const renderGroup = (label: string, items: any[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location === item.url}
                data-testid={`link-${item.title.toLowerCase().replace(/ /g, "-")}`}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-foreground">LeadFlow AI</span>
            <span className="text-xs text-muted-foreground">{isAdmin ? "Platform Admin" : "Lead Automation"}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {isAdmin ? (
          <>
            {renderGroup("Overview", adminOverviewItems)}
            {renderGroup("Management", adminManagementItems)}
            {renderGroup("Monitoring", adminMonitoringItems)}
            {renderGroup("System", adminSystemItems)}
          </>
        ) : (
          <>
            {renderGroup("Overview", userOverviewItems)}
            {renderGroup("Leads", userLeadItems)}
            {renderGroup("Automation", userAutomationItems)}
            {renderGroup("Insights", userInsightsItems)}
            {renderGroup("LeadFlow AI", userLeadFlowAIItems)}
            {renderGroup("Account", userAccountItems)}
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="button-profile-menu"
              className="w-full flex items-center gap-3 p-2 rounded-md bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors cursor-pointer text-left"
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={userProfile?.profile_image_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {getInitials(userProfile?.first_name, userProfile?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {userProfile?.first_name || userProfile?.last_name ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() : "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">
                {userProfile?.first_name || userProfile?.last_name ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() : "User"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="menu-item-profile">
              <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                <UserCircle className="h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              data-testid="menu-item-logout"
              className="flex items-center gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
