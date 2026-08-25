import { useState, useEffect } from "react";
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
  Calendar,
  Send,
  PhoneCall,
  User,
  Star,
  Download,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Lead } from "@/types";
import { leadsService } from "@/services/leads";
import { LeadDialog } from "@/components/lead-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { LeadDetailsSheet } from "@/components/lead-details-sheet";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  proposal: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  won: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

export default function LeadManagementPage() {
  const { toast } = useToast();
  const [locationPath, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedLeadForEdit, setSelectedLeadForEdit] = useState<Lead | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailTargetLead, setEmailTargetLead] = useState<Lead | null>(null);
  const [emailSubject, setEmailSubject] = useState("Following up — LeadFlow");
  const [emailMessage, setEmailMessage] = useState("");
  
  const [urlLeadId, setUrlLeadId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead");
    setUrlLeadId(leadId);
  }, [locationPath, window.location.search]);

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

  const { data: fetchedLead } = useQuery<Lead>({
    queryKey: ["/api/leads", urlLeadId],
    queryFn: () => leadsService.getById(urlLeadId!),
    enabled: !!urlLeadId,
  });

  const activeDetailLead = fetchedLead || (urlLeadId && leads ? leads.find(l => l.id === urlLeadId) : null) || null;

  const closeDetail = () => {
    setUrlLeadId(null);
    window.history.pushState({}, "", "/lead-management");
    setLocation("/lead-management");
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => leadsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Lead deleted", description: "The lead has been removed" });
      if (urlLeadId) closeDetail();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ id, subject, message }: { id: string; subject: string; message: string }) => {
      return leadsService.sendEmail(id, { subject, message });
    },
    onSuccess: () => {
      setIsEmailDialogOpen(false);
      setEmailMessage("");
      toast({ title: "Email Sent", description: `Follow-up sent to ${emailTargetLead?.email}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: async (id: string) => leadsService.score(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
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
    setUrlLeadId(lead.id);
    setLocation(`/lead-management?lead=${lead.id}`);
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all" || scoreFilter !== "all" || dateFilter !== "all";

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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground mt-1">Manage, qualify, and track your leads.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} data-testid="button-import-csv">
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap bg-card border rounded-lg p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            className="pl-9 h-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-leads"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9" data-testid="select-status-filter">
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
          <SelectTrigger className="w-[130px] h-9" data-testid="select-score-filter">
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
          <SelectTrigger className="w-[140px] h-9" data-testid="select-date-filter">
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
            className="h-9"
            onClick={() => { setSearchQuery(""); setStatusFilter("all"); setScoreFilter("all"); setDateFilter("all"); }}
            data-testid="button-clear-filters"
          >
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : leads && leads.length > 0 ? (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>AI Score</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer"
                    onClick={() => openDetail(lead)}
                  >
                    <TableCell>
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.email}</div>
                    </TableCell>
                    <TableCell>
                      {lead.company ? (
                        <div className="flex items-center text-sm">
                          <Building className="h-3 w-3 mr-1 text-muted-foreground" />
                          {lead.company}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[lead.status] || "bg-muted"}>{lead.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.aiScore !== null ? (
                        <Badge className={getScoreColor(lead.aiScore)}>Score: {lead.aiScore}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not scored</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm capitalize">{lead.source.replace('_', ' ')}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground" title={new Date(lead.createdAt).toLocaleString()}>
                        {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("call", lead); }}>
                            <PhoneCall className="h-4 w-4 mr-2" /> Call
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickAction("email", lead); }}>
                            <Mail className="h-4 w-4 mr-2" /> Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLeadForEdit(lead); setIsDialogOpen(true); }}>
                            <Edit className="h-4 w-4 mr-2" /> Edit Lead
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); scoreMutation.mutate(lead.id); }}>
                            <Sparkles className="h-4 w-4 mr-2" /> Score AI
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* MOBILE CARDS VIEW */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {leads.map((lead) => (
              <Card
                key={lead.id}
                className="hover-elevate cursor-pointer overflow-hidden"
                onClick={() => openDetail(lead)}
              >
                <CardContent className="p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground leading-tight">{lead.name}</h3>
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
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
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedLeadForEdit(lead); setIsDialogOpen(true); }}>
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

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {lead.company && (
                      <div className="flex items-center text-muted-foreground truncate">
                        <Building className="h-3 w-3 mr-1 flex-shrink-0" /> {lead.company}
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center text-muted-foreground truncate">
                        <Phone className="h-3 w-3 mr-1 flex-shrink-0" /> {lead.phone}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2 pt-2 border-t">
                    <Badge className={statusColors[lead.status]}>{lead.status}</Badge>
                    {lead.aiScore !== null ? (
                      <Badge className={getScoreColor(lead.aiScore)}>Score: {lead.aiScore}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Not scored</Badge>
                    )}
                    <Badge variant="secondary" className="capitalize text-[10px]">{lead.source}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-30" />
            <h3 className="text-lg font-medium mb-1">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters ? "Try adjusting your filters" : "Go to Lead Generation to add your first lead"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Lead Details Sheet */}
      <LeadDetailsSheet
        isOpen={!!urlLeadId}
        onClose={closeDetail}
        lead={activeDetailLead as Lead}
        isLoading={!!urlLeadId && !activeDetailLead}
      />

      {/* Reusable Lead Dialog (Edit) */}
      <LeadDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedLeadForEdit(null);
        }}
        lead={selectedLeadForEdit}
      />

      {/* Shared CSV Import Dialog */}
      <CsvImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
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
