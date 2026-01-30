import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Zap,
  Play,
  Pause,
  Settings,
  Clock,
  Mail,
  Target,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  icon: typeof Zap;
  color: string;
  enabled: boolean;
}

const defaultAutomations: AutomationRule[] = [
  {
    id: "auto-score",
    name: "Auto AI Scoring",
    description: "Automatically score new leads with AI when they are added",
    trigger: "New lead added",
    action: "Run AI scoring",
    icon: Sparkles,
    color: "#6C5CE7",
    enabled: true,
  },
  {
    id: "auto-segment",
    name: "Smart Segmentation",
    description: "Automatically assign leads to segments based on their score",
    trigger: "Lead scored",
    action: "Assign to segment",
    icon: Target,
    color: "#00D68F",
    enabled: true,
  },
  {
    id: "follow-up-reminder",
    name: "Follow-up Reminders",
    description: "Send reminders for leads that haven't been contacted in 3 days",
    trigger: "Lead inactive 3 days",
    action: "Send reminder",
    icon: Clock,
    color: "#FFB946",
    enabled: false,
  },
  {
    id: "welcome-email",
    name: "Welcome Email",
    description: "Send automated welcome email to new qualified leads",
    trigger: "Lead qualified",
    action: "Send email",
    icon: Mail,
    color: "#0066FF",
    enabled: false,
  },
];

export default function LeadAutomationPage() {
  const { toast } = useToast();
  const [automations, setAutomations] = useState<AutomationRule[]>(defaultAutomations);

  const { data: leads } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const scoreAllMutation = useMutation({
    mutationFn: async () => {
      const unscoredLeads = leads?.filter((l) => l.aiScore === null) || [];
      for (const lead of unscoredLeads) {
        await fetch(`/api/leads/${lead.id}/score`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
      }
      return unscoredLeads.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Scoring Complete", description: `${count} leads scored with AI` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to score leads", variant: "destructive" });
    },
  });

  const autoSegmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/segments/auto-segment", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to auto-segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Segmentation Complete", description: "Leads have been automatically segmented" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to segment leads", variant: "destructive" });
    },
  });

  const toggleAutomation = (id: string) => {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
    const automation = automations.find((a) => a.id === id);
    toast({
      title: automation?.enabled ? "Automation Disabled" : "Automation Enabled",
      description: `${automation?.name} has been ${automation?.enabled ? "disabled" : "enabled"}`,
    });
  };

  const runAutomation = (id: string) => {
    if (id === "auto-score") {
      scoreAllMutation.mutate();
    } else if (id === "auto-segment") {
      autoSegmentMutation.mutate();
    } else {
      toast({ title: "Coming Soon", description: "This automation will be available soon" });
    }
  };

  const unscoredLeads = leads?.filter((l) => l.aiScore === null).length || 0;
  const scoredLeads = leads?.filter((l) => l.aiScore !== null).length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Automation</h1>
          <p className="text-muted-foreground">Automate repetitive tasks and workflows</p>
        </div>
        <Button
          onClick={() => scoreAllMutation.mutate()}
          disabled={scoreAllMutation.isPending || unscoredLeads === 0}
          data-testid="button-run-all-automations"
        >
          <Play className="h-4 w-4 mr-2" />
          {scoreAllMutation.isPending ? "Running..." : "Run All Automations"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{scoredLeads}</p>
                <p className="text-sm text-muted-foreground">Leads Scored</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-accent/20 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unscoredLeads}</p>
                <p className="text-sm text-muted-foreground">Pending Scoring</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{automations.filter((a) => a.enabled).length}</p>
                <p className="text-sm text-muted-foreground">Active Automations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Automation Rules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((automation) => (
            <Card key={automation.id} className="hover-elevate" data-testid={`card-automation-${automation.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${automation.color}20` }}
                    >
                      <automation.icon className="h-5 w-5" style={{ color: automation.color }} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{automation.name}</CardTitle>
                      <CardDescription className="mt-0.5">{automation.description}</CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={automation.enabled}
                    onCheckedChange={() => toggleAutomation(automation.id)}
                    data-testid={`switch-automation-${automation.id}`}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">Trigger:</span> {automation.trigger}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium">Action:</span> {automation.action}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runAutomation(automation.id)}
                    disabled={!automation.enabled}
                    data-testid={`button-run-${automation.id}`}
                  >
                    <Play className="h-3 w-3 mr-1" />
                    Run Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
