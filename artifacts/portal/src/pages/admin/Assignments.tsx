import { useState } from "react";
import {
  useListAssignments,
  useCreateAssignment,
  useUpdateAssignment,
  useDeleteAssignment,
  useListAssignmentSubmissions,
  useGradeSubmission,
  useListAllSubjects,
  useListCourses,
  type Assignment,
  type Submission,
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
import { StatusBadge } from "@/components/common/StatusBadge";
import { ApprovalBadge } from "@/components/common/ApprovalBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, ClipboardList, Download, FileText } from "lucide-react";

interface AssignmentForm {
  courseId: string;
  subjectId: string;
  title: string;
  description: string;
  instructionsUrl: string;
  dueDate: string;
  maxScore: string;
}

const empty: AssignmentForm = {
  courseId: "",
  subjectId: "",
  title: "",
  description: "",
  instructionsUrl: "",
  dueDate: "",
  maxScore: "7.5",
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function AdminAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useListAssignments();
  const { data: subjects } = useListAllSubjects();
  const { data: courses } = useListCourses();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(empty);
  const [errors, setErrors] = useState<Partial<Record<"courseId" | "subjectId" | "title" | "dueDate", boolean>>>({});
  const [gradingFor, setGradingFor] = useState<Assignment | null>(null);
  const [courseFilter, setCourseFilter] = useState<string>("all");

  const { uploadFile, isUploading } = useUpload();

  const subjectLabel = (id: number) => {
    const s = subjects?.find((x) => x.id === id);
    return s ? s.title : `Subject #${id}`;
  };
  const courseIdOfSubject = (subjectId: number) =>
    subjects?.find((s) => s.id === subjectId)?.courseId;
  const courseLabel = (subjectId: number) => {
    const cid = courseIdOfSubject(subjectId);
    const c = courses?.find((x) => x.id === cid);
    return c ? c.title : "—";
  };
  const formSubjects = (subjects ?? []).filter(
    (s) => form.courseId && s.courseId === Number(form.courseId),
  );
  const visibleAssignments = (assignments ?? []).filter(
    (a) => courseFilter === "all" || courseIdOfSubject(a.subjectId) === Number(courseFilter),
  );

  const openCreate = () => {
    setEditing(null);
    const autoCourse = courses?.length === 1 ? String(courses[0].id) : "";
    setForm({ ...empty, courseId: autoCourse });
    setErrors({});
    setOpen(true);
  };
  const openEdit = (a: Assignment) => {
    setEditing(a);
    setForm({
      courseId: String(courseIdOfSubject(a.subjectId) ?? ""),
      subjectId: String(a.subjectId),
      title: a.title,
      description: a.description ?? "",
      instructionsUrl: a.instructionsUrl ?? "",
      dueDate: toLocalInput(a.dueDate),
      maxScore: String(a.maxScore),
    });
    setErrors({});
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    const res = await uploadFile(file);
    if (res) {
      setForm((f) => ({ ...f, instructionsUrl: res.objectPath }));
      toast({ title: "File uploaded", description: file.name });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const handleSave = () => {
    const newErrors: typeof errors = {
      courseId: !form.courseId,
      subjectId: !form.subjectId,
      title: !form.title.trim(),
      dueDate: !form.dueDate,
    };
    if (Object.values(newErrors).some(Boolean)) {
      setErrors(newErrors);
      toast({ title: "Missing fields", description: "Please fill in all highlighted fields.", variant: "destructive" });
      return;
    }
    setErrors({});
    const data = {
      subjectId: Number(form.subjectId),
      title: form.title,
      description: form.description || undefined,
      instructionsUrl: form.instructionsUrl || undefined,
      dueDate: new Date(form.dueDate).toISOString(),
      maxScore: Number(form.maxScore) || 7.5,
    };
    const onSuccess = () => {
      toast({ title: editing ? "Assignment updated" : "Assignment created" });
      qc.invalidateQueries();
      setOpen(false);
    };
    const onError = () => toast({ title: "Error", description: "Could not save assignment.", variant: "destructive" });
    if (editing) {
      updateAssignment.mutate({ id: editing.id, data }, { onSuccess, onError });
    } else {
      createAssignment.mutate({ data }, { onSuccess, onError });
    }
  };

  const handleDelete = (a: Assignment) => {
    if (!confirm(`Delete assignment "${a.title}"? This removes all student submissions.`)) return;
    deleteAssignment.mutate(
      { id: a.id },
      {
        onSuccess: () => {
          toast({ title: "Assignment deleted" });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error", description: "Could not delete.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments"
        description="Create assignments, set deadlines, and grade student submissions."
        action={<Button onClick={openCreate}>Add Assignment</Button>}
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
      ) : !assignments || assignments.length === 0 ? (
        <EmptyCard message="No assignments yet. Create your first assignment." />
      ) : visibleAssignments.length === 0 ? (
        <EmptyCard message="No assignments for this course." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Max Score (ECTS)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAssignments.map((a) => {
                  const overdue = new Date(a.dueDate).getTime() < Date.now();
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{courseLabel(a.subjectId)}</TableCell>
                      <TableCell>{subjectLabel(a.subjectId)}</TableCell>
                      <TableCell>
                        {new Date(a.dueDate).toLocaleString()}
                        {overdue && <span className="ml-2 text-xs text-destructive">closed</span>}
                      </TableCell>
                      <TableCell>{a.maxScore}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => setGradingFor(a)}>
                            <ClipboardList className="w-4 h-4 mr-2" /> Submissions
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(a)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Assignment" : "Add Assignment"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course <span className="text-destructive">*</span></Label>
              <Select
                value={form.courseId}
                onValueChange={(v) => {
                  setForm({ ...form, courseId: v, subjectId: "" });
                  setErrors((e) => ({ ...e, courseId: false, subjectId: false }));
                }}
              >
                <SelectTrigger className={errors.courseId ? "border-destructive ring-1 ring-destructive" : ""}>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {(courses ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subject <span className="text-destructive">*</span></Label>
              <Select
                value={form.subjectId}
                onValueChange={(v) => {
                  setForm({ ...form, subjectId: v });
                  setErrors((e) => ({ ...e, subjectId: false }));
                }}
                disabled={!form.courseId}
              >
                <SelectTrigger className={errors.subjectId ? "border-destructive ring-1 ring-destructive" : ""}>
                  <SelectValue placeholder={form.courseId ? "Select a subject" : "Pick a course above first"} />
                </SelectTrigger>
                <SelectContent>
                  {formSubjects.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={form.title}
                className={errors.title ? "border-destructive ring-1 ring-destructive" : ""}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (e.target.value.trim()) setErrors((er) => ({ ...er, title: false }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date <span className="text-destructive">*</span></Label>
                <Input
                  id="dueDate"
                  type="datetime-local"
                  value={form.dueDate}
                  className={errors.dueDate ? "border-destructive ring-1 ring-destructive" : ""}
                  onChange={(e) => {
                    setForm({ ...form, dueDate: e.target.value });
                    if (e.target.value) setErrors((er) => ({ ...er, dueDate: false }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score (ECTS)</Label>
                <Input id="maxScore" type="number" min="0.5" step="any" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Instructions (PDF)</Label>
              <Input
                type="file"
                accept="application/pdf"
                disabled={isUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              {form.instructionsUrl && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Attached
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createAssignment.isPending || updateAssignment.isPending || isUploading}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {gradingFor && (
        <SubmissionsDialog assignment={gradingFor} onClose={() => setGradingFor(null)} />
      )}
    </div>
  );
}

function SubmissionsDialog({ assignment, onClose }: { assignment: Assignment; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: submissions, isLoading } = useListAssignmentSubmissions(assignment.id);
  const gradeSubmission = useGradeSubmission();

  const [grading, setGrading] = useState<Submission | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");

  const openGrade = (s: Submission) => {
    setGrading(s);
    setScore(s.score != null ? String(s.score) : "");
    setFeedback(s.feedback ?? "");
  };

  const submitGrade = () => {
    if (!grading) return;
    gradeSubmission.mutate(
      { id: grading.id, data: { score: Number(score) || 0, feedback: feedback || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Graded", description: "The student has been notified by email." });
          qc.invalidateQueries();
          setGrading(null);
        },
        onError: () => toast({ title: "Error", description: "Could not save grade.", variant: "destructive" }),
      },
    );
  };

  const setApproval = (s: Submission, approvalStatus: "approved" | "needs_revision" | "pending") => {
    gradeSubmission.mutate(
      { id: s.id, data: { approvalStatus } },
      {
        onSuccess: () => {
          toast({
            title: approvalStatus === "approved" ? "Approved" : approvalStatus === "needs_revision" ? "Sent back for revision" : "Reset to pending",
          });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error", description: "Could not update approval.", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-4">
            <span>Submissions — {assignment.title}</span>
            <Button variant="outline" size="sm" asChild>
              <a href={`/api/assignments/${assignment.id}/submissions/download`} target="_blank" rel="noreferrer">
                <Download className="w-4 h-4 mr-2" /> Download all
              </a>
            </Button>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <LoadingCard />
        ) : !submissions || submissions.length === 0 ? (
          <EmptyCard message="No submissions yet." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approval</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Work</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
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
                    <TableCell><ApprovalBadge status={s.approvalStatus} /></TableCell>
                    <TableCell>{s.score != null ? `${s.score}/${assignment.maxScore}` : "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {s.fileUrl && (
                          <a className="text-primary underline" href={`/api/storage/objects/${s.fileUrl.replace(/^\/objects\//, "")}`} target="_blank" rel="noreferrer">
                            PDF
                          </a>
                        )}
                        {s.textContent && (
                          <span className="text-sm text-muted-foreground">
                            Typed{s.wordCount != null ? ` · ${s.wordCount.toLocaleString()} words` : ""}
                          </span>
                        )}
                        {!s.fileUrl && !s.textContent && "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openGrade(s)}>Grade</Button>
                        {s.approvalStatus !== "approved" && (
                          <Button size="sm" onClick={() => setApproval(s, "approved")} disabled={gradeSubmission.isPending}>
                            Approve
                          </Button>
                        )}
                        {s.approvalStatus !== "needs_revision" && (
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setApproval(s, "needs_revision")} disabled={gradeSubmission.isPending}>
                            Needs revision
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!grading} onOpenChange={(o) => !o && setGrading(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>Grade submission</DialogTitle></DialogHeader>
            <div className="space-y-4">
              {grading?.textContent && (
                <div className="space-y-2">
                  <Label>
                    Typed work
                    {grading.wordCount != null && (
                      <span className="ml-2 font-normal text-muted-foreground">{grading.wordCount.toLocaleString()} words</span>
                    )}
                  </Label>
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                    {grading.textContent}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="score">Score (out of {assignment.maxScore})</Label>
                <Input id="score" type="number" min="0" step="any" max={assignment.maxScore} value={score} onChange={(e) => setScore(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback</Label>
                <Textarea id="feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Comments for the student" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setGrading(null)}>Cancel</Button>
              <Button onClick={submitGrade} disabled={gradeSubmission.isPending}>Save grade</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
