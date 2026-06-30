import { useState } from "react";
import { Link } from "wouter";
import {
  useListCourses,
  useCreateCourse,
  useUpdateCourse,
  useDeleteCourse,
  CourseInputLevel,
  type Course,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Settings2 } from "lucide-react";

const LEVELS = Object.values(CourseInputLevel);

interface CourseForm {
  title: string;
  description: string;
  level: string;
  durationWeeks: string;
  price: string;
  thumbnailUrl: string;
}

const empty: CourseForm = {
  title: "",
  description: "",
  level: "undergraduate",
  durationWeeks: "12",
  price: "0",
  thumbnailUrl: "",
};

export default function AdminCourses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: courses, isLoading } = useListCourses();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const deleteCourse = useDeleteCourse();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState<CourseForm>(empty);

  const openCreate = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };
  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description ?? "",
      level: c.level,
      durationWeeks: String(c.durationWeeks),
      price: String(c.price),
      thumbnailUrl: c.thumbnailUrl ?? "",
    });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", description: "Enter a course title.", variant: "destructive" });
      return;
    }
    const data = {
      title: form.title,
      description: form.description || undefined,
      level: form.level as CourseInputLevel,
      durationWeeks: Number(form.durationWeeks) || 1,
      price: Number(form.price) || 0,
      thumbnailUrl: form.thumbnailUrl || undefined,
    };
    const onSuccess = () => {
      toast({ title: editing ? "Course updated" : "Course created" });
      qc.invalidateQueries();
      setOpen(false);
      setForm(empty);
    };
    const onError = () =>
      toast({ title: "Error", description: "Could not save course.", variant: "destructive" });

    if (editing) {
      updateCourse.mutate({ id: editing.id, data }, { onSuccess, onError });
    } else {
      createCourse.mutate({ data }, { onSuccess, onError });
    }
  };

  const handleDelete = (c: Course) => {
    if (!confirm(`Delete course "${c.title}"? This removes its subjects and materials.`)) return;
    deleteCourse.mutate(
      { id: c.id },
      {
        onSuccess: () => {
          toast({ title: "Course deleted" });
          qc.invalidateQueries();
        },
        onError: () => toast({ title: "Error", description: "Could not delete course.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Courses"
        description="Manage the course catalog and curriculum."
        action={<Button onClick={openCreate}>Add Course</Button>}
      />

      {isLoading ? (
        <LoadingCard />
      ) : !courses || courses.length === 0 ? (
        <EmptyCard message="No courses yet. Add your first course." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{c.level}</Badge></TableCell>
                    <TableCell>{c.durationWeeks} weeks</TableCell>
                    <TableCell>{c.price <= 0 ? "Free" : `$${c.price.toLocaleString()}`}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/courses/${c.id}`}>
                            <Settings2 className="w-4 h-4 mr-2" /> Manage
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(c)}>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Course" : "Add Course"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Level</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="durationWeeks">Duration (weeks)</Label>
                <Input id="durationWeeks" type="number" min="1" value={form.durationWeeks} onChange={(e) => setForm({ ...form, durationWeeks: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input id="price" type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thumbnailUrl">Thumbnail URL</Label>
                <Input id="thumbnailUrl" value={form.thumbnailUrl} onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCourse.isPending || updateCourse.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
