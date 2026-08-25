import { useQuery } from "@tanstack/react-query";
import { Users, FileText, Zap, Mail, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/services/admin";
import type { AdminPlatformStats } from "@/services/admin";

export default function AdminPage() {
  const { data: stats, isLoading } = useQuery<AdminPlatformStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => adminService.getPlatformStats(),
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
          <p className="text-muted-foreground">Monitor platform-wide statistics and activity</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.users.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.users.active.toLocaleString()} active in last 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Lead Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.leadRequests.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.leadRequests.pending.toLocaleString()} pending review
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Automations</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.automations.totalWorkflows.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.automations.executions.toLocaleString()} total executions
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.emails.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1 text-green-500">
              {stats?.emails.delivered.toLocaleString()} delivered successfully
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
         <Card>
            <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Platform components status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">API Server</span>
                    <span className="text-sm text-green-500 font-medium flex items-center"><TrendingUp className="w-4 h-4 mr-1"/> Online</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database</span>
                    <span className="text-sm text-green-500 font-medium flex items-center"><TrendingUp className="w-4 h-4 mr-1"/> Online</span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Email Provider</span>
                    <span className="text-sm text-green-500 font-medium flex items-center"><TrendingUp className="w-4 h-4 mr-1"/> Online</span>
                </div>
            </CardContent>
         </Card>
      </div>
    </div>
  );
}
