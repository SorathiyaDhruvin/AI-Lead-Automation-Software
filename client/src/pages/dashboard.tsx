import { useQuery } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/auth";
import type { Lead, Segment } from "@shared/schema";
import { LeadScoreChart } from "@/components/lead-score-chart";
import { RecentLeads } from "@/components/recent-leads";

interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  segments: number;
  avgScore: number;
  leadsTrend: number;
  scoreTrend: number;
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads", { limit: 5 }],
    queryFn: async () => {
      const response = await fetch("/api/leads?limit=5", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const { data: segments } = useQuery<Segment[]>({
    queryKey: ["/api/segments"],
    queryFn: async () => {
      const response = await fetch("/api/segments", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch segments");
      return response.json();
    },
  });

  const statCards = [
    {
      title: "Total Leads",
      value: stats?.totalLeads ?? 0,
      icon: Users,
      trend: stats?.leadsTrend ?? 0,
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Hot Leads",
      value: stats?.hotLeads ?? 0,
      icon: TrendingUp,
      trend: 12,
      color: "bg-success/10 text-success",
    },
    {
      title: "Segments",
      value: stats?.segments ?? 0,
      icon: Target,
      trend: 0,
      color: "bg-secondary/10 text-secondary",
    },
    {
      title: "Avg. AI Score",
      value: stats?.avgScore ?? 0,
      icon: Sparkles,
      trend: stats?.scoreTrend ?? 0,
      color: "bg-accent/10 text-accent-foreground",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your lead automation overview.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} data-testid={`card-stat-${stat.title.toLowerCase().replace(/\s+/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <div className="flex items-end justify-between gap-2">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  {stat.trend !== 0 && (
                    <Badge
                      variant="outline"
                      className={
                        stat.trend > 0
                          ? "text-success border-success/30"
                          : "text-destructive border-destructive/30"
                      }
                    >
                      {stat.trend > 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-1" />
                      )}
                      {Math.abs(stat.trend)}%
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Lead Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeadScoreChart leads={leads || []} isLoading={leadsLoading} />
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Active Segments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {segments && segments.length > 0 ? (
                <div className="space-y-3">
                  {segments.slice(0, 4).map((segment) => (
                    <div
                      key={segment.id}
                      className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      data-testid={`segment-item-${segment.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="font-medium">{segment.name}</span>
                      </div>
                      <Badge variant="secondary">{segment.leadCount} leads</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No segments created yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Recent Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RecentLeads leads={leads || []} isLoading={leadsLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
