import { useGetAdminDashboard, useGetAdminAnalytics } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, Inbox, BookOpen, GraduationCap, DollarSign } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const PALETTE = ["#1f3f75", "#b8902f", "#3a7d44", "#a8324e", "#5b6b8c", "#c2772a"];

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-serif text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();
  const { data: analytics, isLoading: analyticsLoading } = useGetAdminAnalytics();

  const stats = [
    { label: "Total Students", value: data?.totalStudents, icon: Users, href: "/admin/students" },
    { label: "Pending Applications", value: data?.pendingApplications, icon: Inbox, href: "/admin/applications" },
    { label: "Total Courses", value: data?.totalCourses, icon: BookOpen, href: "/admin/courses" },
    { label: "Active Enrollments", value: data?.activeEnrollments, icon: GraduationCap, href: "/admin/students" },
    {
      label: "Total Revenue",
      value: data ? `$${data.totalRevenue.toLocaleString()}` : undefined,
      icon: DollarSign,
      href: "/admin/payments",
    },
  ];

  const assignment = analytics
    ? [
        { name: "Graded", value: analytics.assignmentCompletion.graded },
        { name: "Submitted", value: analytics.assignmentCompletion.submitted },
        { name: "Pending", value: analytics.assignmentCompletion.pending },
      ]
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground mt-1">University operations at a glance.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="block group focus:outline-none">
            <Card className="rounded-2xl h-full transition-all group-hover:shadow-lg group-hover:border-primary/40 group-focus-visible:ring-2 group-focus-visible:ring-primary cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-primary">{s.value ?? 0}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {analyticsLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80 rounded-2xl" />
          ))}
        </div>
      ) : analytics ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Revenue by month">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.revenueByMonth} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={48} />
                <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
                <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Applications by status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.applicationsByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e) => `${e.name} (${e.value})`}
                >
                  {analytics.applicationsByStatus.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Enrollments by course">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.enrollmentsByCourse} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[4, 4, 0, 0]} name="Enrollments" />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Assignment completion">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assignment} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} name="Submissions">
                  {assignment.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      ) : null}
    </div>
  );
}
