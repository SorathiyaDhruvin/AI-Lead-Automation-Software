import { cn } from "@/lib/utils";

interface ScoreBadgeProps {
  score: number | null | undefined;
  size?: "sm" | "md" | "lg";
}

export function ScoreBadge({ score, size = "md" }: ScoreBadgeProps) {
  if (score === null || score === undefined) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-md bg-muted text-muted-foreground font-medium",
          size === "sm" && "h-6 w-10 text-xs",
          size === "md" && "h-8 w-12 text-sm",
          size === "lg" && "h-10 w-14 text-base"
        )}
      >
        --
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-primary text-primary-foreground";
    if (score >= 60) return "bg-success text-success-foreground";
    if (score >= 40) return "bg-yellow-500 text-white";
    if (score >= 20) return "bg-orange-500 text-white";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-md font-bold",
        getScoreColor(score),
        size === "sm" && "h-6 w-10 text-xs",
        size === "md" && "h-8 w-12 text-sm",
        size === "lg" && "h-10 w-14 text-base"
      )}
      data-testid="score-badge"
    >
      {score}
    </div>
  );
}
