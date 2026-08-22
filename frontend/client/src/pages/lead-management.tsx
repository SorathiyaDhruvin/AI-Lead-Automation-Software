import { useState, useRef } from "react";
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
  Upload,
  Download,
  Zap,
  Target,
  Brain,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Lead, Activity as LeadActivity, LeadNote } from "@/types";
import { leadsService } from "@/services/leads";
import { LeadDetailsSheet } from "@/components/lead-details-sheet";
import { LeadDialog } from "@/components/lead-dialog";

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

const activityIcons: Record<string, LucideIcon> = {
  lead_created: User,
  status_changed: TrendingUp,
  automation_triggered: Zap,
  scored: Target,
  email_sent: Mail,
  note_added: FileText,
  call: PhoneCall,
  meeting: Video,
  task: CheckCircle,
};

const activityColors: Record<string, string> = {
  lead_created: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  status_changed: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  automation_triggered: "text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20",
  scored: "text-green-500 bg-green-50 dark:bg-green-900/20",
  email_sent: "text-sky-500 bg-sky-50 dark:bg-sky-900/20",
  note_added: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  call: "text-cyan-500 bg-cyan-50 dark:bg-cyan-900/20",
  meeting: "text-pink-500 bg-pink-50 dark:bg-pink-900/20",
  task: "text-orange-500 bg-orange-50 dark:bg-orange-900/20",
};

export default function LeadManagementPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const [newNote, setNewNote] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailTargetLead, setEmailTargetLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState("Following up — LeadFlow");
  const [emailMessage, setEmailMessage] = useState("");
  const importFileRef = useRef<HTMLInputElement>(null);

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads", searchQuery, statusFilter, scoreFilter, dateFilter],
    queryFn: () => leadsService.getAll({ 
      search: searchQuery || undefined, 
      status: statusFilter === "all" ? undefined : statusFilter,
      minScore: scoreFilter === "hot" ? 70 : scoreFilter === "warm" ? 40 : undefined,
      maxScore: scoreFilter === "cold" ? 39 : scoreFilter === "warm" ? 69 : undefined,
      dateFrom: dateFilter !== "all" ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - parseInt(dateFilter));
        return d.toISOString().slice(0, 10);
      })() : undefined
    }),
  });

  // Notes for the selected lead
  const { data: notes = [], isLoading: notesLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/leads", detailLead?.id, "notes"],
    queryFn: () => leadsService.getNotes(detailLead!.id),
    enabled: !!detailLead && activeTab === "notes",
  });

  // Activity timeline for the selected lead
  const { data: activityItems = [], isLoading: activityLoading } = useQuery<LeadActivity[]>({
    queryKey: ["/api/leads", detailLead?.id, "activity"],
    queryFn: () => leadsService.getActivity(detailLead!.id),
    enabled: !!detailLead && activeTab === "activity",
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => leadsService.remove(id),
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
      return leadsService.update(id, { status });
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

  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, subject, message }: { id: string; subject: string; message: string }) => {
      return leadsService.sendEmail(id, { subject, message });
    },
    onSuccess: () => {
      if (emailTargetLead) {
        queryClient.invalidateQueries({ queryKey: ["/api/leads", emailTargetLead.id, "activity"] });
      }
      setIsEmailDialogOpen(false);
      setEmailMessage("");
      toast({ title: "Email Sent", description: `Follow-up sent to ${emailTargetLead?.email}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      return leadsService.addNote(id, text);
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
    mutationFn: async (id: string) => leadsService.score(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", detailLead?.id, "activity"] });
      if (detailLead) setDetailLead(data as Lead);
      toast({ title: "Lead Scored", description: "AI scoring complete" });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to score lead";
      toast({ title: "Error", description: message, variant: "destructive" });
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
        setEmailTargetLead(lead);
        setEmailSubject("Following up — LeadFlow");
        setEmailMessage("");
        setIsEmailDialogOpen(true);
        break;
      case "meeting":
        toast({ title: "Schedule Meeting", description: "Meeting scheduler coming soon" });
        break;
    }
  };

  const openDetail = (lead: Lead) => {
    setLocation(`/leads/${lead.id}`);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || scoreFilter !== "all" || dateFilter !== "all";

  const importMutation = useMutation({
    mutationFn: async (file: File) => leadsService.importCsv(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: `Import complete`,
        description: `${result.created} lead${result.created !== 1 ? "s" : ""} imported${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
        variant: result.failed > 0 ? "destructive" : "default",
      });
    },
    onError: (err: Error) => {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    },
  });

  const handleExport = async () => {
    try {
      const blob = await leadsService.exportCsv({
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "Success", description: "Leads exported successfully" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to export leads", variant: "destructive" });
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      e.target.value = "";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Management</h1>
          <p className="text-muted-foreground">Manage leads, track activities, and close deals</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={importFileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportFile}
            data-testid="input-import-file"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => importFileRef.current?.click()}
            disabled={importMutation.isPending}
            data-testid="button-import-csv"
          >
            <Upload className="h-4 w-4 mr-2" />
            {importMutation.isPending ? "Importing…" : "Import CSV"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            data-testid="button-export-csv"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
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



      {/* Send Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Follow-up Email</DialogTitle>
            <DialogDescription>
              Send a follow-up email to {emailTargetLead?.name} ({emailTargetLead?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject"
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Enter your message..."
                rows={4}
                className="resize-none"
                data-testid="textarea-email-message"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => emailTargetLead && sendEmailMutation.mutate({
                  id: emailTargetLead.id,
                  subject: emailSubject,
                  message: emailMessage,
                })}
                disabled={!emailSubject.trim() || !emailMessage.trim() || sendEmailMutation.isPending}
                data-testid="button-send-email-submit"
              >
                <Send className="h-4 w-4 mr-2" />
                {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
