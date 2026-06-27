import { useListEnrollments, useListCourses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, EmptyCard } from "@/components/common/PageState";

export default function StudentLearning() {
  const { data: enrollments, isLoading } = useListEnrollments();
  const { data: courses } = useListCourses();

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <PageHeader title="My Learning" description="Track progress across your enrolled courses." />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : !enrollments || enrollments.length === 0 ? (
        <EmptyCard message="You are not enrolled in any courses yet." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {enrollments.map((e) => {
            const course = courseMap.get(e.courseId);
            return (
              <Card key={e.id} className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="font-serif text-xl">
                      {course?.title ?? `Course #${e.courseId}`}
                    </CardTitle>
                    <StatusBadge status={e.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Progress</span>
                      <span>{e.progress}%</span>
                    </div>
                    <Progress value={e.progress} />
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/portal/courses">View Catalog</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
