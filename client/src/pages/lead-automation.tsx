import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Zap,
  Play,
  Pause,
  Plus,
  Settings,
  Clock,
  Mail,
  Target,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Workflow,
  ArrowRight,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Activity,
  Users,
  MessageSquare,
  Bell,
  Calendar,
  GitBranch,
  Timer,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";

interface WorkflowStep {
  id: string;
  type: "trigger" | "condition" | "action" | "delay";
  name: string;
  config: Record<string, any>;
}

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  triggerIcon: typeof Zap;
  triggerColor: string;
  steps: WorkflowStep[];
  enabled: boolean;
  executions: number;
  lastRun: Date | null;
  status: "active" | "paused" | "draft";
}

const triggerOptions = [
  { id: "new_lead", name: "New Lead Created", icon: Users, color: "#0066FF" },
  { id: "lead_scored", name: "Lead Scored", icon: Sparkles, color: "#6C5CE7" },
  { id: "status_change", name: "Status Changed", icon: Activity, color: "#00D68F" },
  { id: "time_based", name: "Time-Based Trigger", icon: Clock, color: "#FFB946" },
  { id: "inactivity", name: "Lead Inactivity", icon: Timer, color: "#FF6B6B" },
];

const actionOptions = [
  { id: "send_email", name: "Send Email", icon: Mail },
  { id: "send_sms", name: "Send SMS", icon: MessageSquare },
  { id: "ai_score", name: "Run AI Scoring", icon: Sparkles },
  { id: "assign_segment", name: "Assign to Segment", icon: Target },
  { id: "update_status", name: "Update Status", icon: Activity },
  { id: "notify_team", name: "Notify Team", icon: Bell },
  { id: "schedule_task", name: "Schedule Task", icon: Calendar },
];

const defaultWorkflows: Workflow[] = [
  {
    id: "wf-1",
    name: "New Lead Onboarding",
    description: "Automatically score and segment new leads when they are created",
    trigger: "new_lead",
    triggerIcon: Users,
    triggerColor: "#0066FF",
    steps: [
      { id: "s1", type: "action", name: "Run AI Scoring", config: {} },
      { id: "s2", type: "delay", name: "Wait 1 hour", config: { hours: 1 } },
      { id: "s3", type: "action", name: "Assign to Segment", config: {} },
      { id: "s4", type: "action", name: "Send Welcome Email", config: {} },
    ],
    enabled: true,
    executions: 47,
    lastRun: new Date(Date.now() - 3600000),
    status: "active",
  },
  {
    id: "wf-2",
    name: "Hot Lead Alert",
    description: "Notify sales team when a lead scores above 80",
    trigger: "lead_scored",
    triggerIcon: Sparkles,
    triggerColor: "#6C5CE7",
    steps: [
      { id: "s1", type: "condition", name: "If score > 80", config: { operator: ">", value: 80 } },
      { id: "s2", type: "action", name: "Notify Team", config: {} },
      { id: "s3", type: "action", name: "Update Status to Qualified", config: { status: "qualified" } },
    ],
    enabled: true,
    executions: 23,
    lastRun: new Date(Date.now() - 7200000),
    status: "active",
  },
  {
    id: "wf-3",
    name: "Follow-up Reminder",
    description: "Send reminder for leads not contacted in 3 days",
    trigger: "inactivity",
    triggerIcon: Timer,
    triggerColor: "#FF6B6B",
    steps: [
      { id: "s1", type: "condition", name: "If inactive for 3 days", config: { days: 3 } },
      { id: "s2", type: "action", name: "Notify Team", config: {} },
      { id: "s3", type: "action", name: "Schedule Follow-up Task", config: {} },
    ],
    enabled: false,
    executions: 12,
    lastRun: new Date(Date.now() - 86400000),
    status: "paused",
  },
  {
    id: "wf-4",
    name: "Nurture Campaign",
    description: "Automated email sequence for warm leads",
    trigger: "status_change",
    triggerIcon: Activity,
    triggerColor: "#00D68F",
    steps: [
      { id: "s1", type: "condition", name: "If status = contacted", config: { status: "contacted" } },
      { id: "s2", type: "action", name: "Send Introduction Email", config: {} },
      { id: "s3", type: "delay", name: "Wait 2 days", config: { days: 2 } },
      { id: "s4", type: "action", name: "Send Follow-up Email", config: {} },
      { id: "s5", type: "delay", name: "Wait 3 days", config: { days: 3 } },
      { id: "s6", type: "action", name: "Send Case Study", config: {} },
    ],
    enabled: true,
    executions: 89,
    lastRun: new Date(Date.now() - 1800000),
    status: "active",
  },
];

