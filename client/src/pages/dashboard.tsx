import { useQuery } from "@tanstack/react-query";
import {
  Users,
  TrendingUp,
  Target,
  Sparkles,
  BarChart3,
  CheckCircle2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getAuthHeaders } from "@/lib/auth";
import type { Lead, Segment } from "@shared/schema";
import { LeadScoreChart } from "@/components/lead-score-chart";
import { RecentLeads } from "@/components/recent-leads";
import { format } from "date-fns";

interface DailyTrend {
  date: string;
  count: number;
}

interface DashboardStats {
  totalLeads: number;
  hotLeads: number;
  segments: number;
  avgScore: number;
  conversionRate: number;
  statusCounts: Record<string, number>;
  dailyTrend: DailyTrend[];
  leadsTrend: number;
  scoreTrend: number;
}

const STATUS_COLORS: Record<string, string> = {
  new: "#0066FF",
  contacted: "#FFB946",
  qualified: "#00D68F",
  proposal: "#6C5CE7",
  negotiation: "#f97316",
  won: "#22c55e",
  lost: "#ef4444",
};

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
      subtitle: "All time",
      color: "bg-primary/10 text-primary",
    },
    {
      title: "Hot Leads",
      value: stats?.hotLeads ?? 0,
      icon: TrendingUp,
      subtitle: "Score ≥ 70",
      color: "bg-success/10 text-success",
    },
    {
      title: "Avg. AI Score",
      value: stats?.avgScore ?? 0,
      icon: Sparkles,
      subtitle: "Across scored leads",
      color: "bg-secondary/10 text-secondary",
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate ?? 0}%`,
      icon: CheckCircle2,
      subtitle: "Won / total leads",
      color: "bg-accent/10 text-accent-foreground",
    },
  ];

  const trendData = (stats?.dailyTrend ?? []).map((d) => ({
    date: format(new Date(d.date + "T12:00:00"), "MMM d"),
    Leads: d.count,
  }));

  const statusData = Object.entries(stats?.statusCounts ?? {}).map(([status, count]) => ({
    status: status.charAt(0).toUpperCase() + status.slice(1),
    count,
    fill: STATUS_COLORS[status] || "#6C5CE7",
  }));

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
          <Card key={index} data-testid={`card-stat-${stat.title.toLowerCase().replace(/[\s.%]+/g, "-")}`}>
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
                <div>
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
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
                <BarChart3 className="h-5 w-5 text-primary" />
                Leads Added — Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : trendData.length > 0 ? (
                <div className="h-[260px]" data-testid="chart-daily-trend">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={{ stroke: "hsl(var(--border))" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`${value} leads`, "Leads"]}
                      />
                      <Line
                        type="monotone"
                        dataKey="Leads"
                        stroke="#0066FF"
                        strokeWidth={2}
                        dot={{ fill: "#0066FF", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                  No leads data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Leads by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : statusData.length > 0 ? (
                <div className="h-[260px]" data-testid="chart-status-breakdown">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} layout="vertical">
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis type="category" dataKey="status" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={false} width={72} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(value: number) => [`${value}`, "Leads"]}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[260px] flex items-center justify-center text-muted-foreground">
                  No lead data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
