import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Sparkles, Mail, Phone, Building, Calendar, Brain, TrendingUp, Lightbulb, ArrowRight,
  Send, FileText, Activity, Clock, User, Star, StickyNote, type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { ScoreBadge } from "@/components/score-badge";
import { leadsService } from "@/services/leads";
import type { Lead, LeadNote, Activity as LeadActivity } from "@/types";

interface LeadDetailsSheetProps {
  lead: Lead | null;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  contacted: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  qualified: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  proposal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  negotiation: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  won: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  lost: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const categoryColors: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  Warm: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400",
  Cold: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-400",
};

const activityIcons: Record<string, LucideIcon> = {
  lead_created: User,
  status_changed: TrendingUp,
  note_added: StickyNote,
  scored: Star,
  call: Phone,
  email: Mail,
  meeting: Calendar,
};

const activityColors: Record<string, string> = {
  lead_created: "text-blue-500 bg-blue-50 dark:bg-blue-900/20",
  status_changed: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
  note_added: "text-amber-500 bg-amber-50 dark:bg-amber-900/20",
  scored: "text-green-500 bg-green-50 dark:bg-green-900/20",
};

export function LeadDetailsSheet({ lead, onClose }: LeadDetailsSheetProps) {
  const { toast } = useToast();
  const [displayedLead, setDisplayedLead] = useState<Lead | null>(lead);
  const [activeTab, setActiveTab] = useState("info");
  const [newNote, setNewNote] = useState("");
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState("Following up — LeadFlow");
  const [emailMessage, setEmailMessage] = useState("");

  useEffect(() => {
    setDisplayedLead(lead);
    setActiveTab("info");
    setNewNote("");
  }, [lead]);

  const scoreMutation = useMutation({
    mutationFn: async () => {
      if (!displayedLead?.id) throw new Error("No lead selected");
      return leadsService.score(displayedLead.id);
    },
    onSuccess: (updatedLead: Lead) => {
      setDisplayedLead(updatedLead);
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", displayedLead?.id, "activity"] });
      toast({
        title: "AI Scoring Complete",
        description: `Lead scored ${updatedLead.aiScore}/100 — categorized as ${updatedLead.aiCategory}`,
      });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to score lead";
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/leads", displayedLead?.id, "notes"],
    queryFn: async () => {
      if (!displayedLead?.id) throw new Error("No lead selected");
      return leadsService.getNotes(displayedLead.id);
    },
    enabled: !!displayedLead && activeTab === "notes",
  });

  const { data: activityItems = [], isLoading: activityLoading } = useQuery<LeadActivity[]>({
    queryKey: ["/api/leads", displayedLead?.id, "activity"],
    queryFn: async () => {
      if (!displayedLead?.id) throw new Error("No lead selected");
      return leadsService.getActivity(displayedLead.id);
    },
    enabled: !!displayedLead && activeTab === "activity",
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      if (!displayedLead?.id) throw new Error("No lead selected");
      return leadsService.sendEmail(displayedLead.id, { subject: emailSubject, message: emailMessage });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", displayedLead?.id, "activity"] });
      setIsEmailOpen(false);
      setEmailMessage("");
      toast({ title: "Email Sent", description: `Follow-up sent to ${displayedLead?.email}` });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send email", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!displayedLead?.id) throw new Error("No lead selected");
      return leadsService.addNote(displayedLead.id, text);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads", displayedLead?.id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads", displayedLead?.id, "activity"] });
      setNewNote("");
      toast({ title: "Note Added", description: "Note has been saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add note", variant: "destructive" });
    },
  });

  if (!displayedLead) return null;

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
    <Sheet open={!!lead} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {getInitials(displayedLead.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl">{displayedLead.name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge className={statusColors[displayedLead.status]}>{displayedLead.status}</Badge>
                {displayedLead.aiCategory && (
                  <Badge
                    variant="outline"
                    className={categoryColors[displayedLead.aiCategory] || ""}
                    data-testid="badge-ai-category"
                  >
                    {displayedLead.aiCategory}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground capitalize">{displayedLead.source}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground mb-1">AI Score</p>
            <ScoreBadge score={displayedLead.aiScore} size="lg" />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsEmailOpen(true)}
            data-testid="button-send-email"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button
            onClick={() => scoreMutation.mutate()}
            disabled={scoreMutation.isPending}
            data-testid="button-ai-score"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {scoreMutation.isPending ? "Analyzing..." : "Score with AI"}
          </Button>
        </div>

        <Separator className="my-4" />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Info</TabsTrigger>
            <TabsTrigger value="notes" className="flex-1" data-testid="tab-notes">Notes</TabsTrigger>
            <TabsTrigger value="activity" className="flex-1" data-testid="tab-activity">Activity</TabsTrigger>
          </TabsList>

          {/* Info Tab */}
          <TabsContent value="info" className="space-y-6 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4" /> Contact Information
              </h3>
              <div className="grid gap-2">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{displayedLead.email}</span>
                </div>
                {displayedLead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{displayedLead.phone}</span>
                  </div>
                )}
                {displayedLead.company && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{displayedLead.company}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Created {format(new Date(displayedLead.createdAt), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>

            {(displayedLead.aiRating || displayedLead.aiReason || displayedLead.aiStrengths || displayedLead.aiRecommendation) && (
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" /> AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayedLead.aiRating && (
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">Rating: </span>
                      <Badge variant="outline" className={
                        displayedLead.aiRating.toLowerCase() === "high" ? "bg-red-100 text-red-700" :
                        displayedLead.aiRating.toLowerCase() === "medium" ? "bg-amber-100 text-amber-700" :
                        "bg-sky-100 text-sky-700"
                      }>
                        {displayedLead.aiRating.charAt(0).toUpperCase() + displayedLead.aiRating.slice(1)}
                      </Badge>
                    </div>
                  )}
                  {displayedLead.aiReason && (
                    <div>
                      <p className="text-sm text-muted-foreground">{displayedLead.aiReason}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4 my-4">
                    {displayedLead.aiStrengths && (
                      <div>
                        <p className="text-xs font-semibold text-success mb-1">Strengths</p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          {(() => {
                            try {
                              const strengths = typeof displayedLead.aiStrengths === 'string' ? JSON.parse(displayedLead.aiStrengths) : displayedLead.aiStrengths;
                              return Array.isArray(strengths) ? strengths.map((s: string, i: number) => <li key={i}>{s}</li>) : <li>{String(displayedLead.aiStrengths)}</li>;
                            } catch (e) {
                              return <li>{String(displayedLead.aiStrengths)}</li>;
                            }
                          })()}
                        </ul>
                      </div>
                    )}
                    {displayedLead.aiWeaknesses && (
                      <div>
                        <p className="text-xs font-semibold text-destructive mb-1">Weaknesses</p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                          {(() => {
                            try {
                              const weaknesses = typeof displayedLead.aiWeaknesses === 'string' ? JSON.parse(displayedLead.aiWeaknesses) : displayedLead.aiWeaknesses;
                              return Array.isArray(weaknesses) ? weaknesses.map((w: string, i: number) => <li key={i}>{w}</li>) : <li>{String(displayedLead.aiWeaknesses)}</li>;
                            } catch (e) {
                              return <li>{String(displayedLead.aiWeaknesses)}</li>;
                            }
                          })()}
                        </ul>
                      </div>
                    )}
                  </div>
                  {displayedLead.aiRecommendation && (
                    <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Recommended Action</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          {displayedLead.aiRecommendation}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Add a note about this lead..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="textarea-new-note"
              />
              <Button
                size="sm"
                onClick={() => addNoteMutation.mutate(newNote)}
                disabled={!newNote.trim() || addNoteMutation.isPending}
                data-testid="button-add-note"
              >
                <Send className="h-4 w-4 mr-2" />
                {addNoteMutation.isPending ? "Saving…" : "Add Note"}
              </Button>
            </div>

            {notesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 rounded-lg bg-muted/50" data-testid={`note-item-${note.id}`}>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{note.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{note.authorName}</span>
                      <span>·</span>
                      <Clock className="h-3 w-3" />
                      <span>{new Date(note.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No notes yet. Add the first note above.</p>
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4 mt-4">
            {activityLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : activityItems.length > 0 ? (
              <div className="space-y-3">
                {activityItems.map((item) => {
                  const Icon = activityIcons[item.type] || Activity;
                  const colorClass = activityColors[item.type] || "text-muted-foreground bg-muted/50";
                  return (
                    <div key={item.id} className="flex gap-3 p-3 rounded-lg bg-muted/30" data-testid={`activity-item-${item.id}`}>
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium capitalize">{item.type.replace(/_/g, " ")}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No activity recorded yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>

    <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Follow-up Email</DialogTitle>
          <DialogDescription>
            Send a follow-up email to {displayedLead.name} ({displayedLead.email})
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Subject</label>
            <Input
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              placeholder="Email subject"
              data-testid="input-email-subject"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={emailMessage}
              onChange={(e) => setEmailMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={4}
              className="resize-none"
              data-testid="textarea-email-message"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEmailOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendEmailMutation.mutate()}
              disabled={!emailSubject.trim() || !emailMessage.trim() || sendEmailMutation.isPending}
              data-testid="button-send-email-submit"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendEmailMutation.isPending ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
