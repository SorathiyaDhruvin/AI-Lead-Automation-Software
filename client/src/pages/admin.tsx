import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Users,
  TrendingUp,
  Building2,
  User,
  Mail,
  Phone,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LeadRequest } from "@shared/schema";

interface AdminStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  inReview: number;
}

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  in_review: { label: "In Review", icon: AlertCircle, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const priorityConfig = {
  low: { label: "Low", color: "text-slate-600 dark:text-slate-400" },
  medium: { label: "Medium", color: "text-amber-600 dark:text-amber-400" },
  high: { label: "High", color: "text-red-600 dark:text-red-400" },
};

export default function AdminPage() {
  const [selectedRequest, setSelectedRequest] = useState<LeadRequest | null>(null);
  const [newStatus, setNewStatus] = useState<string>("");
  const [adminNotes, setAdminNotes] = useState<string>("");
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const { data: requests, isLoading: requestsLoading } = useQuery<LeadRequest[]>({
    queryKey: ["/api/admin/lead-requests"],
    queryFn: async () => {
      const response = await fetch("/api/admin/lead-requests", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch lead requests");
      return response.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      return apiRequest("PATCH", `/api/admin/lead-requests/${id}`, { status, adminNotes }, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/lead-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setSelectedRequest(null);
      setNewStatus("");
      setAdminNotes("");
      toast({
        title: "Request Updated",
        description: "The lead request status has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update lead request.",
        variant: "destructive",
      });
    },
  });

  const handleUpdateRequest = () => {
    if (!selectedRequest || !newStatus) return;
    updateMutation.mutate({
      id: selectedRequest.id,
      status: newStatus,
      adminNotes: adminNotes || undefined,
    });
  };

  const openRequestDialog = (request: LeadRequest) => {
    setSelectedRequest(request);
    setNewStatus(request.status);
    setAdminNotes(request.adminNotes || "");
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statCards = [
    { title: "Total Requests", value: stats?.total ?? 0, icon: FileText, color: "bg-primary/10 text-primary" },
    { title: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
    { title: "Approved", value: stats?.approved ?? 0, icon: CheckCircle, color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" },
    { title: "Rejected", value: stats?.rejected ?? 0, icon: XCircle, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Shield className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-muted-foreground">
            Manage and review lead requests
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsLoading
          ? [1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          : statCards.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <div className={`h-8 w-8 rounded-md ${stat.color} flex items-center justify-center`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Requests</CardTitle>
          <CardDescription>
            Review and manage all submitted lead requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests && requests.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => {
                    const statusInfo = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
                    const priorityInfo = priorityConfig[request.priority as keyof typeof priorityConfig] || priorityConfig.medium;
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{request.companyName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{request.contactName}</div>
                            <div className="text-muted-foreground">{request.email}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(request.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openRequestDialog(request)}
                            data-testid={`button-review-${request.id}`}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">No Lead Requests</h3>
              <p className="text-muted-foreground max-w-sm">
                There are no lead requests to review at this time.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Review Lead Request</DialogTitle>
            <DialogDescription>
              Review the details and update the status of this request.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    Company
                  </div>
                  <p className="font-medium">{selectedRequest.companyName}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    Contact
                  </div>
                  <p className="font-medium">{selectedRequest.contactName}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="font-medium">{selectedRequest.email}</p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Phone
                  </div>
                  <p className="font-medium">{selectedRequest.phone || "N/A"}</p>
                </div>
                {selectedRequest.industry && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Industry</div>
                    <p className="font-medium">{selectedRequest.industry}</p>
                  </div>
                )}
                {selectedRequest.budget && (
                  <div className="space-y-1">
                    <div className="text-sm text-muted-foreground">Budget</div>
                    <p className="font-medium">{selectedRequest.budget}</p>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  Description
                </div>
                <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedRequest.description}</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes (optional)</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this request..."
                  className="min-h-[80px]"
                  data-testid="input-admin-notes"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateRequest}
                  disabled={updateMutation.isPending || !newStatus}
                  data-testid="button-update-status"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
