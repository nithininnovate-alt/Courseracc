import { useState } from "react";
import { useListApplications, useUpdateApplication } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { ApplicationUpdateStatus } from "@workspace/api-client-react";
import type { Application } from "@workspace/api-client-react";

const STATUSES = Object.values(ApplicationUpdateStatus);

export default function AdminApplications() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: applications, isLoading } = useListApplications();
  const updateApplication = useUpdateApplication();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Application | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [reviewNote, setReviewNote] = useState("");

  const openReview = (a: Application) => {
    setActive(a);
    setStatus(a.status);
    setReviewNote(a.reviewNote ?? "");
    setOpen(true);
  };

  const handleSave = () => {
    if (!active) return;
    updateApplication.mutate(
      { id: active.id, data: { status: status as ApplicationUpdateStatus, reviewNote: reviewNote || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: "Application status updated." });
          qc.invalidateQueries();
          setOpen(false);
        },
        onError: () =>
          toast({ title: "Error", description: "Could not update application.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Applications" description="Review and process admission applications." />

      {isLoading ? (
        <LoadingCard />
      ) : !applications || applications.length === 0 ? (
        <EmptyCard message="No applications submitted yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.fullName}</TableCell>
                    <TableCell>{a.programName}</TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>{new Date(a.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReview(a)}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reviewNote">Review Note</Label>
              <Textarea id="reviewNote" value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional note" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateApplication.isPending}>
              {updateApplication.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
