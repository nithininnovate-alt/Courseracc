import { useState } from "react";
import { useListCourses, useCreateCourse } from "@workspace/api-client-react";
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
import { CourseInputLevel } from "@workspace/api-client-react";

const LEVELS = Object.values(CourseInputLevel);

export default function AdminCourses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: courses, isLoading } = useListCourses();
  const createCourse = useCreateCourse();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "undergraduate",
    durationWeeks: "12",
    price: "0",
    thumbnailUrl: "",
  });

  const reset = () =>
    setForm({ title: "", description: "", level: "undergraduate", durationWeeks: "12", price: "0", thumbnailUrl: "" });

  const handleCreate = () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", description: "Enter a course title.", variant: "destructive" });
      return;
    }
    createCourse.mutate(
      {
        data: {
          title: form.title,
          description: form.description || undefined,
          level: form.level as CourseInputLevel,
          durationWeeks: Number(form.durationWeeks) || 1,
          price: Number(form.price) || 0,
          thumbnailUrl: form.thumbnailUrl || undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Course created", description: "The course was added to the catalog." });
          qc.invalidateQueries();
          setOpen(false);
          reset();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not create course.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Courses"
        description="Manage the course catalog."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button>Add Course</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Course</DialogTitle></DialogHeader>
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
                <Button onClick={handleCreate} disabled={createCourse.isPending}>
                  {createCourse.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{c.level}</Badge></TableCell>
                    <TableCell>{c.durationWeeks} weeks</TableCell>
                    <TableCell>${c.price.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