interface ExecutionLog {
  id: string;
  workflowName: string;
  leadName: string;
  status: "success" | "failed" | "running";
  startedAt: Date;
  completedAt: Date | null;
  stepsCompleted: number;
  totalSteps: number;
}

const mockExecutions: ExecutionLog[] = [
  { id: "e1", workflowName: "New Lead Onboarding", leadName: "Sarah Chen", status: "success", startedAt: new Date(Date.now() - 3600000), completedAt: new Date(Date.now() - 3500000), stepsCompleted: 4, totalSteps: 4 },
  { id: "e2", workflowName: "Hot Lead Alert", leadName: "Michael Rodriguez", status: "success", startedAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 7100000), stepsCompleted: 3, totalSteps: 3 },
  { id: "e3", workflowName: "Nurture Campaign", leadName: "Emily Watson", status: "running", startedAt: new Date(Date.now() - 1800000), completedAt: null, stepsCompleted: 2, totalSteps: 6 },
  { id: "e4", workflowName: "New Lead Onboarding", leadName: "David Kim", status: "success", startedAt: new Date(Date.now() - 86400000), completedAt: new Date(Date.now() - 86300000), stepsCompleted: 4, totalSteps: 4 },
  { id: "e5", workflowName: "Follow-up Reminder", leadName: "Robert Thompson", status: "failed", startedAt: new Date(Date.now() - 172800000), completedAt: new Date(Date.now() - 172700000), stepsCompleted: 1, totalSteps: 3 },
];

