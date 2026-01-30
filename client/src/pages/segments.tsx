import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Target, MoreHorizontal, Trash2, Edit, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { SegmentDialog } from "@/components/segment-dialog";
import type { Segment } from "@shared/schema";

export default function SegmentsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState<Segment | null>(null);

  const { data: segments, isLoading } = useQuery<Segment[]>({
    queryKey: ["/api/segments"],
    queryFn: async () => {
      const response = await fetch("/api/segments", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to fetch segments");
      return response.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/segments/${id}`, undefined, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      toast({ title: "Segment deleted", description: "The segment has been removed" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete segment", variant: "destructive" });
    },
  });

  const autoSegmentMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/segments/auto-segment", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error("Failed to auto-segment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({ title: "AI Segmentation Complete", description: "Leads have been automatically segmented" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to auto-segment leads", variant: "destructive" });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Segments</h1>
          <p className="text-muted-foreground">Organize leads into meaningful groups</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => autoSegmentMutation.mutate()}
            disabled={autoSegmentMutation.isPending}
            data-testid="button-auto-segment"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {autoSegmentMutation.isPending ? "Segmenting..." : "AI Auto-Segment"}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-segment">
            <Plus className="h-4 w-4 mr-2" />
            Create Segment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : segments && segments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((segment) => (
            <Card key={segment.id} className="hover-elevate" data-testid={`card-segment-${segment.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${segment.color}20` }}
                  >
                    <Target className="h-5 w-5" style={{ color: segment.color }} />
                  </div>
                  <div>
                    <CardTitle className="text-base">{segment.name}</CardTitle>
                    {segment.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {segment.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-segment-actions-${segment.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedSegment(segment);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(segment.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className="text-sm"
                    style={{
                      backgroundColor: `${segment.color}15`,
                      color: segment.color,
                    }}
                  >
                    {segment.leadCount} {segment.leadCount === 1 ? "lead" : "leads"}
                  </Badge>
                  {segment.criteria && (
                    <span className="text-xs text-muted-foreground">
                      {segment.criteria}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No segments yet</h3>
            <p className="text-muted-foreground mb-4">
              Create segments to organize your leads or use AI auto-segmentation
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => autoSegmentMutation.mutate()}>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Auto-Segment
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Segment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <SegmentDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSelectedSegment(null);
        }}
        segment={selectedSegment}
      />
    </div>
  );
}
