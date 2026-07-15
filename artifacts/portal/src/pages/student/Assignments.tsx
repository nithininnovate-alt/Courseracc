import { useEffect, useMemo, useRef, useState } from "react";
import {
  useListAssignments,
  useListSubmissions,
  useCreateSubmission,
  useSaveSubmissionDraft,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { FileText, Download, PenLine, CheckCircle2, CloudUpload } from "lucide-react";
import type { Assignment, Submission } from "@workspace/api-client-react";

function storageHref(objectPath: string): string {
  return `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
}

interface AssignmentSpec {
  format?: string;
  weight?: string;
  task?: string;
  benchmarks: string[];
}

/**
 * Parse the seeded assignment description into its official syllabus
 * sections. Falls back to a plain task text when the structure is absent.
 */
function parseSpec(description: string | null | undefined): AssignmentSpec {
  if (!description) return { benchmarks: [] };
  const spec: AssignmentSpec = { benchmarks: [] };
  const headerMatch = description.match(
    /^Format:\s*(.+?)\s*\|\s*Weight \/ Length:\s*(.+?)$/m,
  );
  if (headerMatch) {
    spec.format = headerMatch[1];
    spec.weight = headerMatch[2];
  }
  const taskMatch = description.match(
    /Assignment Task:\n([\s\S]*?)(?:\n\nEvaluation Benchmarks:|$)/,
  );
  if (taskMatch) spec.task = taskMatch[1].trim();
  const benchMatch = description.match(/Evaluation Benchmarks:\n([\s\S]*)$/);
  if (benchMatch) {
    spec.benchmarks = benchMatch[1]
      .split("\n")
      .map((l) => l.replace(/^•\s*/, "").trim())
      .filter(Boolean);
  }
  if (!spec.format && !spec.task) spec.task = description.trim();
  return spec;
}

/** Extract the numeric word target (e.g. 1500 from "100% / 1,500 Words"). */
function wordTarget(weight: string | undefined): number | null {
  if (!weight) return null;
  const m = weight.match(/([\d,]+)\s*Words/i);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function StudentAssignments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useListAssignments();
  const { data: submissions } = useListSubmissions();

  const [active, setActive] = useState<Assignment | null>(null);

  const submissionByAssignment = useMemo(
    () => new Map((submissions ?? []).map((s) => [s.assignmentId, s])),
    [submissions],
  );

  const openWorkspace = (a: Assignment) => {
    if (new Date(a.dueDate).getTime() < Date.now()) {
      toast({ title: "Deadline passed", description: "This assignment is closed for submissions.", variant: "destructive" });
      return;
    }
    setActive(a);
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Assignments" description="Complete your coursework online or upload your work, and track grades." />

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
                  const isDraft = sub?.status === "draft";
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
                        {sub ? (
                          isDraft ? (
                            <span className="text-amber-600 text-sm font-medium">Draft saved</span>
                          ) : (
                            <StatusBadge status={sub.status} />
                          )
                        ) : (
                          <span className="text-muted-foreground text-sm">Not started</span>
                        )}
                        {sub?.score != null && <span className="ml-2 text-sm font-medium">{sub.score}/{a.maxScore}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={sub && !isDraft ? "outline" : "default"}
                          disabled={overdue}
                          onClick={() => openWorkspace(a)}
                        >
                          <PenLine className="w-3.5 h-3.5 mr-1.5" />
                          {overdue ? "Closed" : sub ? (isDraft ? "Continue" : "Resubmit") : "Start"}
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

      {active && (
        <WorkspaceDialog
          assignment={active}
          submission={submissionByAssignment.get(active.id)}
          onClose={() => {
            setActive(null);
            qc.invalidateQueries();
          }}
        />
      )}
    </div>
  );
}

function WorkspaceDialog({
  assignment,
  submission,
  onClose,
}: {
  assignment: Assignment;
  submission: Submission | undefined;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const createSubmission = useCreateSubmission();
  const saveDraft = useSaveSubmissionDraft();
  const { uploadFile, isUploading } = useUpload();

  const spec = useMemo(() => parseSpec(assignment.description), [assignment.description]);
  const target = wordTarget(spec.weight);

  const alreadySubmitted = !!submission && submission.status !== "draft";
  const [text, setText] = useState(submission?.textContent ?? "");
  const [note, setNote] = useState(submission?.note ?? "");
  const [fileUrl, setFileUrl] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [confirming, setConfirming] = useState(false);

  const words = countWords(text);

  // Debounced autosave — drafts only; never autosave over a submitted work.
  const latest = useRef({ text, note });
  latest.current = { text, note };
  const dirty = useRef(false);
  useEffect(() => {
    if (alreadySubmitted) return;
    if (!dirty.current) return;
    const t = setTimeout(() => {
      if (!latest.current.text.trim()) return;
      setSaveState("saving");
      saveDraft.mutate(
        { data: { assignmentId: assignment.id, textContent: latest.current.text, note: latest.current.note || undefined } },
        {
          onSuccess: () => setSaveState("saved"),
          onError: () => setSaveState("idle"),
        },
      );
    }, 1500);
    return () => clearTimeout(t);
  }, [text, note, alreadySubmitted, assignment.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (file: File) => {
    const res = await uploadFile(file);
    if (res) {
      setFileUrl(res.objectPath);
      toast({ title: "File uploaded", description: file.name });
    } else {
      toast({ title: "Upload failed", variant: "destructive" });
    }
  };

  const doSubmit = () => {
    const hasText = text.trim().length > 0;
    if (!hasText && !fileUrl) {
      toast({ title: "Nothing to submit", description: "Type your work or upload a PDF first.", variant: "destructive" });
      return;
    }
    createSubmission.mutate(
      {
        data: {
          assignmentId: assignment.id,
          textContent: hasText ? text : undefined,
          fileUrl: fileUrl || undefined,
          note: note || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Submitted", description: "Your assignment was submitted for grading." });
          qc.invalidateQueries();
          setConfirming(false);
          onClose();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not submit. The deadline may have passed.", variant: "destructive" }),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="pr-8">{assignment.title}</DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-[minmax(260px,340px)_1fr] gap-4 flex-1 min-h-0">
          {/* Official spec panel */}
          <div className="overflow-y-auto rounded-xl border bg-muted/30 p-4 space-y-4 text-sm">
            <h3 className="font-serif font-bold text-primary">Official Assignment Specification</h3>
            {spec.format && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Format</p>
                <p className="font-medium">{spec.format}</p>
              </div>
            )}
            {spec.weight && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Weight / Length</p>
                <p className="font-medium">{spec.weight}</p>
              </div>
            )}
            {spec.task && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Assignment Task</p>
                <p className="whitespace-pre-wrap">{spec.task}</p>
              </div>
            )}
            {spec.benchmarks.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Evaluation Benchmarks</p>
                <ul className="list-disc pl-4 space-y-1">
                  {spec.benchmarks.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Due {new Date(assignment.dueDate).toLocaleString()} · Max score {assignment.maxScore}
            </p>
          </div>

          {/* Work area */}
          <Tabs defaultValue="type" className="flex flex-col min-h-0">
            <TabsList className="self-start">
              <TabsTrigger value="type"><PenLine className="w-3.5 h-3.5 mr-1.5" />Type your work</TabsTrigger>
              <TabsTrigger value="upload"><CloudUpload className="w-3.5 h-3.5 mr-1.5" />Upload PDF</TabsTrigger>
            </TabsList>

            <TabsContent value="type" className="flex-1 flex flex-col min-h-0 mt-3 space-y-2 data-[state=inactive]:hidden">
              <Textarea
                value={text}
                onChange={(e) => {
                  dirty.current = true;
                  setSaveState("idle");
                  setText(e.target.value);
                }}
                placeholder="Start writing your assignment here…"
                className="flex-1 min-h-[280px] resize-none font-serif text-[15px] leading-7"
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {words.toLocaleString()} words
                  {target ? ` / target ${target.toLocaleString()}` : ""}
                  {target && words >= target && (
                    <CheckCircle2 className="inline w-3.5 h-3.5 ml-1 text-green-600" />
                  )}
                </span>
                <span>
                  {alreadySubmitted
                    ? "Editing a submitted assignment — changes are saved only when you resubmit."
                    : saveState === "saving"
                      ? "Saving draft…"
                      : saveState === "saved"
                        ? "Draft saved"
                        : "Autosaves as you type"}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="upload" className="mt-3 space-y-4 data-[state=inactive]:hidden">
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
            </TabsContent>

            <div className="mt-3 space-y-2">
              <Label htmlFor="ws-note">Note to instructor (optional)</Label>
              <Textarea
                id="ws-note"
                value={note}
                onChange={(e) => {
                  dirty.current = true;
                  setNote(e.target.value);
                }}
                rows={2}
              />
            </div>
          </Tabs>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={() => setConfirming(true)} disabled={createSubmission.isPending || isUploading}>
            {alreadySubmitted ? "Resubmit" : "Submit for grading"}
          </Button>
        </DialogFooter>

        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit assignment?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {alreadySubmitted
                ? "This replaces your previous submission and resets any grade already given."
                : "Your work will be sent to the Registrar's office for grading."}
              {text.trim() && <> Typed work: {words.toLocaleString()} words.</>}
              {fileUrl && <> PDF attached.</>}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>Keep editing</Button>
              <Button onClick={doSubmit} disabled={createSubmission.isPending}>
                {createSubmission.isPending ? "Submitting…" : "Confirm & submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
