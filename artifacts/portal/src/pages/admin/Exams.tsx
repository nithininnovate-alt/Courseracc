import { useState } from "react";
import {
  useListExams,
  useCreateExam,
  useUpdateExam,
  useDeleteExam,
  useListExamSubmissionsForExam,
  useListResults,
  useCreateResult,
  usePublishExamResults,
  useListAllSubjects,
  useListCourses,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ClipboardCheck, FileText, Send } from "lucide-react";

interface ExamForm {
  courseId: string;
  subjectId: string;
  title: string;
  scheduledAt: string;
  durationMinutes: string;
  totalMarks: string;
  questionUrl: string;
  startsAt: string;
  endsAt: string;
}

const empty: ExamForm = {
  courseId: "",
  subjectId: "",
  title: "",
  scheduledAt: "",
  durationMinutes: "60",
  totalMarks: "100",
  questionUrl: "",
  startsAt: "",
  endsAt: "",
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function AdminExams() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: exams, isLoading } = useListExams();
  const { data: subjects } = useListAllSubjects();
  const { data: courses } = useListCourses();
  const createExam = useCreateExam();
  const updateExam = useUpdateExam();
  const deleteExam = useDeleteExam();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [form, setForm] = useState<ExamForm>(empty);
  const [managing, setManaging] = useState<Exam | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const { uploadFile, isUploading } = useUpload();

  const subjectLabel = (id: number) => subjects?.find((x) => x.id === id)?.title ?? `Subject #${id}`;
  const courseIdOfSubject = (subjectId: number) =>
    subjects?.find((s) => s.id === subjectId)?.courseId;
  const courseLabel = (subjectId: number) => {
    const cid = courseIdOfSubject(subjectId);
    return courses?.find((x) => x.id === cid)?.title ?? "—";
  };
  const formSubjects = (subjects ?? []).filter(
    (s) => form.courseId && s.courseId === Number(form.courseId),
  );
  const visibleExams = (exams ?? []).filter(
    (e) => courseFilter === "all" || courseIdOfSubject(e.subjectId) === Number(courseFilter),
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty });
    setOpen(true);
  };
  const openEdit = (e: Exam) => {
    setEditing(e);
    setForm({
      courseId: String(courseIdOfSubject(e.subjectId) ?? ""),
      subjectId: String(e.subjectId),
      title: e.title,
      scheduledAt: toLocalInput(e.scheduledAt),
      durationMinutes: String(e.durationMinutes),
      totalMarks: String(e.totalMarks),
      questionUrl: e.questionUrl ?? "",
      startsAt: toLocalInput(e.startsAt),
      endsAt: toLocalInput(e.endsAt),
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    const res = await uploadFile(file);
    if (res) {
      setForm((f) => ({ ...f, questionUrl: res.objectPath }));
      toast({ title: "File uploaded", description: file.name });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleSave = () => {
    if (!form.title.trim() || !form.subjectId) {
      toast({ title: "Missing fields", description: "Subject and title are required.", variant: "destructive" });
      return;
    }
    const data = {
      subjectId: Number(form.subjectId),
      title: form.title,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : undefined,
      durationMinutes: Number(form.durationMinutes) || 60,
      totalMarks: Number(form.totalMarks) || 100,
      questionUrl: form.questionUrl || undefined,
      startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
    };
    const onSuccess = () => {
      toast({ title: editing ? "Exam updated" : "Exam created" });
      qc.invalidateQueries();
      setOpen(false);
    };
    const onError = () => toast({ title: "Error", description: "Could not save exam.", variant: "destructive" });
    if (editing) {
      updateExam.mutate({ id: editing.id, data }, { onSuccess, onError });
    } else {
      createExam.mutate({ data }, { onSuccess, onError });
    }
  };

  const handleDelete = (e: Exam) => {
    if (!confirm(`Delete exam "${e.title}"? This removes its submissions and results.`)) return;
    deleteExam.mutate(
      { id: e.id },
      {
        onSuccess: () => {
          toast({ title: "Exam deleted" });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error", description: "Could not delete.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Exams"
        description="Schedule exams, collect answer sheets, enter marks and publish results."
        action={<Button onClick={openCreate}>Add Exam</Button>}
      />

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Course</Label>
        <Select value={courseFilter} onValueChange={setCourseFilter}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {(courses ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingCard />
      ) : !exams || exams.length === 0 ? (
        <EmptyCard message="No exams scheduled. Create your first exam." />
      ) : visibleExams.length === 0 ? (
        <EmptyCard message="No exams for this course." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Total Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleExams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>{courseLabel(e.subjectId)}</TableCell>
                    <TableCell>{subjectLabel(e.subjectId)}</TableCell>
                    <TableCell>{new Date(e.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell>{e.durationMinutes} min</TableCell>
                    <TableCell>{e.totalMarks}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" onClick={() => setManaging(e)}>
                          <ClipboardCheck className="w-4 h-4 mr-2" /> Marks
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Exam" : "Add Exam"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={form.courseId} onValueChange={(v) => setForm({ ...form, courseId: v, subjectId: "" })}>
                <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                <SelectContent>
                  {(courses ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })} disabled={!form.courseId}>
                <SelectTrigger><SelectValue placeholder={form.courseId ? "Select a subject" : "Select a course first"} /></SelectTrigger>
                <SelectContent>
                  {formSubjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Scheduled</Label>
                <Input id="scheduledAt" type="datetime-local" value={form.scheduledAt} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (min)</Label>
                <Input id="duration" type="number" min="1" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startsAt">Window opens</Label>
                <Input id="startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endsAt">Window closes</Label>
                <Input id="endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalMarks">Total Marks</Label>
              <Input id="totalMarks" type="number" min="1" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Question Paper (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              {form.questionUrl && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Attached
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createExam.isPending || updateExam.isPending || isUploading}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {managing && <MarksDialog exam={managing} onClose={() => setManaging(null)} />}
    </div>
  );
}

function MarksDialog({ exam, onClose }: { exam: Exam; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: submissions, isLoading } = useListExamSubmissionsForExam(exam.id);
  const { data: allResults } = useListResults();
  const createResult = useCreateResult();
  const publishResults = usePublishExamResults();

  const resultByUser = new Map(
    (allResults ?? []).filter((r) => r.examId === exam.id).map((r) => [r.userId, r]),
  );

  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [score, setScore] = useState("");
  const [grade, setGrade] = useState("");
  const [passed, setPassed] = useState(false);
  const [remarks, setRemarks] = useState("");

  const openEntry = (userId: number) => {
    const existing = resultByUser.get(userId);
    setEditingUser(userId);
    setScore(existing ? String(existing.score) : "");
    setGrade(existing?.grade ?? "");
    setPassed(existing?.passed ?? false);
    setRemarks(existing?.remarks ?? "");
  };

  const saveEntry = () => {
    if (editingUser == null) return;
    createResult.mutate(
      {
        data: {
          userId: editingUser,
          examId: exam.id,
          score: Number(score) || 0,
          grade: grade || undefined,
          passed,
          remarks: remarks || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Marks saved" });
          qc.invalidateQueries();
          setEditingUser(null);
        },
        onError: () => toast({ title: "Error", description: "Could not save marks.", variant: "destructive" }),
      },
    );
  };

  const handlePublish = () => {
    if (!confirm("Publish all results for this exam? Students will be notified by email.")) return;
    publishResults.mutate(
      { id: exam.id },
      {
        onSuccess: () => {
          toast({ title: "Results published", description: "Students have been notified." });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error", description: "Could not publish results.", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Marks — {exam.title}</span>
            <Button size="sm" onClick={handlePublish} disabled={publishResults.isPending}>
              <Send className="w-4 h-4 mr-2" /> Publish results
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <LoadingCard />
        ) : !submissions || submissions.length === 0 ? (
          <EmptyCard message="No answer submissions yet." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Answer</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => {
                  const r = resultByUser.get(s.userId);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.studentName ?? `#${s.userId}`}</p>
                          {s.studentId && (
                            <p className="text-xs text-muted-foreground font-mono">{s.studentId}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={s.status} /></TableCell>
                      <TableCell>
                        {s.fileUrl ? (
                          <a className="text-primary underline" href={`/api/storage/objects/${s.fileUrl.replace(/^\/objects\//, "")}`} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{r ? `${r.score}/${exam.totalMarks}` : "—"}</TableCell>
                      <TableCell>
                        {r ? (
                          <Badge variant="secondary" className={r.published ? "bg-green-100 text-green-800 border-0" : "bg-amber-100 text-amber-800 border-0"}>
                            {r.published ? "Published" : "Draft"}
                          </Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openEntry(s.userId)}>
                          {r ? "Edit" : "Enter"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={editingUser != null} onOpenChange={(o) => !o && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Enter marks — Student #{editingUser}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="score">Score (out of {exam.totalMarks})</Label>
                  <Input id="score" type="number" min="0" max={exam.totalMarks} value={score} onChange={(e) => setScore(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input id="grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="A, B+, ..." />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="passed" checked={passed} onCheckedChange={(v) => setPassed(v === true)} />
                <Label htmlFor="passed">Passed</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
              <Button onClick={saveEntry} disabled={createResult.isPending}>Save marks</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
