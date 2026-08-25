import { useQuery } from "@tanstack/react-query";
import { Mail, CheckCircle, XCircle } from "lucide-react";
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

export default function AdminEmailsPage() {
  const { data: emails, isLoading } = useQuery({
    queryKey: ["/api/admin/emails"],
    queryFn: () => adminService.getEmails(),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
          <Mail className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Deliverability</h1>
          <p className="text-muted-foreground">Monitor platform-wide email logs and statuses</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>Latest emails dispatched by the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Sender (User)</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : emails?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                      No emails sent yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  emails?.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="whitespace-nowrap">{new Date(email.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{email.userEmail || 'System'}</TableCell>
                      <TableCell>{email.recipient}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={email.subject}>
                        {email.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{email.provider}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {(email.status === 'delivered' || email.status === 'sent') ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {email.status}
                            </Badge>
                          ) : (
                            <div className="flex flex-col gap-1">
                                <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                <XCircle className="w-3 h-3 mr-1" />
                                {email.status}
                                </Badge>
                                {email.errorMessage && (
                                    <span className="text-[10px] text-red-500 max-w-[150px] truncate" title={email.errorMessage}>
                                        {email.errorMessage}
                                    </span>
                                )}
                            </div>
                          )}
                        </div>
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
