import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import type { Lead } from "@/types";

interface LeadScoreChartProps {
  leads: Lead[];
  isLoading: boolean;
}

export function LeadScoreChart({ leads, isLoading }: LeadScoreChartProps) {
  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  const scoreRanges = [
    { range: "0-20", min: 0, max: 20, color: "#ef4444" },
    { range: "21-40", min: 21, max: 40, color: "#f97316" },
    { range: "41-60", min: 41, max: 60, color: "#eab308" },
    { range: "61-80", min: 61, max: 80, color: "#22c55e" },
    { range: "81-100", min: 81, max: 100, color: "#0066FF" },
  ];

  const data = scoreRanges.map((range) => ({
    name: range.range,
    count: leads.filter(
      (lead) =>
        lead.aiScore !== null &&
        lead.aiScore !== undefined &&
        lead.aiScore >= range.min &&
        lead.aiScore <= range.max
    ).length,
    color: range.color,
  }));

  const totalScored = data.reduce((sum, item) => sum + item.count, 0);

  if (totalScored === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
        <p className="font-medium mb-1 text-foreground">No scored leads yet.</p>
        <p className="text-sm">Score leads using AI to see the distribution here.</p>
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              color: "hsl(var(--foreground))",
            }}
            formatter={(value: number) => [`${value} leads`, "Count"]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
