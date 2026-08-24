import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Search, Filter, Sparkles, MoreHorizontal, Trash2, Eye, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { queryClient } from "@/lib/queryClient";
import { ScoreBadge } from "@/components/score-badge";
import { LeadDialog } from "@/components/lead-dialog";
import { LeadDetailsSheet } from "@/components/lead-details-sheet";
import { BulkEmailDialog } from "@/components/bulk-email-dialog";
import { leadsService } from "@/services/leads";
import type { Lead } from "@/types";
import { useRoute, useLocation } from "wouter";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function LeadsPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/leads/:id");
  const routeLeadId = match ? params.id : null;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkEmailOpen, setIsBulkEmailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
    queryFn: () => leadsService.getAll(),
  });

  const leadFromList = leads?.find((l) => l.id === routeLeadId);

  const { data: fetchedLead, isLoading: isFetchingLead, error: leadError } = useQuery<Lead>({
    queryKey: ["/api/leads", routeLeadId],
    queryFn: () => leadsService.getById(routeLeadId!),
    enabled: !!routeLeadId && !leadFromList,
    retry: false,
  });

  const detailsLead = leadFromList || fetchedLead || null;
  const isDetailsLoading = !!routeLeadId && !leadFromList && isFetchingLead;
  const isLeadNotFound = !!routeLeadId && !leadFromList && !isFetchingLead && (!fetchedLead || leadError);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => leadsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "Lead deleted", description: "The lead has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete lead", variant: "destructive" });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: async (id: string) => leadsService.score(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "AI Scoring Complete", description: "Lead has been analyzed and scored" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to score lead", variant: "destructive" });
    },
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      (lead.company?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filteredLeads?.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filteredLeads?.map(l => l.id)));
    }
  };

  const toggleSelectLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedLeadIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedLeadIds(newSet);
  };

  const selectedLeadsObjects = filteredLeads?.filter(l => selectedLeadIds.has(l.id)) || [];

  if (isLeadNotFound) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center">
          <Eye className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-semibold">Lead Not Found</h2>
        <p className="text-muted-foreground text-center max-w-md">
          The lead you are looking for may have been deleted, or you may not have permission to access it.
        </p>
        <Button onClick={() => setLocation("/leads")}>
          Back to Lead Management
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">Manage and track your leads</p>
        </div>
        <div className="flex gap-2">
          {selectedLeadIds.size > 0 && (
            <Button variant="secondary" onClick={() => setIsBulkEmailOpen(true)}>
              <Mail className="h-4 w-4 mr-2" />
              Bulk Email ({selectedLeadIds.size})
            </Button>
          )}
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-lead">
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-leads"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={filteredLeads.length > 0 && selectedLeadIds.size === filteredLeads.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>AI Score</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover-elevate"
                      onClick={() => setLocation(`/leads/${lead.id}`)}
                      data-testid={`row-lead-${lead.id}`}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox 
                          checked={selectedLeadIds.has(lead.id)}
                          onCheckedChange={() => {
                            const newSet = new Set(selectedLeadIds);
                            if (newSet.has(lead.id)) newSet.delete(lead.id);
                            else newSet.add(lead.id);
                            setSelectedLeadIds(newSet);
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs">
                              {getInitials(lead.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{lead.name}</p>
                            <p className="text-sm text-muted-foreground">{lead.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{lead.company || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[lead.status] || statusColors.new}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ScoreBadge score={lead.aiScore} size="sm" />
                      </TableCell>
                      <TableCell className="capitalize">{lead.source}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${lead.id}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setLocation(`/leads/${lead.id}`);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                scoreMutation.mutate(lead.id);
                              }}
                              disabled={scoreMutation.isPending}
                            >
                              <Sparkles className="h-4 w-4 mr-2" />
                              AI Score
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                                setIsDialogOpen(true);
                              }}
                            >
                              Edit Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMutation.mutate(lead.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No leads found</h3>
              <p className="text-muted-foreground mb-4">
                {search || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by adding your first lead"}
              </p>
              {!search && statusFilter === "all" && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Lead
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <LeadDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedLead(null);
        }}
        lead={selectedLead}
      />

      <LeadDetailsSheet
        lead={detailsLead}
        isOpen={!!routeLeadId}
        isLoading={isDetailsLoading}
        onClose={() => setLocation("/leads")}
      />

      <BulkEmailDialog 
        open={isBulkEmailOpen}
        onOpenChange={setIsBulkEmailOpen}
        selectedLeads={selectedLeadsObjects}
      />
    </div>
  );
}
