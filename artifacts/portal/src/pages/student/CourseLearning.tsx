import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "wouter";
import {
  useListCourses,
  useListSubjects,
  useListMaterials,
  useGetCourseAccess,
  useListProgress,
  useRecordProgress,
  useListEnrollments,
  useCreatePaypalOrder,
  useCapturePaypalOrder,
  type Subject,
  type StudyMaterial,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Video,
  FileText,
  LinkIcon,
  BookOpen,
  CheckCircle2,
  Download,
  Lock,
  PlayCircle,
  Sparkles,
  Loader2,
} from "lucide-react";

function mediaUrl(url: string) {
  return url.startsWith("http") ? url : `/api/storage${url}`;
}

function typeIcon(type: string) {
  if (type === "video") return <Video className="w-4 h-4" />;
  if (type === "pdf") return <FileText className="w-4 h-4" />;
  if (type === "link") return <LinkIcon className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
}

function appUrl(courseId: number) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");
  return `${window.location.origin}${base}/portal/learning/${courseId}`;
}

export default function StudentCourseLearning() {
  const params = useParams();
  const courseId = Number(params.id);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: courses } = useListCourses();
  const course = (courses ?? []).find((c) => c.id === courseId);
  const { data: access, isLoading: accessLoading } = useGetCourseAccess(courseId);
  const { data: subjects, isLoading: subjectsLoading } =
    useListSubjects(courseId);
  const { data: enrollments } = useListEnrollments();
  const enrollment = (enrollments ?? []).find((e) => e.courseId === courseId);

  const hasAccess = access?.hasAccess ?? false;
  const { data: progress } = useListProgress({ courseId });
  const completedSet = new Set((progress ?? []).map((p) => p.materialId));

  const createOrder = useCreatePaypalOrder();
  const captureOrder = useCapturePaypalOrder();
  const record = useRecordProgress();

  const [selected, setSelected] = useState<StudyMaterial | null>(null);

  // Capture a PayPal order when returning from approval (?token=ORDER_ID).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const token = sp.get("token");
    if (!token) return;
    window.history.replaceState({}, "", window.location.pathname);
    captureOrder.mutate(
      { data: { orderId: token } },
      {
        onSuccess: () => {
          toast({
            title: "Payment successful",
            description: "You now have full access to this course.",
          });
          qc.invalidateQueries();
        },
        onError: () =>
          toast({
            title: "Payment not completed",
            description: "We could not confirm your payment.",
            variant: "destructive",
          }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = () => {
    createOrder.mutate(
      {
        data: {
          courseId,
          returnUrl: appUrl(courseId),
          cancelUrl: appUrl(courseId),
        },
      },
      {
        onSuccess: (res) => {
          window.location.href = res.approveUrl;
        },
        onError: (err) => {
          const msg =
            err instanceof Error ? err.message : "Could not start checkout.";
          toast({
            title: "Checkout unavailable",
            description: msg.includes("not configured")
              ? "Online payment is not configured yet. Please contact the bursar."
              : msg,
            variant: "destructive",
          });
        },
      },
    );
  };

  const grouped = groupByYearSemester(subjects ?? []);

  if (accessLoading || subjectsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/portal/learning">
          <ArrowLeft className="w-4 h-4 mr-2" /> My Learning
        </Link>
      </Button>

      <PageHeader
        title={course?.title ?? "Course"}
        description={course?.description ?? "Course content and lectures."}
      />

      {hasAccess && (
        <Card className="rounded-2xl">
          <CardContent className="py-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your progress</span>
              <span className="font-medium">{enrollment?.progress ?? 0}%</span>
            </div>
            <Progress value={enrollment?.progress ?? 0} />
          </CardContent>
        </Card>
      )}

      {!hasAccess ? (
        <Card className="rounded-2xl border-primary/30">
          <CardContent className="py-12 flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="font-serif text-2xl font-semibold">
                Unlock this course
              </h3>
              <p className="text-muted-foreground mt-1">
                Complete your tuition payment to access all lectures and study
                materials.
              </p>
            </div>
            <div className="text-3xl font-bold text-primary">
              ${access?.price.toLocaleString()}
            </div>
            <Button
              size="lg"
              onClick={handlePay}
              disabled={createOrder.isPending}
            >
              {createOrder.isPending ? "Starting checkout…" : "Pay with PayPal"}
            </Button>
            <p className="text-xs text-muted-foreground">
              You will be redirected to PayPal to complete your payment securely.
            </p>
          </CardContent>
        </Card>
      ) : !subjects || subjects.length === 0 ? (
        <EmptyCard message="No content has been published for this course yet." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-6">
            {grouped.map(({ year, semesters }) => (
              <div key={year} className="space-y-3">
                <h2 className="font-serif text-lg font-semibold">Year {year}</h2>
                {semesters.map(({ semester, items }) => (
                  <div key={semester} className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Semester {semester}
                    </h3>
                    <Accordion type="multiple" className="space-y-2">
                      {items.map((s) => (
                        <AccordionItem
                          key={s.id}
                          value={String(s.id)}
                          className="border rounded-xl px-3"
                        >
                          <AccordionTrigger className="hover:no-underline text-sm font-medium">
                            {s.title}
                          </AccordionTrigger>
                          <AccordionContent>
                            <SubjectMaterials
                              subjectId={s.id}
                              selectedId={selected?.id}
                              completedSet={completedSet}
                              onSelect={setSelected}
                            />
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <MaterialViewer
            material={selected}
            completed={selected ? completedSet.has(selected.id) : false}
            onComplete={(m, action) => {
              recordAndRefresh(m, action);
            }}
          />
        </div>
      )}
    </div>
  );

  function recordAndRefresh(
    m: StudyMaterial,
    action: "watched" | "downloaded" | "completed",
  ) {
    record.mutate(
      { data: { materialId: m.id, action } },
      {
        onSuccess: () => {
          if (action !== "downloaded")
            toast({ title: "Progress saved", description: `${m.title} marked complete.` });
          qc.invalidateQueries();
        },
      },
    );
  }
}

function groupByYearSemester(subjects: Subject[]) {
  const years = new Map<number, Map<number, Subject[]>>();
  for (const s of subjects) {
    if (!years.has(s.year)) years.set(s.year, new Map());
    const sems = years.get(s.year)!;
    if (!sems.has(s.semester)) sems.set(s.semester, []);
    sems.get(s.semester)!.push(s);
  }
  return Array.from(years.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, sems]) => ({
      year,
      semesters: Array.from(sems.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([semester, items]) => ({
          semester,
          items: items.sort((a, b) => a.orderIndex - b.orderIndex),
        })),
    }));
}

function SubjectMaterials({
  subjectId,
  selectedId,
  completedSet,
  onSelect,
}: {
  subjectId: number;
  selectedId?: number;
  completedSet: Set<number>;
  onSelect: (m: StudyMaterial) => void;
}) {
  const { data: materials, isLoading } = useListMaterials(subjectId);
  if (isLoading)
    return <p className="text-xs text-muted-foreground py-1">Loading…</p>;
  const sorted = (materials ?? [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);
  if (sorted.length === 0)
    return <p className="text-xs text-muted-foreground py-1">No materials.</p>;
  return (
    <ul className="space-y-1">
      {sorted.map((m) => {
        const done = completedSet.has(m.id);
        const active = selectedId === m.id;
        return (
          <li key={m.id}>
            <button
              onClick={() => onSelect(m)}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                active ? "bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              <span className="text-muted-foreground">
                {done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  typeIcon(m.type)
                )}
              </span>
              <span className="truncate flex-1">{m.title}</span>
              {m.durationMinutes ? (
                <span className="text-xs text-muted-foreground shrink-0">
                  {m.durationMinutes}m
                </span>
              ) : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function MaterialViewer({
  material,
  completed,
  onComplete,
}: {
  material: StudyMaterial | null;
  completed: boolean;
  onComplete: (
    m: StudyMaterial,
    action: "watched" | "downloaded" | "completed",
  ) => void;
}) {
  if (!material) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="py-24 flex flex-col items-center text-center gap-3 text-muted-foreground">
          <PlayCircle className="w-12 h-12" />
          <p>Select a lesson from the curriculum to begin.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-serif text-xl">{material.title}</CardTitle>
          <Badge variant="secondary" className="capitalize">
            {material.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {material.type === "video" && material.url && (
          <video
            key={material.id}
            controls
            className="w-full rounded-xl bg-black aspect-video"
            src={mediaUrl(material.url)}
          />
        )}

        {material.type === "pdf" && material.url && (
          <iframe
            key={material.id}
            title={material.title}
            src={mediaUrl(material.url)}
            className="w-full rounded-xl border h-[480px]"
          />
        )}

        {material.type === "text" && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground">
            {material.content || "No content provided."}
          </div>
        )}

        {material.type === "link" && material.url && (
          <a
            href={material.url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline break-all"
          >
            {material.url}
          </a>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {(material.type === "pdf" ||
            material.type === "link" ||
            material.type === "video") &&
            material.url && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={
                    material.type === "link"
                      ? material.url
                      : mediaUrl(material.url)
                  }
                  target="_blank"
                  rel="noreferrer"
                  download={material.type !== "link"}
                  onClick={() => onComplete(material, "downloaded")}
                >
                  <Download className="w-4 h-4 mr-2" /> Download
                </a>
              </Button>
            )}

          <Button
            size="sm"
            disabled={completed}
            onClick={() => onComplete(material, "completed")}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {completed ? "Completed" : "Mark as complete"}
          </Button>
        </div>

        <LessonExplainer material={material} />
      </CardContent>
    </Card>
  );
}

type ExplainMode = "explain" | "simpler" | "example" | "summary" | "quiz";

const FOLLOW_UPS: { mode: ExplainMode; label: string }[] = [
  { mode: "simpler", label: "Explain more simply" },
  { mode: "example", label: "Give an example" },
  { mode: "summary", label: "Summarize key points" },
  { mode: "quiz", label: "Quiz me on this" },
];

function LessonExplainer({ material }: { material: StudyMaterial }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset the panel whenever the student switches lessons.
  useEffect(() => {
    abortRef.current?.abort();
    setOpen(false);
    setText("");
    setError(null);
    setStreaming(false);
  }, [material.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [text]);

  // Abort any in-flight stream when the viewer unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function explain(mode: ExplainMode) {
    if (streaming) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setOpen(true);
    setText("");
    setError(null);
    setStreaming(true);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({ materialId: material.id, mode }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";

        for (const event of events) {
          const line = event.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.content) {
              setText((prev) => prev + parsed.content);
            } else if (parsed.error) {
              setError(parsed.error);
            }
          } catch {
            // Ignore malformed chunks.
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError(
        "Sorry, the explanation is unavailable right now. Please try again.",
      );
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5">
      {!open ? (
        <div className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              Stuck? Let the AI tutor break this lesson down for you.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => void explain("explain")}
            className="shrink-0"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Explain this lesson
          </Button>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Sparkles className="w-4 h-4" /> AI explanation
          </div>

          <div
            ref={scrollRef}
            className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-background/70 p-3 text-sm text-foreground"
          >
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : text ? (
              text
            ) : (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
              </span>
            )}
            {streaming && text && (
              <Loader2 className="ml-1 inline w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {FOLLOW_UPS.map((f) => (
              <Button
                key={f.mode}
                variant="outline"
                size="sm"
                disabled={streaming}
                onClick={() => void explain(f.mode)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
