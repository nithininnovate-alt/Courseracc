import { useListPayments } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function AdminPayments() {
  const { data: payments, isLoading } = useListPayments();

  const total = (payments ?? [])
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        description={`Completed revenue: $${total.toLocaleString()}`}
      />

      {isLoading ? (
        <LoadingCard />
      ) : !payments || payments.length === 0 ? (
        <EmptyCard message="No payments recorded." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.reference ?? `#${p.id}`}</TableCell>
                    <TableCell>#{p.userId}</TableCell>
                    <TableCell className="font-medium">{p.currency} {p.amount.toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{p.provider}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
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
