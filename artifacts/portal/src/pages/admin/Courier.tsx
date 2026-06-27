import { useListCourierTracking } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function AdminCourier() {
  const { data: shipments, isLoading } = useListCourierTracking();

  return (
    <div className="space-y-8">
      <PageHeader title="Courier Tracking" description="Track certificate and document shipments." />

      {isLoading ? (
        <LoadingCard />
      ) : !shipments || shipments.length === 0 ? (
        <EmptyCard message="No shipments yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tracking No.</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shipped</TableHead>
                  <TableHead>Delivered</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-sm">{s.trackingNumber}</TableCell>
                    <TableCell>{s.carrier}</TableCell>
                    <TableCell>#{s.userId}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>{s.shippedAt ? new Date(s.shippedAt).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{s.deliveredAt ? new Date(s.deliveredAt).toLocaleDateString() : "-"}</TableCell>
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
