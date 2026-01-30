import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Segment } from "@shared/schema";

const segmentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  criteria: z.string().optional(),
  color: z.string().min(1, "Please select a color"),
});

type SegmentFormValues = z.infer<typeof segmentFormSchema>;

interface SegmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: Segment | null;
}

const colorOptions = [
  { value: "#0066FF", label: "Blue" },
  { value: "#6C5CE7", label: "Purple" },
  { value: "#00D68F", label: "Green" },
  { value: "#FFB946", label: "Amber" },
  { value: "#FF6B6B", label: "Red" },
  { value: "#4ECDC4", label: "Teal" },
  { value: "#95E1D3", label: "Mint" },
  { value: "#F38181", label: "Coral" },
];

export function SegmentDialog({ open, onOpenChange, segment }: SegmentDialogProps) {
  const { toast } = useToast();
  const isEditing = !!segment;

  const form = useForm<SegmentFormValues>({
    resolver: zodResolver(segmentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      criteria: "",
      color: "#6C5CE7",
    },
  });

  useEffect(() => {
    if (segment) {
      form.reset({
        name: segment.name,
        description: segment.description || "",
        criteria: segment.criteria || "",
        color: segment.color,
      });
    } else {
      form.reset({
        name: "",
        description: "",
        criteria: "",
        color: "#6C5CE7",
      });
    }
  }, [segment, form]);

  const createMutation = useMutation({
    mutationFn: async (data: SegmentFormValues) => {
      return apiRequest("POST", "/api/segments", data, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      toast({ title: "Segment created", description: "New segment has been added" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create segment", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SegmentFormValues) => {
      return apiRequest("PATCH", `/api/segments/${segment?.id}`, data, getAuthHeaders());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/segments"] });
      toast({ title: "Segment updated", description: "Changes have been saved" });
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update segment", variant: "destructive" });
    },
  });

  const onSubmit = (data: SegmentFormValues) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Segment" : "Create Segment"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the segment information"
              : "Create a new segment to organize your leads"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="High-Value Prospects" data-testid="input-segment-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe this segment..."
                      className="resize-none"
                      rows={2}
                      data-testid="textarea-segment-description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="criteria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Criteria</FormLabel>
                  <FormControl>
                    <Input placeholder="Score > 70" data-testid="input-segment-criteria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`h-8 w-8 rounded-md transition-all ${
                            field.value === color.value
                              ? "ring-2 ring-offset-2 ring-primary"
                              : ""
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => field.onChange(color.value)}
                          data-testid={`button-color-${color.label.toLowerCase()}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-submit-segment">
                {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
