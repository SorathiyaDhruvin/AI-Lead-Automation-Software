import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sparkles, Mail, Phone, Building, Calendar, Brain, TrendingUp, Lightbulb, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ScoreBadge } from "@/components/score-badge";
import type { Lead } from "@shared/schema";

interface LeadDetailsSheetProps {
  lead: Lead | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const categoryColors: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  Warm: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  Cold: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400",
};

export function LeadDetailsSheet({ lead, onClose }: LeadDetailsSheetProps) {
  const { toast } = useToast();

  const scoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leads/${lead?.id}/score`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to score lead");
      return response.json();
    },
    onSuccess: (updatedLead: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "AI Scoring Complete",
        description: `Lead scored ${updatedLead.aiScore}/100 — categorized as ${updatedLead.aiCategory}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to score lead", variant: "destructive" });
    },
  });

  if (!lead) return null;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(lead.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{lead.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
                {lead.aiCategory && (
                  <Badge
                    variant="outline"
                    className={categoryColors[lead.aiCategory] || ""}
                    data-testid="badge-ai-category"
                  >
                    {lead.aiCategory}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground capitalize">{lead.source}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">AI Score</p>
              <ScoreBadge score={lead.aiScore} size="lg" />
            </div>
            <Button
              onClick={() => scoreMutation.mutate()}
              disabled={scoreMutation.isPending}
              data-testid="button-ai-score"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {scoreMutation.isPending ? "Analyzing..." : "Score with AI"}
            </Button>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" /> Contact Information
            </h3>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
              {lead.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.phone}</span>
                </div>
              )}
              {lead.company && (
                <div className="flex items-center gap-3 text-sm">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  <span>{lead.company}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created {format(new Date(lead.createdAt), "MMM d, yyyy")}</span>
              </div>
            </div>
          </div>

          {(lead.aiPrediction || lead.aiInsights || lead.aiRecommendedAction) && (
            <>
              <Separator />
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {lead.aiPrediction && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Prediction</span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-ai-prediction">{lead.aiPrediction}</p>
                    </div>
                  )}
                  {lead.aiInsights && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-medium">Analysis</span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-ai-insights">{lead.aiInsights}</p>
                    </div>
                  )}
                  {lead.aiRecommendedAction && (
                    <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Recommended Action</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground" data-testid="text-recommended-action">
                          {lead.aiRecommendedAction}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {lead.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Notes</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
