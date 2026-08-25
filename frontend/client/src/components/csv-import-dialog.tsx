import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
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
import { Loader2, UploadCloud } from "lucide-react";

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      return leadsService.importCsv(file);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      toast({ 
        title: "Import Complete", 
        description: `${data.created} leads imported. ${data.failed > 0 ? `${data.failed} failed.` : ''}` 
      });
      setSelectedFile(null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Import Failed", description: error.message || "Failed to import leads", variant: "destructive" });
    },
  });

  const handleImport = () => {
    if (!selectedFile) return;
    importMutation.mutate(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setSelectedFile(null);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your leads. The file should have columns for name, email, company, and phone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div 
            className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              data-testid="input-csv-file"
            />
            <UploadCloud className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            {selectedFile ? (
              <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Click to select a file</p>
                <p className="text-xs text-muted-foreground mt-1">.csv files only</p>
              </>
            )}
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !selectedFile}
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
