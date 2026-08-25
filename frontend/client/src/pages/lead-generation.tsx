import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Magnet, Globe, Mail, Users, FileSpreadsheet, Plus, Upload, Link2, MessageSquare, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { leadsService } from "@/services/leads";

const generationSources = [
  {
    id: "website",
    title: "Website Forms",
    description: "Capture leads from your website contact forms and landing pages",
    icon: Globe,
    color: "#0066FF",
    status: "active",
  },
  {
    id: "email",
    title: "Email Campaigns",
    description: "Import leads from email marketing campaigns and newsletters",
    icon: Mail,
    color: "#6C5CE7",
    status: "coming_soon",
  },
  {
    id: "sms",
    title: "SMS Campaign",
    description: "Generate leads through SMS marketing campaigns and text responses",
    icon: Smartphone,
    color: "#00D68F",
    status: "coming_soon",
  },
  {
    id: "whatsapp",
    title: "WhatsApp Campaign",
    description: "Capture leads from WhatsApp Business conversations and broadcasts",
    icon: MessageSquare,
    color: "#25D366",
    status: "coming_soon",
  },
  {
    id: "referral",
    title: "Referral Program",
    description: "Track leads from customer referrals and partner networks",
    icon: Users,
    color: "#FFB946",
    status: "active",
  },
  {
    id: "import",
    title: "CSV Import",
    description: "Bulk import leads from spreadsheets and external sources",
    icon: FileSpreadsheet,
    color: "#FF6B6B",
    status: "active",
  },
];

export default function LeadGenerationPage() {
  const { toast } = useToast();
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importData, setImportData] = useState("");

  const importMutation = useMutation({
    mutationFn: async (leads: Array<{ name: string; email: string; company?: string; source: string }>) => {
      const results = [];
      for (const lead of leads) {
        results.push(await leadsService.create(lead));
      }
      return results;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Import Complete", description: `${data.length} leads imported successfully` });
      setIsImportOpen(false);
      setImportData("");
    },
    onError: () => {
      toast({ title: "Import Failed", description: "Failed to import leads", variant: "destructive" });
    },
  });

  const handleImport = () => {
    try {
      const lines = importData.trim().split("\n").filter(Boolean);
      const leads = lines.map((line) => {
        const [name, email, company] = line.split(",").map((s) => s.trim());
        return { name, email, company: company || undefined, source: "import" as const };
      });
      
      if (leads.length === 0 || !leads[0].name || !leads[0].email) {
        toast({ title: "Invalid Format", description: "Please use format: name, email, company (one per line)", variant: "destructive" });
        return;
      }
      
      importMutation.mutate(leads);
    } catch {
      toast({ title: "Parse Error", description: "Could not parse the import data", variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Generation</h1>
          <p className="text-muted-foreground">Capture and import leads from multiple sources</p>
        </div>
        <Button onClick={() => setIsImportOpen(true)} data-testid="button-import-leads">
          <Upload className="h-4 w-4 mr-2" />
          Import Leads
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {generationSources.map((source) => (
          <Card key={source.id} className="hover-elevate" data-testid={`card-source-${source.id}`}>
            <CardHeader className="flex flex-row items-start gap-4">
              <div
                className="h-12 w-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${source.color}20` }}
              >
                <source.icon className="h-6 w-6" style={{ color: source.color }} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">{source.title}</CardTitle>
                  <Badge
                    variant={source.status === "active" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {source.status === "active" ? "Active" : source.status === "coming_soon" ? "Coming Soon" : "Ready"}
                  </Badge>
                </div>
                <CardDescription className="mt-1">{source.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {source.status === "active" ? "Generating leads" : source.status === "coming_soon" ? "Not available yet" : "Click to configure"}
                </div>
                <Button variant="outline" size="sm" disabled={source.status === "coming_soon"} data-testid={`button-configure-${source.id}`}>
                  {source.status === "active" ? "Configure" : source.status === "coming_soon" ? "Coming Soon" : "Set Up"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>



      <Dialog open={isImportOpen} onOpenChange={setIsImportOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Leads from CSV</DialogTitle>
            <DialogDescription>
              Paste your lead data below. Use format: name, email, company (one lead per line)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="John Doe, john@example.com, Acme Corp&#10;Jane Smith, jane@example.com, Tech Inc"
              className="min-h-[200px] font-mono text-sm"
              value={importData}
              onChange={(e) => setImportData(e.target.value)}
              data-testid="textarea-import-data"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsImportOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={importMutation.isPending || !importData.trim()}
                data-testid="button-submit-import"
              >
                {importMutation.isPending ? "Importing..." : "Import Leads"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
