import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Sparkles,
  Mail,
  Phone,
  Building,
  Plus,
  Calendar,
  Send,
  PhoneCall,
  Video,
  FileText,
  Activity,
  User,
  CheckCircle,
  Star,
  Clock,
  StickyNote,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

const statusSteps = ["new", "contacted", "qualified", "proposal", "negotiation"];

interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  text: string;
  createdAt: string;
  authorName: string;
}

interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  description: string;
  createdAt: string;
}

const activityIcons: Record<string, LucideIcon> = {
  lead_created: User,
  status_changed: TrendingUp,
  note_added: StickyNote,
  scored: Star,
  call: PhoneCall,
  email: Mail,
  meeting: Video,
  task: CheckCircle,
};

const activityColors: Record<string, string> = {
  lead_created: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  status_changed: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  note_added: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  scored: "text-green-500 bg-green-50 dark:bg-green-900/20",
  call: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20",
  email: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
  meeting: "text-pink-500 bg-pink-50 dark:bg-pink-900/20",
  task: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
};

export default function LeadManagementPage() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Build query params for server-side filtering
  const buildLeadQueryParams = () => {
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set("search", searchQuery.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (scoreFilter === "hot") { params.set("minScore", "70"); }
    else if (scoreFilter === "warm") { params.set("minScore", "40"); params.set("maxScore", "69"); }
    else if (scoreFilter === "cold") { params.set("maxScore", "39"); }
    if (dateFilter === "7d") {
      const d = new Date(); d.setDate(d.getDate() - 7);
      params.set("dateFrom", d.toISOString().slice(0, 10));
    } else if (dateFilter === "30d") {
      const d = new Date(); d.setDate(d.getDate() - 30);
      params.set("dateFrom", d.toISOString().slice(0, 10));
    } else if (dateFilter === "90d") {
      const d = new Date(); d.setDate(d.getDate() - 90);
      params.set("dateFrom", d.toISOString().slice(0, 10));
    }
    return params.toString();
  };

  const queryParams = buildLeadQueryParams();

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads", queryParams],
    queryFn: async () => {
      const url = queryParams ? `/api/leads?${queryParams}` : "/api/leads";
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch leads");
      return response.json();
    },
  });

  // Notes for the selected lead
  const { data: notes = [], isLoading: notesLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/leads", detailLead?.id, "notes"],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${detailLead!.id}/notes`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
    enabled: !!detailLead && activeTab === "notes",
  });

  // Activity timeline for the selected lead
  const { data: activityItems = [], isLoading: activityLoading } = useQuery<LeadActivity[]>({
    queryKey: ["/api/leads", detailLead?.id, "activity"],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${detailLead!.id}/activity`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
    enabled: !!detailLead && activeTab === "activity",
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
      const res = await apiRequest("PATCH", `/api/leads/${id}`, { status }, getAuthHeaders());
      return res.json() as Promise<Lead>;
    },
    onSuccess: (data: Lead) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", detailLead?.id, "activity"] });
      if (detailLead) setDetailLead(data);
      toast({ title: "Status Updated", description: "Lead status has been changed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const response = await fetch(`/api/leads/${id}/notes`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Failed to add note");
      return response.json();
    },
    onSuccess: () => {
      if (detailLead) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", detailLead.id, "notes"] });
        queryClient.invalidateQueries({ queryKey: ["/api/leads", detailLead.id, "activity"] });
      }
      setNewNote("");
      toast({ title: "Note Added", description: "Note has been saved" });
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
      queryClient.invalidateQueries({ queryKey: ["/api/leads", detailLead?.id, "activity"] });
      if (detailLead) setDetailLead(data as Lead);
      toast({ title: "Lead Scored", description: "AI scoring complete" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to score lead", variant: "destructive" });
    },
  });

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score >= 70) return "bg-success text-success-foreground";
    if (score >= 40) return "bg-accent text-accent-foreground";
    return "bg-muted text-muted-foreground";
  };

  const handleQuickAction = (action: string, lead: Lead) => {
    switch (action) {
      case "call":
        if (lead.phone) {
          window.open(`tel:${lead.phone}`);
        } else {
          toast({ title: "No Phone", description: "This lead has no phone number", variant: "destructive" });
        }
        break;
      case "email":
        window.open(`mailto:${lead.email}`);
        break;
      case "meeting":
        toast({ title: "Schedule Meeting", description: "Meeting scheduler coming soon" });
        break;
    }
  };

  const openDetail = (lead: Lead) => {
    setDetailLead(lead);
    setActiveTab("overview");
    setNewNote("");
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || scoreFilter !== "all" || dateFilter !== "all";

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

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-leads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="won">Won</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scoreFilter} onValueChange={setScoreFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-score-filter">
            <Star className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Score" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any Score</SelectItem>
            <SelectItem value="hot">Hot (70+)</SelectItem>
            <SelectItem value="warm">Warm (40–69)</SelectItem>
            <SelectItem value="cold">Cold (&lt;40)</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[150px]" data-testid="select-date-filter">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Date" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); setScoreFilter("all"); setDateFilter("all"); }}
            data-testid="button-clear-filters"
          >
            Clear filters
          </Button>
        )}
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
      ) : leads && leads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <Card
              key={lead.id}
              className="hover-elevate cursor-pointer"
              onClick={() => openDetail(lead)}
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
                        <PhoneCall className="h-4 w-4 mr-2" /> Call
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("email", lead); }}>
                        <Mail className="h-4 w-4 mr-2" /> Send Email
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("meeting", lead); }}>
                        <Calendar className="h-4 w-4 mr-2" /> Schedule Meeting
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); setIsDialogOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); scoreMutation.mutate(lead.id); }}>
                        <Sparkles className="h-4 w-4 mr-2" /> AI Score
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lead.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-2 mb-3">
                  {lead.company && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building className="h-3 w-3" /> {lead.company}
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" /> {lead.phone}
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
                  <Button variant="ghost" size="sm" className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleQuickAction("call", lead); }}>
                    <PhoneCall className="h-3 w-3 mr-1" /> Call
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleQuickAction("email", lead); }}>
                    <Mail className="h-3 w-3 mr-1" /> Email
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1"
                    onClick={(e) => { e.stopPropagation(); handleQuickAction("meeting", lead); }}>
                    <Calendar className="h-3 w-3 mr-1" /> Meet
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
              {hasActiveFilters ? "Try adjusting your filters" : "Add your first lead to get started"}
            </p>
            {!hasActiveFilters && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Add Lead
              </Button>
            )}
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
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" onClick={() => handleQuickAction("call", detailLead)} data-testid="button-detail-call">
                  <PhoneCall className="h-4 w-4 mr-2" /> Call
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickAction("email", detailLead)} data-testid="button-detail-email">
                  <Mail className="h-4 w-4 mr-2" /> Email
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleQuickAction("meeting", detailLead)} data-testid="button-detail-meeting">
                  <Calendar className="h-4 w-4 mr-2" /> Meeting
                </Button>
                <Button size="sm" variant="outline" onClick={() => scoreMutation.mutate(detailLead.id)} disabled={scoreMutation.isPending} data-testid="button-ai-score">
                  <Sparkles className="h-4 w-4 mr-2" />
                  {scoreMutation.isPending ? "Scoring…" : "Score with AI"}
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
                        className={`flex-1 h-2 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-muted"} ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
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
                  <TabsTrigger value="notes" className="flex-1" data-testid="tab-notes">Notes</TabsTrigger>
                  <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">Activity</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
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
                          <div className="flex items-center gap-2">
                            {detailLead.aiCategory && (
                              <Badge
                                variant="outline"
                                className={
                                  detailLead.aiCategory === "Hot"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : detailLead.aiCategory === "Warm"
                                    ? "bg-amber-100 text-amber-700 border-amber-200"
                                    : "bg-sky-100 text-sky-700 border-sky-200"
                                }
                                data-testid="badge-ai-category"
                              >
                                {detailLead.aiCategory}
                              </Badge>
                            )}
                            <Badge className={getScoreColor(detailLead.aiScore)}>{detailLead.aiScore}/100</Badge>
                          </div>
                        </div>
                        {detailLead.aiPrediction && (
                          <p className="text-sm text-muted-foreground mb-2" data-testid="text-ai-prediction">{detailLead.aiPrediction}</p>
                        )}
                        {detailLead.aiInsights && (
                          <p className="text-xs text-muted-foreground mb-2" data-testid="text-ai-insights">{detailLead.aiInsights}</p>
                        )}
                        {detailLead.aiRecommendedAction && (
                          <div className="mt-2 p-2 rounded-md bg-primary/5 border border-primary/10">
                            <p className="text-xs font-medium text-primary mb-1">Recommended Action</p>
                            <p className="text-xs text-muted-foreground" data-testid="text-recommended-action">{detailLead.aiRecommendedAction}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Notes Tab */}
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
                      onClick={() => addNoteMutation.mutate({ id: detailLead.id, text: newNote })}
                      disabled={!newNote.trim() || addNoteMutation.isPending}
                      data-testid="button-add-note"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {addNoteMutation.isPending ? "Saving…" : "Add Note"}
                    </Button>
                  </div>

                  {notesLoading ? (
                    <div className="space-y-2">
                      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : notes.length > 0 ? (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div key={note.id} className="p-3 rounded-lg bg-muted/50" data-testid={`note-item-${note.id}`}>
                          <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{note.authorName}</span>
                            <span>·</span>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No notes yet. Add the first note above.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Activity Tab */}
                <TabsContent value="activity" className="space-y-4 mt-4">
                  {activityLoading ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
                    </div>
                  ) : activityItems.length > 0 ? (
                    <div className="space-y-3">
                      {activityItems.map((item) => {
                        const Icon = activityIcons[item.type] || Activity;
                        const colorClass = activityColors[item.type] || "text-muted-foreground bg-muted/50";
                        return (
                          <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-muted/30" data-testid={`activity-item-${item.id}`}>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium capitalize">{item.type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {new Date(item.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No activity recorded yet.</p>
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
                  <Edit className="h-4 w-4 mr-2" /> Edit Lead
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
