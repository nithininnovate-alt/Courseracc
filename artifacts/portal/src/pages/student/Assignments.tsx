import { useState } from "react";
import { useListAssignments, useListSubmissions, useCreateSubmission } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";
import type { Assignment } from "@workspace/api-client-react";

function storageHref(objectPath: string): string {
  return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

export default function StudentAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useListAssignments();
  const { data: submissions } = useListSubmissions();
  const createSubmission = useCreateSubmission();
  const { uploadFile, isUploading } = useUpload();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Assignment | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");

  const submissionByAssignment = new Map((submissions ?? []).map((s) => [s.assignmentId, s]));

  const openSubmit = (a: Assignment) => {
    if (new Date(a.dueDate).getTime() < Date.now()) {
      toast({ title: "Deadline passed", description: "This assignment is closed for submissions.", variant: "destructive" });
      return;
    }
    setActive(a);
    setFileUrl("");
    setNote("");
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    const res = await uploadFile(file);
    if (res) {
      setFileUrl(res.objectPath);
      toast({ title: "File uploaded", description: file.name });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleSubmit = () => {
    if (!active) return;
    if (!fileUrl) {
      toast({ title: "Attach your work", description: "Upload a PDF before submitting.", variant: "destructive" });
      return;
    }
    createSubmission.mutate(
      { data: { assignmentId: active.id, fileUrl, note: note || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Submitted", description: "Your assignment was submitted." });
          qc.invalidateQueries();
          setOpen(false);
        },
        onError: () =>
          toast({ title: "Error", description: "Could not submit. The deadline may have passed.", variant: "destructive" }),
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
                  <TableHead>Instructions</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Max Score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((a) => {
                  const sub = submissionByAssignment.get(a.id);
                  const overdue = new Date(a.dueDate).getTime() < Date.now();
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>
                        {a.instructionsUrl ? (
                          <a className="text-primary underline inline-flex items-center gap-1" href={storageHref(a.instructionsUrl)} target="_blank" rel="noreferrer">
                            <Download className="w-3 h-3" /> PDF
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        {new Date(a.dueDate).toLocaleString()}
                        {overdue && <span className="ml-2 text-xs text-destructive">closed</span>}
                      </TableCell>
                      <TableCell>{a.maxScore}</TableCell>
                      <TableCell>
                        {sub ? <StatusBadge status={sub.status} /> : <span className="text-muted-foreground text-sm">Not submitted</span>}
                        {sub?.score != null && <span className="ml-2 text-sm font-medium">{sub.score}/{a.maxScore}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={sub ? "outline" : "default"}
                          disabled={overdue}
                          onClick={() => openSubmit(a)}
                        >
                          {overdue ? "Closed" : sub ? "Resubmit" : "Submit"}
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

      {submissions?.some((s) => s.feedback) && (
        <Card className="rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-serif font-bold text-primary">Instructor feedback</h2>
            {submissions.filter((s) => s.feedback).map((s) => {
              const a = assignments?.find((x) => x.id === s.assignmentId);
              return (
                <div key={s.id} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm font-medium">{a?.title ?? `Assignment #${s.assignmentId}`}{s.score != null && a && <span className="ml-2 text-muted-foreground">{s.score}/{a.maxScore}</span>}</p>
                  <p className="text-sm text-muted-foreground">{s.feedback}</p>
                </div>
              );
            })}
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
              <Label>Your work (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              {fileUrl && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Attached
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for your instructor" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createSubmission.isPending || isUploading}>
              {createSubmission.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
