import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Zap,
  Play,
  Pause,
  Plus,
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
  Timer,
  Filter,
  ListChecks,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { AutomationRule, Workflow as WorkflowType, WorkflowExecution, ExecutionStats, EmailTemplate } from "@/types";
import { leadsService } from "@/services/leads";
import { automationService } from "@/services/automation";
import { workflowsService } from "@/services/workflows";
import { emailTemplatesService } from "@/services/emailTemplates";
import { segmentsService } from "@/services/segments";

const triggerOptions = [
  { id: "lead_created", name: "New Lead Created", icon: Users, color: "#0066FF" },
  { id: "lead_scored", name: "Lead Scored", icon: Sparkles, color: "#6C5CE7" },
  { id: "lead_status_changed", name: "Status Changed", icon: Activity, color: "#00D68F" },
  { id: "lead_request_approved", name: "Lead Request Approved", icon: CheckCircle, color: "#FFB946" },
  { id: "manual_run", name: "Manual Trigger", icon: Play, color: "#4ECDC4" },
];

const actionTypeOptions = [
  { id: "send_email", name: "Send Email", icon: Mail },
  { id: "ai_score", name: "Run AI Scoring", icon: Sparkles },
  { id: "assign_segment", name: "Assign to Segment", icon: Target },
  { id: "update_status", name: "Update Status", icon: Activity },
  { id: "notify_team", name: "Notify Team", icon: Bell },
  { id: "schedule_task", name: "Schedule Task", icon: Calendar },
];

const conditionTypeOptions = [
  { id: "score_gte", name: "Score ≥ threshold" },
  { id: "score_lte", name: "Score ≤ threshold" },
  { id: "status_equals", name: "Status equals" },
  { id: "status_changed_to", name: "Status changed to" },
  { id: "category_equals", name: "AI Category equals" },
  { id: "has_email", name: "Lead has email" },
];

