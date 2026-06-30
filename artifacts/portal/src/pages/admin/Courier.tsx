import { useState } from "react";
import {
  useListCourierTracking,
  useUpdateCourier,
  useListUsers,
  type CourierTracking,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";

const STATUSES = ["requested", "shipped", "in_transit", "delivered", "returned"];

export default function AdminCourier() {
  const { data: shipments, isLoading } = useListCourierTracking();
  const { data: users } = useListUsers();
  const [editing, setEditing] = useState<CourierTracking | null>(null);

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const userName = (id: number) => {
    const u = userMap.get(id);
    if (!u) return `#${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Courier Requests"
        description="Dispatch physical certificate copies and track delivery."
      />

      {isLoading ? (
        <LoadingCard />
      ) : !shipments || shipments.length === 0 ? (
        <EmptyCard message="No courier requests yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking No.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{userName(s.userId)}</TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                      {s.shippingAddress ?? "—"}
                    </TableCell>
                    <TableCell>{s.carrier ?? "—"}</TableCell>
                    <TableCell className="font-mono text-sm">{s.trackingNumber ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell>{new Date(s.requestedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                        <Truck className="w-4 h-4 mr-2" /> Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {editing && <DispatchDialog record={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function DispatchDialog({ record, onClose }: { record: CourierTracking; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const update = useUpdateCourier();

  const [carrier, setCarrier] = useState(record.carrier ?? "");
  const [trackingNumber, setTrackingNumber] = useState(record.trackingNumber ?? "");
  const [status, setStatus] = useState(record.status);

  const handleSave = () => {
    if (status === "shipped" && (!carrier.trim() || !trackingNumber.trim())) {
      toast({
        title: "Missing details",
        description: "Carrier and tracking number are required to mark as shipped.",
        variant: "destructive",
      });
      return;
    }
    update.mutate(
      {
        id: record.id,
        data: {
          carrier: carrier.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          status,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Courier updated" });
          qc.invalidateQueries();
          onClose();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not update courier.", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Manage courier request</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {record.shippingAddress && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="font-medium mb-1">Shipping address</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{record.shippingAddress}</p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="carrier">Carrier</Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="DHL, FedEx, ..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking number</Label>
            <Input
              id="tracking"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={update.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
