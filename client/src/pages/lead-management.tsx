import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  Mail,
  Phone,
  Building,
  Plus,
  Calendar,
  MessageSquare,
  CheckCircle,
  Clock,
  Send,
  PhoneCall,
  Video,
  FileText,
  Activity,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { LeadDialog } from "@/components/lead-dialog";
import type { Lead } from "@shared/schema";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  proposal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusSteps = ["new", "contacted", "qualified", "proposal", "negotiation"];

interface ActivityItem {
  id: string;
  type: "call" | "email" | "meeting" | "note" | "task" | "status_change";
  title: string;
  description: string;
  timestamp: Date;
  completed?: boolean;
}

export default function LeadManagementPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: async () => {
      const response = await fetch("/api/leads", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`, undefined, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Lead deleted", description: "The lead has been removed" });
      setDetailLead(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest("PATCH", `/api/leads/${id}`, { status }, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Status Updated", description: "Lead status has been changed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const lead = leads?.find((l) => l.id === id);
      const existingNotes = lead?.notes || "";
      const timestamp = new Date().toLocaleString();
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n[${timestamp}]\n${note}`
        : `[${timestamp}]\n${note}`;
      return apiRequest("PATCH", `/api/leads/${id}`, { notes: updatedNotes }, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      setNewNote("");
      toast({ title: "Note Added", description: "Activity note has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/leads/${id}/score`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to score lead");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      if (detailLead) {
        setDetailLead(data);
      }
      toast({ title: "Lead Scored", description: "AI scoring complete" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to score lead", variant: "destructive" });
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score >= 70) return "bg-success text-success-foreground";
    if (score >= 40) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call": return PhoneCall;
      case "email": return Mail;
      case "meeting": return Video;
      case "note": return FileText;
      case "task": return CheckCircle;
      default: return Activity;
    }
  };

  const mockActivities: ActivityItem[] = detailLead ? [
    {
      id: "1",
      type: "status_change",
      title: "Status changed to " + detailLead.status,
      description: "Lead status was updated",
      timestamp: new Date(detailLead.updatedAt || detailLead.createdAt),
    },
    {
      id: "2",
      type: "note",
      title: "Lead created",
      description: `Lead was added from ${detailLead.source} source`,
      timestamp: new Date(detailLead.createdAt),
    },
  ] : [];

  const handleQuickAction = (action: string, lead: Lead) => {
    switch (action) {
      case "call":
        if (lead.phone) {
          window.open(`tel:${lead.phone}`);
          addNoteMutation.mutate({ id: lead.id, note: `Initiated call to ${lead.phone}` });
        } else {
          toast({ title: "No Phone", description: "This lead has no phone number", variant: "destructive" });
        }
        break;
      case "email":
        window.open(`mailto:${lead.email}`);
        addNoteMutation.mutate({ id: lead.id, note: `Sent email to ${lead.email}` });
        break;
      case "meeting":
        toast({ title: "Schedule Meeting", description: "Meeting scheduler coming soon" });
        break;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Management</h1>
          <p className="text-muted-foreground">Manage leads, track activities, and close deals</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-lead">
          <Plus className="h-4 w-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads by name, email, or company..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-leads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48 mb-4" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLeads && filteredLeads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLeads.map((lead) => (
            <Card 
              key={lead.id} 
              className="hover-elevate cursor-pointer" 
              onClick={() => setDetailLead(lead)}
              data-testid={`card-lead-${lead.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{lead.name}</h3>
                      <p className="text-sm text-muted-foreground">{lead.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" data-testid={`button-lead-actions-${lead.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("call", lead); }}>
                        <PhoneCall className="h-4 w-4 mr-2" />
                        Call
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("email", lead); }}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("meeting", lead); }}>
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Meeting
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); scoreMutation.mutate(lead.id); }}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        AI Score
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lead.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-3">
                  {lead.company && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-3 w-3" />
                      {lead.company}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {lead.phone}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
                  {lead.aiScore !== null && (
                    <Badge className={getScoreColor(lead.aiScore)}>
                      Score: {lead.aiScore}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleQuickAction("call", lead); }}
                  >
                    <PhoneCall className="h-3 w-3 mr-1" />
                    Call
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleQuickAction("email", lead); }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleQuickAction("meeting", lead); }}
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Meet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-1">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first lead to get started"}
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          </CardContent>
        </Card>
      )}

      <LeadDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedLead(null);
        }}
        lead={selectedLead}
      />

      <Sheet open={!!detailLead} onOpenChange={() => setDetailLead(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-7 w-7 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-xl">{detailLead?.name}</SheetTitle>
                <SheetDescription>{detailLead?.company || detailLead?.email}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {detailLead && (
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => handleQuickAction("call", detailLead)} data-testid="button-detail-call">
                  <PhoneCall className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickAction("email", detailLead)} data-testid="button-detail-email">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickAction("meeting", detailLead)} data-testid="button-detail-meeting">
                  <Calendar className="h-4 w-4 mr-2" />
                  Meeting
                </Button>
                <Button size="sm" variant="outline" onClick={() => scoreMutation.mutate(detailLead.id)} data-testid="button-detail-score">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Score
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Pipeline Stage</p>
                <div className="flex items-center gap-1">
                  {statusSteps.map((step, index) => {
                    const isActive = statusSteps.indexOf(detailLead.status) >= index;
                    const isCurrent = detailLead.status === step;
                    return (
                      <button
                        key={step}
                        onClick={() => updateStatusMutation.mutate({ id: detailLead.id, status: step })}
                        className={`flex-1 h-2 rounded-full transition-colors ${
                          isActive ? "bg-primary" : "bg-muted"
                        } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        data-testid={`button-stage-${step}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {statusSteps.map((step) => (
                    <span key={step} className="text-xs text-muted-foreground capitalize">{step}</span>
                  ))}
                </div>
              </div>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1">Activity</TabsTrigger>
                  <TabsTrigger value="notes" className="flex-1">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Email</p>
                      <p className="text-sm">{detailLead.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Phone</p>
                      <p className="text-sm">{detailLead.phone || "Not provided"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Company</p>
                      <p className="text-sm">{detailLead.company || "Not provided"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Source</p>
                      <p className="text-sm capitalize">{detailLead.source}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Status</p>
                      <Badge className={statusColors[detailLead.status]}>{detailLead.status}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Created</p>
                      <p className="text-sm">{new Date(detailLead.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {detailLead.aiScore !== null && (
                    <Card className="bg-gradient-to-br from-primary/5 to-secondary/5">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="font-medium">AI Score</span>
                          </div>
                          <Badge className={getScoreColor(detailLead.aiScore)}>{detailLead.aiScore}/100</Badge>
                        </div>
                        {detailLead.aiPrediction && (
                          <p className="text-sm text-muted-foreground mb-2">{detailLead.aiPrediction}</p>
                        )}
                        {detailLead.aiInsights && (
                          <p className="text-xs text-muted-foreground">{detailLead.aiInsights}</p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="activity" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    {mockActivities.map((activity) => {
                      const Icon = getActivityIcon(activity.type);
                      return (
                        <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                          <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{activity.description}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {activity.timestamp.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="space-y-4 mt-4">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Add a note about this lead..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      className="resize-none"
                      rows={3}
                      data-testid="textarea-new-note"
                    />
                    <Button
                      size="sm"
                      onClick={() => addNoteMutation.mutate({ id: detailLead.id, note: newNote })}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {addNoteMutation.isPending ? "Saving..." : "Add Note"}
                    </Button>
                  </div>

                  {detailLead.notes && (
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm font-medium mb-2">Notes History</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailLead.notes}</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedLead(detailLead);
                    setDetailLead(null);
                    setIsDialogOpen(true);
                  }}
                  data-testid="button-edit-lead"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Lead
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(detailLead.id)}
                  data-testid="button-delete-lead"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