export default function LeadAutomationPage() {
  const { toast } = useToast();
  const [workflows, setWorkflows] = useState<Workflow[]>(defaultWorkflows);
  const [activeTab, setActiveTab] = useState("workflows");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState("");

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
      toast({ title: "Workflow Executed", description: `AI scoring completed for ${count} leads` });
    },
    onError: () => {
      toast({ title: "Error", description: "Workflow execution failed", variant: "destructive" });
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
      toast({ title: "Workflow Executed", description: "Auto-segmentation completed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Workflow execution failed", variant: "destructive" });
    },
  });

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => {
        if (wf.id === id) {
          const newEnabled = !wf.enabled;
          return { ...wf, enabled: newEnabled, status: newEnabled ? "active" : "paused" };
        }
        return wf;
      })
    );
    const workflow = workflows.find((wf) => wf.id === id);
    toast({
      title: workflow?.enabled ? "Workflow Paused" : "Workflow Activated",
      description: `${workflow?.name} has been ${workflow?.enabled ? "paused" : "activated"}`,
    });
  };

  const runWorkflow = (workflow: Workflow) => {
    if (workflow.trigger === "new_lead" || workflow.id === "wf-1") {
      scoreAllMutation.mutate();
    } else if (workflow.id === "wf-2") {
      autoSegmentMutation.mutate();
    } else {
      toast({ title: "Workflow Triggered", description: `${workflow.name} is now running` });
    }
  };

  const duplicateWorkflow = (workflow: Workflow) => {
    const newWorkflow: Workflow = {
      ...workflow,
      id: `wf-${Date.now()}`,
      name: `${workflow.name} (Copy)`,
      enabled: false,
      status: "draft",
      executions: 0,
      lastRun: null,
    };
    setWorkflows((prev) => [...prev, newWorkflow]);
    toast({ title: "Workflow Duplicated", description: "A copy of the workflow has been created" });
  };

  const deleteWorkflow = (id: string) => {
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
    toast({ title: "Workflow Deleted", description: "The workflow has been removed" });
  };

  const createWorkflow = () => {
    if (!newWorkflowName || !newWorkflowTrigger) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    const trigger = triggerOptions.find((t) => t.id === newWorkflowTrigger);
    const newWorkflow: Workflow = {
      id: `wf-${Date.now()}`,
      name: newWorkflowName,
      description: "New workflow",
      trigger: newWorkflowTrigger,
      triggerIcon: trigger?.icon || Zap,
      triggerColor: trigger?.color || "#0066FF",
      steps: [],
      enabled: false,
      status: "draft",
      executions: 0,
      lastRun: null,
    };
    setWorkflows((prev) => [...prev, newWorkflow]);
    setIsCreateOpen(false);
    setNewWorkflowName("");
    setNewWorkflowTrigger("");
    toast({ title: "Workflow Created", description: "Your new workflow is ready to configure" });
  };

  const activeWorkflows = workflows.filter((wf) => wf.enabled).length;
  const totalExecutions = workflows.reduce((acc, wf) => acc + wf.executions, 0);
  const successRate = 94;

  const getStepIcon = (type: string) => {
    switch (type) {
      case "trigger": return Zap;
      case "condition": return Filter;
      case "action": return Play;
      case "delay": return Clock;
      default: return Activity;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflow Automation</h1>
          <p className="text-muted-foreground">Build and manage automated workflows for your leads</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-workflow">
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{workflows.length}</p>
                <p className="text-sm text-muted-foreground">Total Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-success/20 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeWorkflows}</p>
                <p className="text-sm text-muted-foreground">Active Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-secondary/20 flex items-center justify-center">
                <Activity className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalExecutions}</p>
                <p className="text-sm text-muted-foreground">Total Executions</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-accent/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="workflows" data-testid="tab-workflows">
            <Workflow className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="executions" data-testid="tab-executions">
            <Activity className="h-4 w-4 mr-2" />
            Execution History
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Copy className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4 mt-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="hover-elevate" data-testid={`card-workflow-${workflow.id}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div
                      className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${workflow.triggerColor}20` }}
                    >
                      <workflow.triggerIcon className="h-6 w-6" style={{ color: workflow.triggerColor }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{workflow.name}</h3>
                        <Badge
                          variant={workflow.status === "active" ? "default" : workflow.status === "paused" ? "secondary" : "outline"}
                        >
                          {workflow.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{workflow.description}</p>
                      
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          <Zap className="h-3 w-3 mr-1" />
                          {triggerOptions.find((t) => t.id === workflow.trigger)?.name || workflow.trigger}
                        </Badge>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        {workflow.steps.slice(0, 3).map((step, index) => {
                          const StepIcon = getStepIcon(step.type);
                          return (
                            <Badge key={step.id} variant="outline" className="text-xs">
                              <StepIcon className="h-3 w-3 mr-1" />
                              {step.name}
                            </Badge>
                          );
                        })}
                        {workflow.steps.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{workflow.steps.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm">
                      <p className="font-medium">{workflow.executions} runs</p>
                      <p className="text-muted-foreground">
                        {workflow.lastRun ? `Last: ${workflow.lastRun.toLocaleDateString()}` : "Never run"}
                      </p>
                    </div>
                    <Switch
                      checked={workflow.enabled}
                      onCheckedChange={() => toggleWorkflow(workflow.id)}
                      data-testid={`switch-workflow-${workflow.id}`}
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" data-testid={`button-workflow-menu-${workflow.id}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => runWorkflow(workflow)}>
                          <Play className="h-4 w-4 mr-2" />
                          Run Now
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedWorkflow(workflow)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Workflow
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => duplicateWorkflow(workflow)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => deleteWorkflow(workflow.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>Track workflow runs and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockExecutions.map((execution) => (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`execution-${execution.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                        execution.status === "success" ? "bg-success/20" :
                        execution.status === "running" ? "bg-primary/20" : "bg-destructive/20"
                      }`}>
                        {execution.status === "success" ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : execution.status === "running" ? (
                          <Activity className="h-4 w-4 text-primary animate-pulse" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{execution.workflowName}</p>
                        <p className="text-xs text-muted-foreground">
                          Lead: {execution.leadName} • {execution.stepsCompleted}/{execution.totalSteps} steps
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        execution.status === "success" ? "default" :
                        execution.status === "running" ? "secondary" : "destructive"
                      }>
                        {execution.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {execution.startedAt.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: "Lead Nurture Sequence", description: "Multi-step email campaign for new leads", icon: Mail, color: "#0066FF" },
              { name: "Hot Lead Escalation", description: "Alert sales when high-value lead detected", icon: Bell, color: "#FF6B6B" },
              { name: "Re-engagement Campaign", description: "Win back inactive leads", icon: Users, color: "#FFB946" },
              { name: "Qualification Workflow", description: "Automatically qualify leads based on criteria", icon: Target, color: "#00D68F" },
              { name: "Meeting Scheduler", description: "Auto-schedule follow-ups for qualified leads", icon: Calendar, color: "#6C5CE7" },
              { name: "Score & Segment", description: "AI scoring with automatic segmentation", icon: Sparkles, color: "#4ECDC4" },
            ].map((template, index) => (
              <Card key={index} className="hover-elevate cursor-pointer" data-testid={`template-${index}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${template.color}20` }}
                    >
                      <template.icon className="h-5 w-5" style={{ color: template.color }} />
                    </div>
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Use Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Set up a new automated workflow for your leads</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Workflow Name</label>
              <Input
                placeholder="Enter workflow name"
                value={newWorkflowName}
                onChange={(e) => setNewWorkflowName(e.target.value)}
                data-testid="input-workflow-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Trigger</label>
              <Select value={newWorkflowTrigger} onValueChange={setNewWorkflowTrigger}>
                <SelectTrigger data-testid="select-workflow-trigger">
                  <SelectValue placeholder="Select a trigger" />
                </SelectTrigger>
                <SelectContent>
                  {triggerOptions.map((trigger) => (
                    <SelectItem key={trigger.id} value={trigger.id}>
                      <div className="flex items-center gap-2">
                        <trigger.icon className="h-4 w-4" style={{ color: trigger.color }} />
                        {trigger.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={createWorkflow} data-testid="button-submit-workflow">
                Create Workflow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedWorkflow} onOpenChange={() => setSelectedWorkflow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Workflow: {selectedWorkflow?.name}</DialogTitle>
            <DialogDescription>Configure the workflow steps and actions</DialogDescription>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm font-medium mb-2">Workflow Steps</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Trigger:</span>
                    <span className="text-sm">{triggerOptions.find((t) => t.id === selectedWorkflow.trigger)?.name}</span>
                  </div>
                  {selectedWorkflow.steps.map((step, index) => {
                    const StepIcon = getStepIcon(step.type);
                    return (
                      <div key={step.id} className="flex items-center gap-2 p-2 rounded bg-background">
                        <span className="text-xs text-muted-foreground w-4">{index + 1}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <StepIcon className="h-4 w-4" />
                        <span className="text-sm">{step.name}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{step.type}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setSelectedWorkflow(null)}>
                  Close
                </Button>
                <Button onClick={() => {
                  runWorkflow(selectedWorkflow);
                  setSelectedWorkflow(null);
                }}>
                  <Play className="h-4 w-4 mr-2" />
                  Run Workflow
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
