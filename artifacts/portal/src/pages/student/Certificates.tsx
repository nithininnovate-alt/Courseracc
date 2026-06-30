import { useState } from "react";
import {
  useListCertificates,
  useListCourses,
  useListCourierTracking,
  useRequestCourier,
  type Certificate,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { GraduationCap, Download, Truck } from "lucide-react";
import { PageHeader, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";

export default function StudentCertificates() {
  const { data: certificates, isLoading } = useListCertificates();
  const { data: courses } = useListCourses();
  const { data: shipments } = useListCourierTracking();
  const [requesting, setRequesting] = useState<Certificate | null>(null);

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
  const issued = (certificates ?? []).filter((c) => c.status === "issued");
  const courierByCert = new Map((shipments ?? []).map((s) => [s.certificateId, s]));

  return (
    <div className="space-y-10">
      <PageHeader title="Certificates" description="Your earned certificates and credentials." />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : issued.length === 0 ? (
        <EmptyCard message="You have not earned any certificates yet." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {issued.map((c) => {
            const shipment = courierByCert.get(c.id);
            return (
              <Card key={c.id} className="rounded-2xl">
                <CardHeader>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="font-serif text-lg">
                    {courseMap.get(c.courseId)?.title ?? `Course #${c.courseId}`}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground capitalize">{c.type}</span>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Certificate No.</p>
                    <p className="font-mono text-foreground">{c.certificateNumber}</p>
                    <p className="pt-2">Issued {new Date(c.issuedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/certificates/${c.id}/download`} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4 mr-2" /> Download
                      </a>
                    </Button>
                    {shipment ? (
                      <StatusBadge status={shipment.status} />
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => setRequesting(c)}>
                        <Truck className="w-4 h-4 mr-2" /> Request copy
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {shipments && shipments.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-serif font-semibold text-primary">Physical copy requests</h2>
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requested</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Tracking No.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.requestedAt).toLocaleDateString()}</TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>{s.carrier ?? "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{s.trackingNumber ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      {requesting && (
        <RequestCopyDialog certificate={requesting} onClose={() => setRequesting(null)} />
      )}
    </div>
  );
}

function RequestCopyDialog({ certificate, onClose }: { certificate: Certificate; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const request = useRequestCourier();
  const [address, setAddress] = useState("");

  const handleSubmit = () => {
    if (!address.trim()) {
      toast({ title: "Address required", description: "Enter a shipping address.", variant: "destructive" });
      return;
    }
    request.mutate(
      { data: { certificateId: certificate.id, shippingAddress: address.trim() } },
      {
        onSuccess: () => {
          toast({ title: "Request submitted", description: "We'll dispatch your certificate soon." });
          qc.invalidateQueries();
          onClose();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not submit request.", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Request a physical copy</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We'll mail a printed copy of certificate {certificate.certificateNumber} to the address below.
          </p>
          <div className="space-y-2">
            <Label htmlFor="address">Shipping address</Label>
            <Textarea
              id="address"
              rows={4}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full name, street, city, postal code, country"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={request.isPending}>Submit request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
