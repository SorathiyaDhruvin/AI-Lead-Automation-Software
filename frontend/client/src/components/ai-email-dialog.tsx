import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Send, Copy, RefreshCw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";
import { type Lead } from "@/types";

interface AIEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  mode?: "initial" | "followup";
}

export function AIEmailDialog({ open, onOpenChange, lead, mode = "initial" }: AIEmailDialogProps) {
  const { toast } = useToast();
  const [objective, setObjective] = useState(mode === "initial" ? "Initial product pitch & meeting request" : "Follow-up on previous outreach");
  const [tone, setTone] = useState("Professional & Persuasive");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [hasGenerated, setHasGenerated] = useState(false);

  const handleGenerate = async () => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      if (mode === "initial") {
        const res = await apiClient.post<{ subject: string; body: string; cta?: string }>("/ai-suggestions/generate-email", {
          leadId: lead.id,
          objective,
          tone
        });
        setSubject(res.subject || `Outreach to ${lead.name}`);
        setBody(res.body || "");
      } else {
        const res = await apiClient.post<{ subject: string; body: string; delayDays?: number }>("/ai-suggestions/generate-followup", {
          leadId: lead.id,
          step: 1,
          objective
        });
        setSubject(res.subject || `Following up - ${lead.name}`);
        setBody(res.body || "");
      }
      setHasGenerated(true);
      toast({
        title: "AI Copy Generated",
        description: "Personalized email draft ready for review.",
      });
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate AI email",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!lead || !subject || !body) return;
    setIsSending(true);
    try {
      await apiClient.post(`/leads/${lead.id}/send-email`, {
        subject,
        message: body
      });
      toast({
        title: "Email Sent Successfully",
        description: `Delivered to ${lead.email}`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Failed to Send Email",
        description: err.message || "Could not send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-5 w-5 text-blue-600" />
            {mode === "initial" ? "Generate AI Sales Email" : "Generate AI Follow-Up Email"}
          </DialogTitle>
          <DialogDescription>
            Tailored specifically for <strong className="text-foreground">{lead?.name}</strong> ({lead?.company || "Company N/A"})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!hasGenerated ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Desired Objective</Label>
                <Input
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  placeholder="e.g. Schedule a demo call next week"
                />
              </div>

              {mode === "initial" && (
                <div className="space-y-2">
                  <Label>Tone of Voice</Label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Professional & Persuasive">Professional & Persuasive</SelectItem>
                      <SelectItem value="Friendly & Casual">Friendly & Casual</SelectItem>
                      <SelectItem value="Direct & Concise">Direct & Concise</SelectItem>
                      <SelectItem value="Executive & Formal">Executive & Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2 mt-2"
              >
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? "Analyzing Lead & Writing Copy..." : "Generate Personalized Email"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Subject Line</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Email Body (HTML/Text)</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleSend}
                    disabled={isSending}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  >
                    {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {isSending ? "Sending..." : "Send Email Now"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
