import { useQuery, useMutation } from "@tanstack/react-query";
import { Sparkles, TrendingUp, Target, Lightbulb, RefreshCw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";

interface InsightData {
  topLeads: Lead[];
  recommendations: string[];
  trends: {
    label: string;
    value: string;
    trend: "up" | "down" | "neutral";
  }[];
}

export default function InsightsPage() {
  const { toast } = useToast();

  const { data: leads, isLoading: leadsLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/insights/generate", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to generate insights");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Insights Generated", description: "AI has analyzed your lead data" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate insights", variant: "destructive" });
    },
  });

  const topLeads = leads
    ?.filter((lead) => lead.aiScore !== null)
    .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
    .slice(0, 5) || [];

  const scoredLeads = leads?.filter((lead) => lead.aiScore !== null) || [];
  const avgScore = scoredLeads.length > 0
    ? Math.round(scoredLeads.reduce((acc, lead) => acc + (lead.aiScore || 0), 0) / scoredLeads.length)
    : 0;
  
  const hotLeads = leads?.filter((lead) => (lead.aiScore || 0) >= 70).length || 0;
  const warmLeads = leads?.filter((lead) => (lead.aiScore || 0) >= 40 && (lead.aiScore || 0) < 70).length || 0;
  const coldLeads = leads?.filter((lead) => (lead.aiScore || 0) < 40 || lead.aiScore === null).length || 0;

  const recommendations = [
    "Focus on leads with scores above 70 for higher conversion rates",
    "Leads from referral sources tend to have 25% higher scores",
    "Schedule follow-ups with qualified leads within 24 hours",
    "Consider nurturing campaigns for leads in the 40-70 score range",
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Insights</h1>
          <p className="text-muted-foreground">
            AI-powered analytics and recommendations for your leads
          </p>
        </div>
        <Button
          onClick={() => generateInsightsMutation.mutate()}
          disabled={generateInsightsMutation.isPending}
          data-testid="button-generate-insights"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${generateInsightsMutation.isPending ? "animate-spin" : ""}`} />
          {generateInsightsMutation.isPending ? "Analyzing..." : "Refresh Insights"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Hot Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-success/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{hotLeads}</p>
                <p className="text-xs text-muted-foreground">Score 70+</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warm Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-accent/20 flex items-center justify-center">
                <Target className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warmLeads}</p>
                <p className="text-xs text-muted-foreground">Score 40-69</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgScore}</p>
                <p className="text-xs text-muted-foreground">Out of 100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Performing Leads
            </CardTitle>
            <CardDescription>Highest AI-scored leads ready for action</CardDescription>
          </CardHeader>
          <CardContent>
            {leadsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : topLeads.length > 0 ? (
              <div className="space-y-3">
                {topLeads.map((lead, index) => (
                  <div
                    key={lead.id}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                    data-testid={`top-lead-${lead.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        <p className="text-sm text-muted-foreground">{lead.company || lead.email}</p>
                      </div>
                    </div>
                    <Badge
                      className={
                        (lead.aiScore || 0) >= 80
                          ? "bg-primary text-primary-foreground"
                          : "bg-success text-success-foreground"
                      }
                    >
                      {lead.aiScore}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No scored leads yet</p>
                <p className="text-sm">Run AI scoring on your leads to see insights</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-accent-foreground" />
              AI Recommendations
            </CardTitle>
            <CardDescription>Smart suggestions to improve conversions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary">{index + 1}</span>
                  </div>
                  <p className="text-sm">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-secondary" />
            Lead Funnel Analysis
          </CardTitle>
          <CardDescription>Visual breakdown of your lead pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center gap-4 flex-wrap py-4">
            <div className="flex flex-col items-center p-4">
              <div className="h-24 w-32 bg-gradient-to-b from-primary to-primary/80 rounded-t-full flex items-center justify-center">
                <span className="text-2xl font-bold text-primary-foreground">
                  {leads?.length || 0}
                </span>
              </div>
              <span className="text-sm font-medium mt-2">Total Leads</span>
            </div>
            <div className="text-4xl text-muted-foreground">&rarr;</div>
            <div className="flex flex-col items-center p-4">
              <div className="h-20 w-28 bg-gradient-to-b from-success to-success/80 rounded-t-full flex items-center justify-center">
                <span className="text-2xl font-bold text-success-foreground">{hotLeads}</span>
              </div>
              <span className="text-sm font-medium mt-2">Hot (70+)</span>
            </div>
            <div className="text-4xl text-muted-foreground">&rarr;</div>
            <div className="flex flex-col items-center p-4">
              <div className="h-16 w-24 bg-gradient-to-b from-accent to-accent/80 rounded-t-full flex items-center justify-center">
                <span className="text-2xl font-bold text-accent-foreground">{warmLeads}</span>
              </div>
              <span className="text-sm font-medium mt-2">Warm (40-69)</span>
            </div>
            <div className="text-4xl text-muted-foreground">&rarr;</div>
            <div className="flex flex-col items-center p-4">
              <div className="h-12 w-20 bg-gradient-to-b from-muted-foreground to-muted rounded-t-full flex items-center justify-center">
                <span className="text-xl font-bold text-background">{coldLeads}</span>
              </div>
              <span className="text-sm font-medium mt-2">Cold (&lt;40)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
