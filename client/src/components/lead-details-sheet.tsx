import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Sparkles, Mail, Phone, Building, Calendar, Brain, TrendingUp, Lightbulb, ArrowRight,
  Send, FileText, Activity, Clock, User, Star, StickyNote, type LucideIcon,
} from "lucide-react";
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
import { getAuthHeaders } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { ScoreBadge } from "@/components/score-badge";
import type { Lead } from "@shared/schema";

interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  text: string;
  createdAt: string;
}

interface LeadActivity {
  id: string;
  leadId: string;
  userId: string;
  type: string;
  description: string;
  createdAt: string;
}

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

  useEffect(() => {
    setDisplayedLead(lead);
    setActiveTab("info");
    setNewNote("");
  }, [lead]);

  const scoreMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/leads/${displayedLead?.id}/score`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to score lead");
      return response.json() as Promise<Lead>;
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
    onError: () => {
      toast({ title: "Error", description: "Failed to score lead", variant: "destructive" });
    },
  });

  const { data: notes = [], isLoading: notesLoading } = useQuery<LeadNote[]>({
    queryKey: ["/api/leads", displayedLead?.id, "notes"],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${displayedLead!.id}/notes`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return response.json();
    },
    enabled: !!displayedLead && activeTab === "notes",
  });

  const { data: activityItems = [], isLoading: activityLoading } = useQuery<LeadActivity[]>({
    queryKey: ["/api/leads", displayedLead?.id, "activity"],
    queryFn: async () => {
      const response = await fetch(`/api/leads/${displayedLead!.id}/activity`, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    },
    enabled: !!displayedLead && activeTab === "activity",
  });

  const addNoteMutation = useMutation({
    mutationFn: async (text: string) => {
      const response = await fetch(`/api/leads/${displayedLead!.id}/notes`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error("Failed to add note");
      return response.json();
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

            {(displayedLead.aiPrediction || displayedLead.aiInsights || displayedLead.aiRecommendedAction) && (
              <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-5 w-5 text-primary" /> AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {displayedLead.aiPrediction && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium">Prediction</span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-ai-prediction">{displayedLead.aiPrediction}</p>
                    </div>
                  )}
                  {displayedLead.aiInsights && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-secondary" />
                        <span className="text-sm font-medium">Analysis</span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid="text-ai-insights">{displayedLead.aiInsights}</p>
                    </div>
                  )}
                  {displayedLead.aiRecommendedAction && (
                    <div className="rounded-md bg-primary/5 border border-primary/10 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Lightbulb className="h-4 w-4 text-amber-500" />
                        <span className="text-sm font-medium">Recommended Action</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <p className="text-sm text-muted-foreground" data-testid="text-recommended-action">
                          {displayedLead.aiRecommendedAction}
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
                    <p className="text-xs text-muted-foreground mt-2">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
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
  );
}
