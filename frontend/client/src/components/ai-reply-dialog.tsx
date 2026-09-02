import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, Loader2, Send, Copy, Sparkles, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api";
import { type Lead } from "@/types";

interface AIReplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
}

export function AIReplyDialog({ open, onOpenChange, lead }: AIReplyDialogProps) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const [intent, setIntent] = useState<string | null>(null);
  const [sentiment, setSentiment] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [suggestedResponse, setSuggestedResponse] = useState<string>("");

  const handleAnalyze = async () => {
    if (!lead || !replyText.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await apiClient.post<{ intent: string; sentiment: string; confidence: number; suggestedResponse: string }>("/ai-suggestions/analyze-reply", {
        leadId: lead.id,
        replyText: replyText.trim()
      });
      setIntent(res.intent);
      setSentiment(res.sentiment);
      setConfidence(res.confidence);
      setSuggestedResponse(res.suggestedResponse);
      toast({
        title: "Reply Analyzed",
        description: `Intent detected: ${res.intent}`,
      });
    } catch (err: any) {
      toast({
        title: "Analysis Failed",
        description: err.message || "Failed to analyze lead reply",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendResponse = async () => {
    if (!lead || !suggestedResponse) return;
    setIsSending(true);
    try {
      await apiClient.post(`/leads/${lead.id}/send-email`, {
        subject: `Re: Follow up with ${lead.name}`,
        message: suggestedResponse
      });
      toast({
        title: "Response Sent",
        description: `Sent to ${lead.email}`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Send Failed",
        description: err.message || "Could not send response",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestedResponse);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied response to clipboard!" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageSquareText className="h-5 w-5 text-purple-600" />
            AI Reply Assistant
          </DialogTitle>
          <DialogDescription>
            Analyze incoming email from <strong className="text-foreground">{lead?.name}</strong> and auto-generate smart response.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Incoming Lead Reply Text</Label>
            <Textarea
              placeholder="Paste the email reply received from the lead here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={4}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !replyText.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2"
          >
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isAnalyzing ? "Analyzing Intent & Drafting Response..." : "Analyze Reply & Generate Response"}
          </Button>

          {intent && (
            <div className="space-y-4 pt-2 border-t mt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Detected Intent:</span>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{intent}</Badge>
                {sentiment && (
                  <Badge variant="outline" className="text-xs">
                    Sentiment: {sentiment}
                  </Badge>
                )}
                {confidence !== null && (
                  <Badge variant="secondary" className="text-xs">
                    {confidence}% confidence
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label>Suggested Response (Editable)</Label>
                <Textarea
                  value={suggestedResponse}
                  onChange={(e) => setSuggestedResponse(e.target.value)}
                  rows={6}
                  className="font-sans text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>

                <Button
                  size="sm"
                  onClick={handleSendResponse}
                  disabled={isSending}
                  className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
                >
                  {isSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  {isSending ? "Sending..." : "Send Response"}
                </Button>
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
