import { useState } from "react";
import {
  useListExams,
  useListResults,
  useListExamSubmissions,
  useCreateExamSubmission,
  useListAllSubjects,
  type Exam,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download } from "lucide-react";

function storageHref(objectPath: string): string {
  return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

function windowState(exam: Exam): { open: boolean; label: string } {
  const now = Date.now();
  if (exam.startsAt && now < new Date(exam.startsAt).getTime()) {
    return { open: false, label: `Opens ${new Date(exam.startsAt).toLocaleString()}` };
  }
  if (exam.endsAt && now > new Date(exam.endsAt).getTime()) {
    return { open: false, label: "Window closed" };
  }
  return { open: true, label: "Open now" };
}

export default function StudentExams() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: exams, isLoading } = useListExams();
  const { data: results } = useListResults();
  const { data: examSubmissions } = useListExamSubmissions();
  const { data: subjects } = useListAllSubjects();
  const createExamSubmission = useCreateExamSubmission();
  const { uploadFile, isUploading } = useUpload();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Exam | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [note, setNote] = useState("");

  const submissionByExam = new Map((examSubmissions ?? []).map((s) => [s.examId, s]));
  const examById = new Map((exams ?? []).map((e) => [e.id, e]));
  const subjectTitle = (id: number) => subjects?.find((s) => s.id === id)?.title ?? `Subject #${id}`;

  const openSubmit = (e: Exam) => {
    setActive(e);
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
      toast({ title: "Attach your answers", description: "Upload a PDF before submitting.", variant: "destructive" });
      return;
    }
    createExamSubmission.mutate(
      { data: { examId: active.id, fileUrl, note: note || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Submitted", description: "Your answers were submitted." });
          qc.invalidateQueries();
          setOpen(false);
        },
        onError: () =>
          toast({ title: "Error", description: "Could not submit. The window may be closed.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Exams" description="Download papers, submit answers, and view published results." />

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Scheduled Exams</h2>
        {isLoading ? (
          <LoadingCard />
        ) : !exams || exams.length === 0 ? (
          <EmptyCard message="No exams scheduled." />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Paper</TableHead>
                    <TableHead>Window</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((e) => {
                    const ws = windowState(e);
                    const sub = submissionByExam.get(e.id);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">{e.title}</TableCell>
                        <TableCell>
                          {e.questionUrl ? (
                            <a className="text-primary underline inline-flex items-center gap-1" href={storageHref(e.questionUrl)} target="_blank" rel="noreferrer">
                              <Download className="w-3 h-3" /> PDF
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ws.label}</TableCell>
                        <TableCell>{e.totalMarks}</TableCell>
                        <TableCell>
                          {sub ? <StatusBadge status={sub.status} /> : <span className="text-muted-foreground text-sm">Not submitted</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant={sub ? "outline" : "default"} disabled={!ws.open} onClick={() => openSubmit(e)}>
                            {!ws.open ? "Unavailable" : sub ? "Resubmit" : "Submit"}
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
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Results</h2>
        {!results || results.length === 0 ? (
          <EmptyCard message="No results published yet." />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead className="text-right">Slip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => {
                    const exam = examById.get(r.examId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{exam?.title ?? `Exam #${r.examId}`}</TableCell>
                        <TableCell>{exam ? subjectTitle(exam.subjectId) : "—"}</TableCell>
                        <TableCell>{r.score}{exam && `/${exam.totalMarks}`}</TableCell>
                        <TableCell>{r.grade ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={r.passed ? "bg-green-100 text-green-800 border-0" : "bg-red-100 text-red-800 border-0"}>
                            {r.passed ? "Passed" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" asChild>
                            <a href={`/api/results/${r.id}/report`} target="_blank" rel="noreferrer">
                              <Download className="w-4 h-4 mr-2" /> PDF
                            </a>
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
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit answers: {active?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Your answers (PDF)</Label>
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
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note for your examiner" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createExamSubmission.isPending || isUploading}>
              {createExamSubmission.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
