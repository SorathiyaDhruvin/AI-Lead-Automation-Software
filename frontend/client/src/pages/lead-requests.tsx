import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Building2,
  User,
  Users,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { leadRequestsService } from "@/services/leadRequests";
import type { LeadRequest } from "@/types";

const leadRequestSchema = z.object({
  requestType: z.string().min(1, "Request type is required"),
  companyName: z.string().min(2, "Company name is required"),
  contactName: z.string().min(2, "Contact name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  numberOfLeads: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  additionalNotes: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]),
});

type LeadRequestFormData = z.infer<typeof leadRequestSchema>;

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  in_review: { label: "In Review", icon: AlertCircle, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

const priorityConfig = {
  low: { label: "Low", color: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400" },
  medium: { label: "Medium", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
  high: { label: "High", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

export default function LeadRequestsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<LeadRequestFormData>({
    resolver: zodResolver(leadRequestSchema),
    defaultValues: {
      requestType: "",
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      numberOfLeads: "",
      description: "",
      additionalNotes: "",
      priority: "medium",
    },
  });

  const { data: requests, isLoading, error: requestsError } = useQuery<LeadRequest[]>({
    queryKey: ["/api/lead-requests"],
    queryFn: () => leadRequestsService.getAll(),
  });

  if (requestsError) {
    console.error("[LeadRequestsPage] Error loading requests:", requestsError);
  }

  const createMutation = useMutation({
    mutationFn: async (data: Omit<LeadRequestFormData, "numberOfLeads"> & { numberOfLeads?: number }) => leadRequestsService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-requests"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Request Submitted",
        description: "Your lead request has been submitted for review.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit lead request. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LeadRequestFormData) => {
    createMutation.mutate({
      ...data,
      numberOfLeads: data.numberOfLeads ? Number(data.numberOfLeads) : undefined,
    });
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto pb-24">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Lead Request</h1>
        <p className="text-muted-foreground mt-1">
          Request lead-related services or assistance from LeadFlow AI.
        </p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="bg-muted/10 border-b pb-4">
          <CardTitle className="text-lg">New Request</CardTitle>
          <CardDescription>Fill out the form below to submit your request.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Acme Corp" className="pl-9" {...field} data-testid="input-company-name" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="John Smith" className="pl-9" {...field} data-testid="input-contact-name" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input type="email" placeholder="john@acme.com" className="pl-9" {...field} data-testid="input-email" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="+1 555-0123" className="pl-9" {...field} data-testid="input-phone" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="requestType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Request Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-request-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Lead Generation Request">Lead Generation Request</SelectItem>
                            <SelectItem value="Lead Research Request">Lead Research Request</SelectItem>
                            <SelectItem value="Lead Automation Help">Lead Automation Help</SelectItem>
                            <SelectItem value="CRM/Integration Request">CRM/Integration Request</SelectItem>
                            <SelectItem value="Custom Request">Custom Request</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numberOfLeads"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Leads (optional)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="e.g. 50" className="pl-9" {...field} data-testid="input-number-of-leads" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the lead opportunity, potential value, and any relevant details..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="additionalNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any other requirements or details..."
                          className="min-h-[60px]"
                          {...field}
                          data-testid="input-additional-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => form.reset()}>
                    Clear Form
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-request">
                    {createMutation.isPending ? "Submitting..." : "Submit Request"}
                  </Button>
                </div>
              </form>
            </Form>
        </CardContent>
      </Card>

      <div className="pt-4">
        <h2 className="text-2xl font-bold text-foreground mb-6">My Requests</h2>
        {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : requestsError ? (
        <Card className="p-12 border-dashed border-2 bg-destructive/5 border-destructive/20">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h3 className="text-lg font-medium mb-2 text-destructive">Unable to load lead requests</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Please try again or contact support if the problem persists.
            </p>
          </div>
        </Card>
      ) : requests && requests.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => {
            const statusInfo = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.pending;
            const priorityInfo = priorityConfig[request.priority as keyof typeof priorityConfig] || priorityConfig.medium;
            const StatusIcon = statusInfo.icon;

            return (
              <Dialog key={request.id}>
                <DialogTrigger asChild>
                  <Card className="hover-elevate cursor-pointer hover:border-primary/50 transition-colors" data-testid={`card-request-${request.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-lg">{request.companyName}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">ID: #{request.id.slice(0, 8)}</p>
                        </div>
                        <Badge className={statusInfo.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <User className="h-3 w-3" />
                        {request.contactName}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <Badge variant="outline" className={priorityInfo.color}>
                          {priorityInfo.label}
                        </Badge>
                        <span>{formatDate(request.createdAt)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                      Request Details
                      <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                    </DialogTitle>
                    <DialogDescription>ID: {request.id}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Type</p>
                        <p>{request.requestType}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Priority</p>
                        <Badge variant="outline" className={priorityInfo.color}>{priorityInfo.label}</Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Submitted</p>
                        <p>{new Date(request.createdAt).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Last Updated</p>
                        <p>{new Date(request.updatedAt || request.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-sm whitespace-pre-wrap">{request.description}</p>
                    </div>

                    {request.additionalNotes && (
                      <div className="pt-2">
                        <p className="text-sm font-medium text-muted-foreground mb-1">Additional Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{request.additionalNotes}</p>
                      </div>
                    )}

                    {request.adminNotes && (
                      <div className="pt-4 border-t mt-4 bg-muted/20 p-4 rounded-md border border-primary/20">
                        <p className="text-sm font-semibold text-primary mb-1">Admin Response / Notes</p>
                        <p className="text-sm text-foreground">{request.adminNotes}</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 border-dashed border-2 bg-muted/10">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No Requests History</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              You haven't submitted any lead requests yet. Use the form above to submit your first request.
            </p>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}
