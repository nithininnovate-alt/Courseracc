import { useGetStudentDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, GraduationCap, FileText, CheckCircle2, Clock, ArrowRight } from "lucide-react";

export default function StudentDashboard() {
  const { data, isLoading } = useGetStudentDashboard();

  const stats = [
    { label: "Enrolled Courses", value: data?.enrolledCourses, icon: BookOpen },
    { label: "Completed Courses", value: data?.completedCourses, icon: CheckCircle2 },
    { label: "Pending Assignments", value: data?.pendingAssignments, icon: FileText },
    { label: "Upcoming Exams", value: data?.upcomingExams, icon: Clock },
    { label: "Certificates", value: data?.certificates, icon: GraduationCap },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">Welcome back</h1>
        <p className="text-muted-foreground mt-1">Here is an overview of your learning journey.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                <div className="text-3xl font-bold text-primary">{s.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Continue Learning</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">Pick up where you left off or explore new programs.</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild><Link href="/portal/learning">My Learning <ArrowRight className="w-4 h-4 ml-2" /></Link></Button>
              <Button variant="outline" asChild><Link href="/portal/courses">Browse Catalog</Link></Button>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" asChild><Link href="/portal/assignments">Assignments</Link></Button>
            <Button variant="outline" asChild><Link href="/portal/exams">Exams</Link></Button>
            <Button variant="outline" asChild><Link href="/portal/payments">Payments</Link></Button>
            <Button variant="outline" asChild><Link href="/portal/certificates">Certificates</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
