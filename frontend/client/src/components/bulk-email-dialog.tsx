import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function BulkEmailDialog({
  open,
  onOpenChange,
  selectedLeads = []
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLeads?: any[];
}) {
  const { toast } = useToast();
  const [customEmails, setCustomEmails] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: templates } = useQuery<any[]>({
    queryKey: ["/api/email/templates"],
  });

  const parsedCustomEmails = customEmails
    .split(/[\n,]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

  const leadRecipients = selectedLeads
    .map(l => ({ email: l.email, leadId: l.id }))
    .filter(l => l.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email));

  const totalValidRecipients = new Set([...parsedCustomEmails, ...leadRecipients.map(r => r.email)]).size;

  const startJobMutation = useMutation({
    mutationFn: async () => {
      const allRecipients = [
        ...leadRecipients,
        ...parsedCustomEmails.map(e => ({ email: e }))
      ];
      const res = await fetch("/api/email/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: allRecipients,
          templateId,
          name: "Manual Bulk Send",
        }),
      });
      if (!res.ok) throw new Error("Failed to start bulk job");
      return res.json();
    },
    onSuccess: (data) => {
      setActiveJobId(data.job.id);
      toast({ title: "Bulk email job started!" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const { data: jobProgress } = useQuery({
    queryKey: ["/api/email/bulk", activeJobId, "progress"],
    queryFn: async () => {
      const res = await fetch(`/api/email/bulk/${activeJobId}/progress`);
      if (!res.ok) throw new Error("Failed to fetch progress");
      const data = await res.json();
      return data.job;
    },
    enabled: !!activeJobId,
    refetchInterval: (data: any) => (data?.status === "processing" || data?.status === "pending") ? 1000 : false,
  });

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/email/bulk/${activeJobId}/retry`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to retry");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/email/bulk", activeJobId, "progress"] });
      toast({ title: "Retrying failed emails..." });
    }
  });

  const handleClose = () => {
    if (jobProgress?.status === "processing") {
      toast({ title: "Job is running in background" });
    }
    setActiveJobId(null);
    setCustomEmails("");
    setTemplateId("");
    onOpenChange(false);
  };

  const isSending = startJobMutation.isPending || jobProgress?.status === "processing" || jobProgress?.status === "pending";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Email Send</DialogTitle>
          <DialogDescription>
            Send personalized emails to multiple recipients.
          </DialogDescription>
        </DialogHeader>

        {!activeJobId ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Template</label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an email template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLeads.length > 0 && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <strong>{selectedLeads.length} leads selected</strong> (Found {leadRecipients.length} valid emails)
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Additional Emails (comma separated)</label>
              <Textarea 
                placeholder="customer1@gmail.com, customer2@company.com" 
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
              />
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 p-3 rounded-md text-sm">
              <p>Total Unique Valid Recipients: <strong>{totalValidRecipients}</strong></p>
              {customEmails.length > 0 && parsedCustomEmails.length === 0 && (
                <p className="text-red-500 mt-1">Warning: No valid emails parsed from custom input.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-6 text-center">
            <h3 className="text-lg font-medium mb-2">
              {jobProgress?.status === "completed" ? "Sending Complete" : "Sending Emails..."}
            </h3>
            
            {jobProgress && (
              <>
                <Progress value={((jobProgress.sent_count + jobProgress.failed_count) / jobProgress.total_recipients) * 100} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                  <div><span className="block text-2xl font-bold">{jobProgress.total_recipients}</span> Total</div>
                  <div className="text-green-600"><span className="block text-2xl font-bold">{jobProgress.sent_count}</span> Sent</div>
                  <div className="text-red-500"><span className="block text-2xl font-bold">{jobProgress.failed_count}</span> Failed</div>
                </div>
              </>
            )}

            {jobProgress?.status === "completed" && jobProgress?.failed_count > 0 && (
              <Button 
                variant="outline" 
                onClick={() => retryMutation.mutate()}
                disabled={retryMutation.isPending}
                className="mt-4"
              >
                Retry {jobProgress.failed_count} Failed
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          {!activeJobId ? (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button 
                onClick={() => startJobMutation.mutate()} 
                disabled={totalValidRecipients === 0 || !templateId || isSending}
              >
                {isSending ? "Starting..." : `Send to ${totalValidRecipients}`}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} disabled={isSending}>
              {isSending ? "Close & Run in Background" : "Close"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
