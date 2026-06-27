import { useListEmailLogs } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function AdminEmails() {
  const { data: logs, isLoading } = useListEmailLogs();

  return (
    <div className="space-y-8">
      <PageHeader title="Email Logs" description="Outbound email activity and delivery status." />

      {isLoading ? (
        <LoadingCard />
      ) : !logs || logs.length === 0 ? (
        <EmptyCard message="No emails logged yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.recipient}</TableCell>
                    <TableCell>{l.subject}</TableCell>
                    <TableCell className="text-muted-foreground">{l.template}</TableCell>
                    <TableCell><StatusBadge status={l.status} /></TableCell>
                    <TableCell>{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
