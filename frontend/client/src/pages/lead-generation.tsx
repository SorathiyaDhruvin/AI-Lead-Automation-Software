import { useState } from "react";
import { 
  Globe, 
  Mail, 
  Users, 
  FileSpreadsheet, 
  Smartphone, 
  MessageSquare,
  Plus,
  Code,
  Copy,
  Check,
  Send,
  Loader2,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LeadDialog } from "@/components/lead-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";

const generationSources = [
  {
    id: "website",
    title: "Website Forms",
    description: "Capture leads automatically from your landing pages using our embeddable web form",
    icon: Globe,
    color: "#0066FF",
    status: "active",
    action: "webform"
  },
  {
    id: "import",
    title: "CSV Import",
    description: "Bulk import leads safely from spreadsheets with duplicate email detection",
    icon: FileSpreadsheet,
    color: "#FF6B6B",
    status: "active",
    action: "import",
  },
  {
    id: "referral",
    title: "Referral Program",
    description: "Capture and attribute leads referred by existing clients or partner networks",
    icon: Users,
    color: "#FFB946",
    status: "active",
    action: "channel"
  },
  {
    id: "email",
    title: "Email Inbound",
    description: "Automatically convert incoming email inquiries into qualified system leads",
    icon: Mail,
    color: "#6C5CE7",
    status: "active",
    action: "channel"
  },
  {
    id: "sms",
    title: "SMS Campaigns",
    description: "Receive text-to-lead responses and SMS campaign signups automatically",
    icon: Smartphone,
    color: "#00D68F",
    status: "active",
    action: "channel"
  },
  {
    id: "whatsapp",
    title: "WhatsApp Inbound",
    description: "Capture leads directly from WhatsApp Business chat conversations",
    icon: MessageSquare,
    color: "#25D366",
    status: "active",
    action: "channel"
  },
];

export default function LeadGenerationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isWebFormOpen, setIsWebFormOpen] = useState(false);
  const [isChannelOpen, setIsChannelOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState<any>(null);

  const [copied, setCopied] = useState(false);
  const [testName, setTestName] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testCompany, setTestCompany] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userId = user?.id || "your-user-id";
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5000";

  const embedCode = `<!-- LeadFlow AI Embeddable Form -->
<form action="${origin}/api/public-leads/public-capture" method="POST" id="leadflow-form">
  <input type="hidden" name="userId" value="${userId}" />
  <div>
    <label>Full Name *</label>
    <input type="text" name="name" required />
  </div>
  <div>
    <label>Email Address *</label>
    <input type="email" name="email" required />
  </div>
  <div>
    <label>Company Name</label>
    <input type="text" name="company" />
  </div>
  <div>
    <label>Phone Number</label>
    <input type="tel" name="phone" />
  </div>
  <div>
    <label>Message</label>
    <textarea name="message"></textarea>
  </div>
  <button type="submit">Submit Request</button>
</form>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied HTML embed snippet!" });
  };

  const handleTestFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testName || !testEmail) {
      toast({ title: "Name and Email are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post("/public-leads/public-capture", {
        userId,
        name: testName,
        email: testEmail,
        company: testCompany,
        message: testMessage,
      });

      toast({
        title: "Test Submission Successful!",
        description: "The lead was created and autonomous workflows were triggered.",
      });
      setTestName("");
      setTestEmail("");
      setTestCompany("");
      setTestMessage("");
    } catch (err: any) {
      toast({
        title: "Form Submission Error",
        description: err.message || "Failed to submit lead",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Generation</h1>
          <p className="text-muted-foreground mt-1">Capture, create, and import leads from multiple integrated channels.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-lead">
          <Plus className="h-4 w-4 mr-2" />
          Create Lead
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {generationSources.map((source) => (
          <Card key={source.id} className="hover-elevate transition-all flex flex-col" data-testid={`card-source-${source.id}`}>
            <CardHeader className="flex flex-row items-start gap-4 pb-4">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${source.color}15` }}
              >
                <source.icon className="h-6 w-6" style={{ color: source.color }} />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg leading-tight">{source.title}</CardTitle>
                </div>
                <Badge
                  variant="default"
                  className="text-[10px] uppercase tracking-wider font-semibold bg-green-500/10 text-green-600 border-green-200 dark:border-green-800"
                >
                  Active Channel
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-6">
              <CardDescription className="text-sm">
                {source.description}
              </CardDescription>
              
              <Button 
                variant="secondary"
                className="w-full"
                onClick={() => {
                  if (source.action === "import") {
                    setIsImportOpen(true);
                  } else if (source.action === "webform") {
                    setIsWebFormOpen(true);
                  } else {
                    setSelectedChannel(source);
                    setIsChannelOpen(true);
                  }
                }}
                data-testid={`button-configure-${source.id}`}
              >
                {source.action === "import" ? "Import CSV" : source.action === "webform" ? "Form Builder & Embed" : "Configure Channel"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Website Lead Form Builder & Tester Modal */}
      <Dialog open={isWebFormOpen} onOpenChange={setIsWebFormOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Code className="h-5 w-5 text-blue-600" />
              Website Lead Form Builder & Embed Snippet
            </DialogTitle>
            <DialogDescription>
              Copy this HTML snippet onto your website landing page to automatically capture inquiries into LeadFlow AI.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">HTML Embed Snippet</Label>
                <Button variant="outline" size="sm" onClick={handleCopyCode} className="gap-1.5 h-8">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy Code"}
                </Button>
              </div>
              <Textarea
                value={embedCode}
                readOnly
                rows={9}
                className="font-mono text-xs bg-slate-900 text-slate-100 dark:bg-slate-950 p-3 rounded-lg border-slate-800"
              />
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-semibold text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                Live Form Tester
              </h4>
              <p className="text-xs text-muted-foreground">Test form submission directly to verify real lead creation & automation execution.</p>

              <form onSubmit={handleTestFormSubmit} className="space-y-3 bg-slate-50 dark:bg-neutral-900 p-4 rounded-xl border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Name *</Label>
                    <Input placeholder="John Doe" value={testName} onChange={(e) => setTestName(e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email Address *</Label>
                    <Input type="email" placeholder="john@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} required />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Company</Label>
                  <Input placeholder="Acme Corp" value={testCompany} onChange={(e) => setTestCompany(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Message</Label>
                  <Textarea placeholder="Interested in a demo of your software..." value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={2} />
                </div>

                <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSubmitting ? "Submitting Lead..." : "Test Form Submission"}
                </Button>
              </form>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsWebFormOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Channel Configuration Modal */}
      <Dialog open={isChannelOpen} onOpenChange={setIsChannelOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedChannel?.title || "Channel Setup"}
            </DialogTitle>
            <DialogDescription>
              Integration instructions and Webhook API key for {selectedChannel?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase">Channel Status</Label>
              <div className="p-3 bg-green-50 text-green-900 border border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-900 rounded-lg text-sm">
                ✅ Active — Configured to parse inbound inquiries to <strong>{user?.email}</strong>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase">Webhook Ingest Endpoint</Label>
              <Input readOnly value={`${origin}/api/public-leads/public-capture`} className="font-mono text-xs" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase">Account User ID Token</Label>
              <Input readOnly value={userId} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Pass `userId: "${userId}"` in the POST payload when sending webhook payloads from external services.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsChannelOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CsvImportDialog 
        open={isImportOpen} 
        onOpenChange={setIsImportOpen} 
      />
      
      <LeadDialog 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen} 
      />
    </div>
  );
}
