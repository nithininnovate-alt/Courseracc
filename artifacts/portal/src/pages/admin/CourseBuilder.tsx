import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useListCourses,
  useListSubjects,
  useCreateSubject,
  useUpdateSubject,
  useDeleteSubject,
  useListMaterials,
  useCreateMaterial,
  useUpdateMaterial,
  useDeleteMaterial,
  MaterialInputType,
  type Subject,
  type StudyMaterial,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload } from "@workspace/object-storage-web";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Video,
  FileText,
  LinkIcon,
  BookOpen,
} from "lucide-react";

const MATERIAL_TYPES = Object.values(MaterialInputType);

function typeIcon(type: string) {
  if (type === "video") return <Video className="w-4 h-4" />;
  if (type === "pdf") return <FileText className="w-4 h-4" />;
  if (type === "link") return <LinkIcon className="w-4 h-4" />;
  return <BookOpen className="w-4 h-4" />;
}

interface SubjectForm {
  title: string;
  description: string;
  year: string;
  semester: string;
  orderIndex: string;
}

const emptySubject: SubjectForm = {
  title: "",
  description: "",
  year: "1",
  semester: "1",
  orderIndex: "1",
};

export default function AdminCourseBuilder() {
  const params = useParams();
  const courseId = Number(params.id);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: courses } = useListCourses();
  const course = (courses ?? []).find((c) => c.id === courseId);
  const { data: subjects, isLoading } = useListSubjects(courseId);

  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const deleteSubject = useDeleteSubject();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>(emptySubject);

  const openCreate = () => {
    setEditing(null);
    setForm(emptySubject);
    setOpen(true);
  };
  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({
      title: s.title,
      description: s.description ?? "",
      year: String(s.year),
      semester: String(s.semester),
      orderIndex: String(s.orderIndex),
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const data = {
      title: form.title,
      description: form.description || undefined,
      year: Number(form.year) || 1,
      semester: Number(form.semester) || 1,
      orderIndex: Number(form.orderIndex) || 1,
    };
    const onSuccess = () => {
      toast({ title: editing ? "Subject updated" : "Subject added" });
      qc.invalidateQueries();
      setOpen(false);
    };
    const onError = () =>
      toast({ title: "Error saving subject", variant: "destructive" });

    if (editing) {
      updateSubject.mutate({ id: editing.id, data }, { onSuccess, onError });
    } else {
      createSubject.mutate({ courseId, data }, { onSuccess, onError });
    }
  };

  const handleDelete = (s: Subject) => {
    if (!confirm(`Delete subject "${s.title}" and all its materials?`)) return;
    deleteSubject.mutate(
      { id: s.id },
      {
        onSuccess: () => {
          toast({ title: "Subject deleted" });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error deleting", variant: "destructive" }),
      },
    );
  };

  const grouped = groupByYearSemester(subjects ?? []);

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/admin/courses">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
        </Link>
      </Button>

      <PageHeader
        title={course?.title ?? "Course"}
        description="Organize the curriculum into subjects by year and semester, and attach video lectures and study materials."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Subject
          </Button>
        }
      />

      {isLoading ? (
        <LoadingCard />
      ) : !subjects || subjects.length === 0 ? (
        <EmptyCard message="No subjects yet. Add the first subject to start building the curriculum." />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ year, semesters }) => (
            <div key={year} className="space-y-4">
              <h2 className="font-serif text-2xl font-semibold">Year {year}</h2>
              {semesters.map(({ semester, items }) => (
                <div key={semester} className="space-y-3">
                  <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                    Semester {semester}
                  </h3>
                  <Accordion type="multiple" className="space-y-3">
                    {items.map((s) => (
                      <AccordionItem
                        key={s.id}
                        value={String(s.id)}
                        className="border rounded-2xl px-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <AccordionTrigger className="flex-1 hover:no-underline">
                            <span className="font-medium">{s.title}</span>
                          </AccordionTrigger>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(s);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(s);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <AccordionContent>
                          {s.description && (
                            <p className="text-sm text-muted-foreground mb-4">
                              {s.description}
                            </p>
                          )}
                          <MaterialsManager subjectId={s.id} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Subject" : "Add Subject"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="s-title">Title</Label>
              <Input
                id="s-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-desc">Description</Label>
              <Textarea
                id="s-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="s-year">Year</Label>
                <Input
                  id="s-year"
                  type="number"
                  min="1"
                  value={form.year}
                  onChange={(e) => setForm({ ...form, year: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-sem">Semester</Label>
                <Input
                  id="s-sem"
                  type="number"
                  min="1"
                  value={form.semester}
                  onChange={(e) =>
                    setForm({ ...form, semester: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-order">Order</Label>
                <Input
                  id="s-order"
                  type="number"
                  min="1"
                  value={form.orderIndex}
                  onChange={(e) =>
                    setForm({ ...form, orderIndex: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createSubject.isPending || updateSubject.isPending}
            >
              {editing ? "Save" : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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

interface MaterialForm {
  title: string;
  type: MaterialInputType;
  url: string;
  content: string;
  durationMinutes: string;
  orderIndex: string;
}

const emptyMaterial: MaterialForm = {
  title: "",
  type: "video",
  url: "",
  content: "",
  durationMinutes: "",
  orderIndex: "1",
};

function MaterialsManager({ subjectId }: { subjectId: number }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: materials, isLoading } = useListMaterials(subjectId);
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const deleteMaterial = useDeleteMaterial();
  const { uploadFile, isUploading } = useUpload({
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudyMaterial | null>(null);
  const [form, setForm] = useState<MaterialForm>(emptyMaterial);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyMaterial,
      orderIndex: String((materials?.length ?? 0) + 1),
    });
    setOpen(true);
  };
  const openEdit = (m: StudyMaterial) => {
    setEditing(m);
    setForm({
      title: m.title,
      type: m.type as MaterialInputType,
      url: m.url ?? "",
      content: m.content ?? "",
      durationMinutes: m.durationMinutes ? String(m.durationMinutes) : "",
      orderIndex: String(m.orderIndex),
    });
    setOpen(true);
  };

  const handleUpload = async (file: File) => {
    const res = await uploadFile(file);
    if (res?.objectPath) {
      setForm((f) => ({ ...f, url: res.objectPath }));
      toast({ title: "File uploaded" });
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    const data = {
      title: form.title,
      type: form.type,
      url: form.url || undefined,
      content: form.content || undefined,
      durationMinutes: form.durationMinutes
        ? Number(form.durationMinutes)
        : undefined,
      orderIndex: Number(form.orderIndex) || 1,
    };
    const onSuccess = () => {
      toast({ title: editing ? "Material updated" : "Material added" });
      qc.invalidateQueries();
      setOpen(false);
    };
    const onError = () =>
      toast({ title: "Error saving material", variant: "destructive" });

    if (editing) {
      updateMaterial.mutate({ id: editing.id, data }, { onSuccess, onError });
    } else {
      createMaterial.mutate({ subjectId, data }, { onSuccess, onError });
    }
  };

  const handleDelete = (m: StudyMaterial) => {
    if (!confirm(`Delete "${m.title}"?`)) return;
    deleteMaterial.mutate(
      { id: m.id },
      {
        onSuccess: () => {
          toast({ title: "Material deleted" });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error deleting", variant: "destructive" }),
      },
    );
  };

  const sorted = (materials ?? [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="space-y-3">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading materials…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No materials yet.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground">{typeIcon(m.type)}</span>
                <span className="truncate text-sm">{m.title}</span>
                <Badge variant="secondary" className="capitalize shrink-0">
                  {m.type}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(m)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Button variant="outline" size="sm" onClick={openCreate}>
        <Plus className="w-4 h-4 mr-2" /> Add Material
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Material" : "Add Material"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="m-title">Title</Label>
              <Input
                id="m-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm({ ...form, type: v as MaterialInputType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((t) => (
                      <SelectItem key={t} value={t} className="capitalize">
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-order">Order</Label>
                <Input
                  id="m-order"
                  type="number"
                  min="1"
                  value={form.orderIndex}
                  onChange={(e) =>
                    setForm({ ...form, orderIndex: e.target.value })
                  }
                />
              </div>
            </div>

            {form.type === "text" ? (
              <div className="space-y-2">
                <Label htmlFor="m-content">Content</Label>
                <Textarea
                  id="m-content"
                  rows={4}
                  value={form.content}
                  onChange={(e) =>
                    setForm({ ...form, content: e.target.value })
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="m-url">
                  {form.type === "link" ? "URL" : "File URL"}
                </Label>
                <Input
                  id="m-url"
                  value={form.url}
                  placeholder="https://…"
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                />
                {(form.type === "video" || form.type === "pdf") && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept={form.type === "video" ? "video/*" : "application/pdf"}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(file);
                      }}
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <span className="text-xs text-muted-foreground">
                        Uploading…
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {form.type === "video" && (
              <div className="space-y-2">
                <Label htmlFor="m-duration">Duration (minutes)</Label>
                <Input
                  id="m-duration"
                  type="number"
                  min="0"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({ ...form, durationMinutes: e.target.value })
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                createMaterial.isPending ||
                updateMaterial.isPending ||
                isUploading
              }
            >
              {editing ? "Save" : "Add Material"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
