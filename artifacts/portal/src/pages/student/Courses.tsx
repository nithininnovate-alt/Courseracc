import { useListCourses, useListEnrollments } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowRight, FileText } from "lucide-react";
import { PageHeader, EmptyCard } from "@/components/common/PageState";

export default function StudentCourses() {
  const { data: courses, isLoading } = useListCourses();
  const { data: enrollments, isLoading: enrollmentsLoading } = useListEnrollments();

  const enrollmentByCourse = new Map((enrollments ?? []).map((e) => [e.courseId, e]));
  const enrolledCourses = (courses ?? []).filter((c) => enrollmentByCourse.has(c.id));

  const loading = isLoading || enrollmentsLoading;

  return (
    <div className="space-y-8">
      <PageHeader title="My Courses" description="Your enrolled programs." />

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : enrolledCourses.length === 0 ? (
        <EmptyCard message="You are not enrolled in any courses yet. Contact the registrar office to get started." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {enrolledCourses.map((c) => {
            const enrollment = enrollmentByCourse.get(c.id)!;
            return (
              <Card key={c.id} className="flex flex-col rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="capitalize">{c.level}</Badge>
                    <Badge variant="outline" className="capitalize">{enrollment.status}</Badge>
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
                  <div className="space-y-2">
                    <Button className="w-full" asChild>
                      <Link href={`/portal/learning/${c.id}`}>
                        Continue Learning <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" asChild data-testid={`button-letter-${c.id}`}>
                      <a
                        href={`/api/enrollments/${enrollment.id}/letter?validator=${c.letterType}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" /> {c.letterType.toUpperCase()} Letter
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
