import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Inbox, BookOpen, GraduationCap, DollarSign } from "lucide-react";

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();

  const stats = [
    { label: "Total Students", value: data?.totalStudents, icon: Users },
    { label: "Pending Applications", value: data?.pendingApplications, icon: Inbox },
    { label: "Total Courses", value: data?.totalCourses, icon: BookOpen },
    { label: "Active Enrollments", value: data?.activeEnrollments, icon: GraduationCap },
    {
      label: "Total Revenue",
      value: data ? `$${data.totalRevenue.toLocaleString()}` : undefined,
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">University operations at a glance.</p>
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
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-3xl font-bold text-primary">{s.value ?? 0}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
