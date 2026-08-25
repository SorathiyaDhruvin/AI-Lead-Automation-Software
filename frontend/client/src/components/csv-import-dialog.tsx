import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2 } from "lucide-react";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const { toast } = useToast();
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
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      toast({ title: "Import Complete", description: `${data.length} leads imported successfully` });
      setImportData("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message || "Failed to import leads", variant: "destructive" });
    },
  });

  const handleImport = () => {
    try {
      const lines = importData.trim().split("\n").filter(Boolean);
      const leads = lines.map((line) => {
        // Very basic CSV parse - split by comma
        const [name, email, company, phone] = line.split(",").map((s) => s.trim());
        return { 
          name, 
          email, 
          company: company || undefined, 
          phone: phone || undefined,
          source: "import" as const 
        };
      });
      
      if (leads.length === 0 || !leads[0].name || !leads[0].email) {
        toast({ title: "Invalid Format", description: "Please use format: name, email, company, phone (one per line)", variant: "destructive" });
        return;
      }
      
      importMutation.mutate(leads);
    } catch {
      toast({ title: "Parse Error", description: "Could not parse the import data", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Paste your lead data below. Use format: name, email, company, phone (one lead per line)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Textarea
            placeholder="John Doe, john@example.com, Acme Corp, +15551234567&#10;Jane Smith, jane@example.com, Tech Inc,"
            className="min-h-[250px] font-mono text-sm"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            data-testid="textarea-import-data"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !importData.trim()}
              data-testid="button-submit-import"
            >
              {importMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importMutation.isPending ? "Importing..." : "Import Leads"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