export default function LeadAutomationPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("rules");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRuleFormOpen, setIsRuleFormOpen] = useState(false);

  // Workflow creation form state
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [newWorkflowDescription, setNewWorkflowDescription] = useState("");
  const [newWorkflowTrigger, setNewWorkflowTrigger] = useState("");
  const [newConditions, setNewConditions] = useState<Array<{ type: string; value: string }>>([]);
  const [newActions, setNewActions] = useState<Array<{ type: string; name: string; value: string; config?: Record<string, any> }>>([]);

  // Rule creation form state
  const [ruleName, setRuleName] = useState("");
  const [ruleTriggerType, setRuleTriggerType] = useState<string>("");
  const [ruleTriggerValue, setRuleTriggerValue] = useState<string>("");
  const [ruleActionType, setRuleActionType] = useState<string>("");
  const [ruleActionValue, setRuleActionValue] = useState<string>("");

  // ── Queries: All from API, no hardcoded data ──

  const { data: automationRules = [], isLoading: rulesLoading } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automation/rules"],
    queryFn: () => automationService.getRules(),
  });

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery<WorkflowType[]>({
    queryKey: ["/api/workflows"],
    queryFn: () => workflowsService.getAll(),
  });

  const { data: executions = [], isLoading: executionsLoading } = useQuery<WorkflowExecution[]>({
    queryKey: ["/api/workflows/executions"],
    queryFn: () => workflowsService.getExecutions(50),
  });

  const { data: executionStats } = useQuery<ExecutionStats>({
    queryKey: ["/api/workflows/stats"],
    queryFn: () => workflowsService.getStats(),
  });

  const { data: emailTemplates = [] } = useQuery<EmailTemplate[]>({
    queryKey: ["/api/email-templates"],
    queryFn: () => emailTemplatesService.getAll(),
  });

  // ── Mutations ──

  const createRuleMutation = useMutation({
    mutationFn: async () => {
      return automationService.createRule({
        name: ruleName,
        triggerType: ruleTriggerType,
        triggerValue: parseInt(ruleTriggerValue),
        actionType: ruleActionType,
        actionValue: ruleActionValue,
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      setIsRuleFormOpen(false);
      setRuleName(""); setRuleTriggerType(""); setRuleTriggerValue(""); setRuleActionType(""); setRuleActionValue("");
      toast({ title: "Rule Created", description: "Automation rule is now active" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create rule", variant: "destructive" });
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => automationService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
      toast({ title: "Rule Deleted", description: "Automation rule removed" });
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return automationService.toggleRule(id, isActive);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/rules"] });
    },
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async () => {
      return workflowsService.create({
        name: newWorkflowName,
        description: newWorkflowDescription || undefined,
        triggerType: newWorkflowTrigger,
        conditions: newConditions.map(c => ({ type: c.type, value: c.value })),
        actions: newActions.map(a => ({ type: a.type, name: a.name, value: a.value, config: a.config })),
        isActive: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/stats"] });
      setIsCreateOpen(false);
      resetWorkflowForm();
      toast({ title: "Workflow Created", description: "Your new workflow is now active" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create workflow", variant: "destructive" });
    },
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (id: string) => workflowsService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/stats"] });
      toast({ title: "Workflow Deleted", description: "Workflow has been removed" });
    },
  });

  const toggleWorkflowMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return workflowsService.toggle(id, isActive);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/stats"] });
      toast({
        title: data.is_active ? "Workflow Activated" : "Workflow Paused",
        description: `${data.name} has been ${data.is_active ? "activated" : "paused"}`,
      });
    },
  });

  const runWorkflowMutation = useMutation({
    mutationFn: async (id: string) => workflowsService.run(id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/executions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workflows/stats"] });
      toast({
        title: "Workflow Executed",
        description: `Executed on ${result.executed} leads${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Workflow execution failed", variant: "destructive" });
    },
  });

  const scoreAllMutation = useMutation({
    mutationFn: async () => {
      const leads = await leadsService.getAll();
      const unscoredLeads = leads?.filter((l) => l.aiScore === null) || [];
      for (const lead of unscoredLeads) {
        await leadsService.score(lead.id);
      }
      return unscoredLeads.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "AI Scoring Complete", description: `Scored ${count} leads` });
    },
    onError: () => {
      toast({ title: "Error", description: "AI scoring failed", variant: "destructive" });
    },
  });

  const autoSegmentMutation = useMutation({
    mutationFn: async () => segmentsService.autoSegment(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Auto-Segmentation Complete", description: "Leads have been segmented" });
    },
    onError: () => {
      toast({ title: "Error", description: "Auto-segmentation failed", variant: "destructive" });
    },
  });

  // ── Helpers ──

  function resetWorkflowForm() {
    setNewWorkflowName("");
    setNewWorkflowDescription("");
    setNewWorkflowTrigger("");
    setNewConditions([]);
    setNewActions([]);
  }

  function addCondition() {
    setNewConditions(prev => [...prev, { type: "", value: "" }]);
  }

  function addAction() {
    setNewActions(prev => [...prev, { type: "", name: "", value: "", config: {} }]);
  }

  function removeCondition(index: number) {
    setNewConditions(prev => prev.filter((_, i) => i !== index));
  }

  function removeAction(index: number) {
    setNewActions(prev => prev.filter((_, i) => i !== index));
  }

  const getTriggerInfo = (triggerType: string) => {
    return triggerOptions.find(t => t.id === triggerType) || { name: triggerType, icon: Zap, color: "#6b7280" };
  };

  const getActionIcon = (type: string) => {
    const found = actionTypeOptions.find(a => a.id === type);
    return found?.icon || Activity;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleString(undefined, {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  // ── Stats from real data ──
  const totalWorkflows = executionStats?.totalWorkflows ?? workflows.length;
  const activeWorkflows = executionStats?.activeWorkflows ?? workflows.filter(w => w.is_active).length;
  const totalExecutions = executionStats?.total ?? 0;
  const successRate = executionStats?.successRate ?? 0;

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

      {/* Stats Cards — all from real data */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-md bg-primary/20 flex items-center justify-center">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalWorkflows}</p>
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
          <TabsTrigger value="rules" data-testid="tab-rules">
            <ListChecks className="h-4 w-4 mr-2" />
            Rules
          </TabsTrigger>
          <TabsTrigger value="workflows" data-testid="tab-workflows">
            <Workflow className="h-4 w-4 mr-2" />
            Workflows
          </TabsTrigger>
          <TabsTrigger value="executions" data-testid="tab-executions">
            <Activity className="h-4 w-4 mr-2" />
            Execution History
          </TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">
            <Mail className="h-4 w-4 mr-2" />
            Email Templates
          </TabsTrigger>
        </TabsList>

        {/* ─── Rules Tab ─── */}
        <TabsContent value="rules" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-foreground">Automation Rules</h2>
              <p className="text-sm text-muted-foreground">
                Rules run hourly. Actions fire when conditions are met.
              </p>
            </div>
            <Button onClick={() => setIsRuleFormOpen(true)} data-testid="button-create-rule">
              <Plus className="h-4 w-4 mr-2" />
              Create Rule
            </Button>
          </div>

          {rulesLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}><CardContent className="p-4 h-20 animate-pulse bg-muted/40" /></Card>
              ))}
            </div>
          ) : automationRules.length > 0 ? (
            <div className="space-y-3">
              {automationRules.map((rule) => (
                <Card key={rule.id} className="hover-elevate" data-testid={`card-rule-${rule.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{rule.name}</span>
                          <Badge variant={rule.isActive ? "default" : "secondary"}>
                            {rule.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs gap-1">
                            <Zap className="h-3 w-3" />
                            {rule.triggerType === "score_threshold"
                              ? `Score ≥ ${rule.triggerValue}`
                              : `No contact ${rule.triggerValue}h`}
                          </Badge>
                          <ArrowRight className="h-3 w-3" />
                          <Badge variant="outline" className="text-xs gap-1">
                            {rule.actionType === "send_email" ? (
                              <Mail className="h-3 w-3" />
                            ) : (
                              <Activity className="h-3 w-3" />
                            )}
                            {rule.actionType === "send_email"
                              ? `Send email: "${rule.actionValue}"`
                              : `Set status: ${rule.actionValue}`}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) =>
                            toggleRuleMutation.mutate({ id: rule.id, isActive: checked })
                          }
                          data-testid={`switch-rule-${rule.id}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteRuleMutation.mutate(rule.id)}
                          data-testid={`button-delete-rule-${rule.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <ListChecks className="h-10 w-10 opacity-30" />
                <p className="font-medium">No rules yet</p>
                <p className="text-sm text-center">
                  Create your first rule to automate lead actions based on score or inactivity.
                </p>
                <Button onClick={() => setIsRuleFormOpen(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Workflows Tab — Database-backed ─── */}
        <TabsContent value="workflows" className="space-y-4 mt-4">
          {workflowsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}><CardContent className="p-4 h-28 animate-pulse bg-muted/40" /></Card>
              ))}
            </div>
          ) : workflows.length > 0 ? (
            workflows.map((workflow) => {
              const triggerInfo = getTriggerInfo(workflow.trigger_type);
              const TriggerIcon = triggerInfo.icon;
              const actions = Array.isArray(workflow.actions) ? workflow.actions : [];

              return (
                <Card key={workflow.id} className="hover-elevate" data-testid={`card-workflow-${workflow.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div
                          className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${triggerInfo.color}20` }}
                        >
                          <TriggerIcon className="h-6 w-6" style={{ color: triggerInfo.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{workflow.name}</h3>
                            <Badge variant={workflow.is_active ? "default" : "secondary"}>
                              {workflow.is_active ? "active" : "paused"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {workflow.description || "No description"}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              {triggerInfo.name}
                            </Badge>
                            {actions.length > 0 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                            {actions.slice(0, 3).map((action: any, index: number) => {
                              const ActionIcon = getActionIcon(action.type);
                              return (
                                <Badge key={index} variant="outline" className="text-xs">
                                  <ActionIcon className="h-3 w-3 mr-1" />
                                  {action.name || action.type}
                                </Badge>
                              );
                            })}
                            {actions.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{actions.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="text-muted-foreground">
                            {formatDate(workflow.updated_at)}
                          </p>
                        </div>
                        <Switch
                          checked={workflow.is_active}
                          onCheckedChange={(checked) =>
                            toggleWorkflowMutation.mutate({ id: workflow.id, isActive: checked })
                          }
                          data-testid={`switch-workflow-${workflow.id}`}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-workflow-menu-${workflow.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => runWorkflowMutation.mutate(workflow.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Run Now
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deleteWorkflowMutation.mutate(workflow.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                <Workflow className="h-10 w-10 opacity-30" />
                <p className="font-medium">No workflows yet</p>
                <p className="text-sm text-center">
                  Create your first workflow to automate lead management tasks.
                </p>
                <Button onClick={() => setIsCreateOpen(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Workflow
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── Execution History Tab — Real database data ─── */}
        <TabsContent value="executions" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Executions</CardTitle>
              <CardDescription>Track workflow runs and their status — all from real execution data</CardDescription>
            </CardHeader>
            <CardContent>
              {executionsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : executions.length > 0 ? (
                <div className="space-y-3">
                  {executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`execution-${execution.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${execution.status === "success" ? "bg-success/20" :
                            execution.status === "running" ? "bg-primary/20" :
                              execution.status === "skipped" ? "bg-muted" : "bg-destructive/20"
                          }`}>
                          {execution.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-success" />
                          ) : execution.status === "running" ? (
                            <Activity className="h-4 w-4 text-primary animate-pulse" />
                          ) : execution.status === "skipped" ? (
                            <Pause className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{execution.workflow_name || "Unknown Workflow"}</p>
                          <p className="text-xs text-muted-foreground">
                            Lead: {execution.lead_name || "Unknown"} • {execution.actions_completed}/{execution.total_actions} steps
                            {execution.error && ` • ${execution.error}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          execution.status === "success" ? "default" :
                            execution.status === "running" ? "secondary" :
                              execution.status === "skipped" ? "outline" : "destructive"
                        }>
                          {execution.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(execution.started_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No executions yet</p>
                  <p className="text-sm">Workflow executions will appear here when they run.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Email Templates Tab — Real database data ─── */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {emailTemplates.map((template) => (
              <Card key={template.id} className="hover-elevate" data-testid={`template-${template.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: template.is_system ? "#6C5CE720" : "#0066FF20" }}
                    >
                      <Mail className="h-5 w-5" style={{ color: template.is_system ? "#6C5CE7" : "#0066FF" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        {template.is_system && (
                          <Badge variant="outline" className="text-xs flex-shrink-0">System</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{template.subject}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Badge variant="outline" className="text-xs">
                      {(template.variables || []).length} variables
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {formatDate(template.updated_at || template.created_at)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
            {emailTemplates.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
                  <Mail className="h-10 w-10 opacity-30" />
                  <p className="font-medium">No email templates</p>
                  <p className="text-sm">Run the database migration to seed system templates.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Create Workflow Dialog ─── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Workflow</DialogTitle>
            <DialogDescription>Set up an automated workflow that runs on the server.</DialogDescription>
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
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="What does this workflow do?"
                value={newWorkflowDescription}
                onChange={(e) => setNewWorkflowDescription(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Trigger Event</label>
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

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Conditions (optional)</label>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {newConditions.map((cond, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Select
                    value={cond.type}
                    onValueChange={(val) => {
                      const updated = [...newConditions];
                      updated[i].type = val;
                      setNewConditions(updated);
                    }}
                  >
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Condition type" /></SelectTrigger>
                    <SelectContent>
                      {conditionTypeOptions.map(opt => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Value"
                    value={cond.value}
                    onChange={(e) => {
                      const updated = [...newConditions];
                      updated[i].value = e.target.value;
                      setNewConditions(updated);
                    }}
                    className="w-32"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Actions</label>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {newActions.map((action, i) => (
                <div key={i} className="flex flex-col gap-2 mb-4 p-3 border rounded-md relative bg-muted/20">
                  <div className="flex gap-2">
                    <Select
                      value={action.type}
                      onValueChange={(val) => {
                        const updated = [...newActions];
                        updated[i].type = val;
                        updated[i].name = actionTypeOptions.find(a => a.id === val)?.name || val;
                        if (val === "send_email") {
                          updated[i].config = { recipient: "[ Lead Email ]" };
                        }
                        setNewActions(updated);
                      }}
                    >
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Action type" /></SelectTrigger>
                      <SelectContent>
                        {actionTypeOptions.map(opt => (
                          <SelectItem key={opt.id} value={opt.id}>
                            <div className="flex items-center gap-2">
                              <opt.icon className="h-4 w-4" />
                              {opt.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {action.type !== "send_email" && (
                      <Input
                        placeholder="Value (e.g. status)"
                        value={action.value}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[i].value = e.target.value;
                          setNewActions(updated);
                        }}
                        className="flex-1"
                      />
                    )}

                    <Button variant="ghost" size="icon" onClick={() => removeAction(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {action.type === "send_email" && (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Template Name</label>
                        <Input
                          placeholder="Template Name"
                          value={action.value}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[i].value = e.target.value;
                            setNewActions(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipient</label>
                        <Input
                          placeholder="e.g. [ Lead Email ] or user@example.com, other@gmail.com"
                          value={action.config?.recipient || ""}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[i].config = { ...updated[i].config, recipient: e.target.value };
                            setNewActions(updated);
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Comma-separated emails supported</p>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">CC (Optional)</label>
                        <Input
                          placeholder="CC Emails"
                          value={action.config?.cc || ""}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[i].config = { ...updated[i].config, cc: e.target.value };
                            setNewActions(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">BCC (Optional)</label>
                        <Input
                          placeholder="BCC Emails"
                          value={action.config?.bcc || ""}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[i].config = { ...updated[i].config, bcc: e.target.value };
                            setNewActions(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Sender Name (Optional)</label>
                        <Input
                          placeholder="Sender Name"
                          value={action.config?.fromName || ""}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[i].config = { ...updated[i].config, fromName: e.target.value };
                            setNewActions(updated);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Sender Email (Optional)</label>
                        <Input
                          placeholder="Sender Email"
                          value={action.config?.fromEmail || ""}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[i].config = { ...updated[i].config, fromEmail: e.target.value };
                            setNewActions(updated);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetWorkflowForm(); }}>
                Cancel
              </Button>
              <Button
                onClick={() => createWorkflowMutation.mutate()}
                disabled={!newWorkflowName || !newWorkflowTrigger || createWorkflowMutation.isPending}
                data-testid="button-submit-workflow"
              >
                {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Rule Dialog ─── */}
      <Dialog open={isRuleFormOpen} onOpenChange={setIsRuleFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Define a trigger condition and the action to take when it fires.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Rule Name</label>
              <Input
                placeholder="e.g. Hot Lead Alert"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                data-testid="input-rule-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Trigger Type</label>
                <Select value={ruleTriggerType} onValueChange={setRuleTriggerType}>
                  <SelectTrigger data-testid="select-rule-trigger-type">
                    <SelectValue placeholder="Select trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score_threshold">Score Threshold</SelectItem>
                    <SelectItem value="inactivity">Inactivity Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {ruleTriggerType === "score_threshold" ? "Min Score" : "Hours Inactive"}
                </label>
                <Input
                  type="number"
                  placeholder={ruleTriggerType === "score_threshold" ? "80" : "48"}
                  value={ruleTriggerValue}
                  onChange={(e) => setRuleTriggerValue(e.target.value)}
                  data-testid="input-rule-trigger-value"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Action Type</label>
                <Select value={ruleActionType} onValueChange={setRuleActionType}>
                  <SelectTrigger data-testid="select-rule-action-type">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="send_email">Send Email</SelectItem>
                    <SelectItem value="update_status">Update Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">
                  {ruleActionType === "send_email" ? "Email Subject" : "New Status"}
                </label>
                <Input
                  placeholder={ruleActionType === "send_email" ? "Follow-up needed" : "qualified"}
                  value={ruleActionValue}
                  onChange={(e) => setRuleActionValue(e.target.value)}
                  data-testid="input-rule-action-value"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsRuleFormOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createRuleMutation.mutate()}
                disabled={!ruleName || !ruleTriggerType || !ruleTriggerValue || !ruleActionType || !ruleActionValue || createRuleMutation.isPending}
                data-testid="button-submit-rule"
              >
                {createRuleMutation.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
