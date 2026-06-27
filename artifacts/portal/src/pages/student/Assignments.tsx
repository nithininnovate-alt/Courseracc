import { useState } from "react";
import { useListAssignments, useListSubmissions, useCreateSubmission } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import type { Assignment } from "@workspace/api-client-react";

export default function StudentAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useListAssignments();
  const { data: submissions } = useListSubmissions();
  const createSubmission = useCreateSubmission();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Assignment | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");

  const submissionByAssignment = new Map((submissions ?? []).map((s) => [s.assignmentId, s]));

  const openSubmit = (a: Assignment) => {
    setActive(a);
    setFileUrl("");
    setNote("");
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!active) return;
    createSubmission.mutate(
      { data: { assignmentId: active.id, fileUrl: fileUrl || undefined, note: note || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Submitted", description: "Your assignment was submitted." });
          qc.invalidateQueries();
          setOpen(false);
        },
        onError: () =>
          toast({ title: "Error", description: "Could not submit assignment.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Assignments" description="Submit coursework and track grades." />

      {isLoading ? (
        <LoadingCard />
      ) : !assignments || assignments.length === 0 ? (
        <EmptyCard message="No assignments yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const sub = submissionByAssignment.get(a.id);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{new Date(a.dueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{a.maxScore}</TableCell>
                      <TableCell>
                        {sub ? <StatusBadge status={sub.status} /> : <span className="text-muted-foreground text-sm">Not submitted</span>}
                        {sub?.score != null && <span className="ml-2 text-sm font-medium">{sub.score}/{a.maxScore}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={sub ? "outline" : "default"} onClick={() => openSubmit(a)}>
                          {sub ? "Resubmit" : "Submit"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit: {active?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileUrl">File URL</Label>
              <Input id="fileUrl" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for your instructor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createSubmission.isPending}>
              {createSubmission.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
