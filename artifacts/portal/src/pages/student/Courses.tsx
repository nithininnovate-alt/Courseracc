import { useListCourses, useListEnrollments, useCreateEnrollment } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, Lock, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader, EmptyCard } from "@/components/common/PageState";

export default function StudentCourses() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: courses, isLoading } = useListCourses();
  const { data: enrollments } = useListEnrollments();
  const enroll = useCreateEnrollment();

  const enrolledIds = new Set((enrollments ?? []).map((e) => e.courseId));
  const enrollmentByCourse = new Map((enrollments ?? []).map((e) => [e.courseId, e]));

  const handleEnroll = (courseId: number) => {
    enroll.mutate(
      { data: { courseId } },
      {
        onSuccess: () => {
          toast({ title: "Enrolled", description: "You have been enrolled in this course." });
          qc.invalidateQueries();
        },
        onError: (error) => {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 409) {
            toast({ title: "Already enrolled", description: "You are already enrolled in this course." });
            qc.invalidateQueries();
            return;
          }
          toast({ title: "Error", description: "Could not enroll in this course.", variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Course Catalog" description="Browse and enroll in available programs." />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : !courses || courses.length === 0 ? (
        <EmptyCard message="No courses available yet." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const enrolled = enrolledIds.has(c.id);
            const free = c.price <= 0;
            return (
              <Card key={c.id} className="flex flex-col rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="capitalize">{c.level}</Badge>
                    <span className="text-sm font-semibold text-primary">
                      {free ? "Free" : `$${c.price.toLocaleString()}`}
                    </span>
                  </div>
                  <CardTitle className="font-serif text-xl mt-2">{c.title}</CardTitle>
                  {c.description && (
                    <CardDescription className="line-clamp-2">{c.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="mt-auto space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" /> {c.durationWeeks} weeks
                  </div>
                  {enrolled ? (
                    <div className="space-y-2">
                      <Button className="w-full" asChild>
                        <Link href={`/portal/learning/${c.id}`}>
                          Continue Learning <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" className="w-full" asChild data-testid={`button-letter-${c.id}`}>
                        <a
                          href={`/api/enrollments/${enrollmentByCourse.get(c.id)?.id}/letter?validator=${c.letterType}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" /> {c.letterType.toUpperCase()} Letter
                        </a>
                      </Button>
                    </div>
                  ) : free ? (
                    <Button className="w-full" onClick={() => handleEnroll(c.id)} disabled={enroll.isPending}>
                      Enroll Now
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full" asChild>
                      <Link href={`/portal/learning/${c.id}`}>
                        <Lock className="w-4 h-4 mr-2" /> Get Access — ${c.price.toLocaleString()}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
