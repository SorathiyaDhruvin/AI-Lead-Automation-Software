import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { adminService } from "@/services/admin";

export default function AdminAutomationsPage() {
  const { data: automations, isLoading } = useQuery({
    queryKey: ["/api/admin/automations"],
    queryFn: () => adminService.getAutomations(),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations Monitoring</h1>
          <p className="text-muted-foreground">Monitor platform-wide workflow executions</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Automations</CardTitle>
          <CardDescription>Workflows configured by users across the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow Name</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Executions</TableHead>
                  <TableHead className="text-right">Failures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                      <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : automations?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No automations found.
                    </TableCell>
                  </TableRow>
                ) : (
                  automations?.map((auto) => (
                    <TableRow key={auto.id}>
                      <TableCell className="font-medium">{auto.name}</TableCell>
                      <TableCell>{auto.userEmail}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{auto.triggerType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={auto.isActive ? "default" : "secondary"}>
                          {auto.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{auto.totalExecutions}</TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        {auto.failedExecutions > 0 ? auto.failedExecutions : 0}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
