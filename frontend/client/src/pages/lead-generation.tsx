import { useState } from "react";
import { 
  Globe, 
  Mail, 
  Users, 
  FileSpreadsheet, 
  Smartphone, 
  MessageSquare,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LeadDialog } from "@/components/lead-dialog";
import { CsvImportDialog } from "@/components/csv-import-dialog";

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
    id: "import",
    title: "CSV Import",
    description: "Bulk import leads from spreadsheets and external sources",
    icon: FileSpreadsheet,
    color: "#FF6B6B",
    status: "active",
    action: "import",
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
];

export default function LeadGenerationPage() {
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lead Generation</h1>
          <p className="text-muted-foreground mt-1">Capture, create, and import leads from multiple sources.</p>
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
                  variant={source.status === "active" ? "default" : "secondary"}
                  className="text-[10px] uppercase tracking-wider font-semibold"
                >
                  {source.status === "active" ? "Active" : "Coming Soon"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 justify-between gap-6">
              <CardDescription className="text-sm">
                {source.description}
              </CardDescription>
              
              <Button 
                variant={source.status === "coming_soon" ? "outline" : "secondary"} 
                className="w-full"
                disabled={source.status === "coming_soon"} 
                onClick={() => {
                  if (source.action === "import") {
                    setIsImportOpen(true);
                  }
                }}
                data-testid={`button-configure-${source.id}`}
              >
                {source.status === "active" 
                  ? source.action === "import" ? "Import Leads" : "Configure" 
                  : "Coming Soon"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

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
