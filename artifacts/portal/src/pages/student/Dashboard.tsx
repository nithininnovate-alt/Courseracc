import {
  useGetStudentDashboard,
  useGetCurrentUser,
  useListApplications,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { StatusTracker } from "@/components/common/StatusTracker";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  BookOpen,
  GraduationCap,
  FileText,
  CheckCircle2,
  Clock,
  ArrowRight,
  User as UserIcon,
  Download,
  FolderOpen,
} from "lucide-react";

export default function StudentDashboard() {
  const { data, isLoading } = useGetStudentDashboard();
  const { data: user } = useGetCurrentUser();
  const { data: applications } = useListApplications();

  const latest = applications?.[0];
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Student";

  const stats = [
    { label: "Enrolled Courses", value: data?.enrolledCourses, icon: BookOpen, href: "/portal/learning" },
    { label: "Completed Courses", value: data?.completedCourses, icon: CheckCircle2, href: "/portal/learning" },
    { label: "Pending Assignments", value: data?.pendingAssignments, icon: FileText, href: "/portal/assignments" },
    { label: "Upcoming Exams", value: data?.upcomingExams, icon: Clock, href: "/portal/exams" },
    { label: "Certificates", value: data?.certificates, icon: GraduationCap, href: "/portal/certificates" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">Welcome back, {displayName}</h1>
        <p className="text-muted-foreground mt-1">Here is an overview of your application and learning journey.</p>
      </div>

      {/* Application status */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-serif">Admission Status</CardTitle>
          {!applications ? null : applications.length === 0 ? (
            <Button asChild size="sm"><Link href="/apply">Start Application</Link></Button>
          ) : (
            <Button asChild size="sm" variant="outline"><Link href="/portal/applications">View All</Link></Button>
          )}
        </CardHeader>
        <CardContent>
          {!applications ? (
            <Skeleton className="h-16 w-full" />
          ) : applications.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              You have not submitted any applications yet. Begin your admission journey today.
            </p>
          ) : latest ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-primary">{latest.programName}</p>
                  <p className="text-xs text-muted-foreground">
                    Submitted {new Date(latest.submittedAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={latest.status} />
              </div>
              <StatusTracker status={latest.status} />
              {latest.status === "approved" && latest.admissionLetterUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/storage${latest.admissionLetterUrl}`} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Download Admission Letter
                  </a>
                </Button>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Stats placeholders */}
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
                  <Skeleton className="h-8 w-12" />
                ) : (
                  <div className="text-3xl font-bold text-primary">{s.value ?? 0}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Profile summary */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2"><UserIcon className="w-5 h-5" /> Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Name" value={displayName} />
            <Row label="Email" value={user?.email} />
            <Row label="Phone" value={user?.phone ?? "—"} />
            <Row label="Country" value={user?.country ?? "—"} />
            <Button asChild variant="outline" size="sm" className="mt-2 w-full">
              <Link href="/portal/profile">Edit Profile</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Document repository */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif flex items-center gap-2"><FolderOpen className="w-5 h-5" /> Documents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {!latest || !latest.documents || latest.documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No documents on file.</p>
            ) : (
              <ul className="space-y-2">
                {latest.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span className="truncate">{doc.name}</span>
                    </span>
                    <a
                      href={`/api/storage${doc.objectPath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline flex-shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="font-serif">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" asChild><Link href="/portal/courses">Courses</Link></Button>
            <Button variant="outline" asChild><Link href="/portal/assignments">Assignments</Link></Button>
            <Button variant="outline" asChild><Link href="/portal/payments">Payments</Link></Button>
            <Button variant="outline" asChild><Link href="/portal/certificates">Certificates</Link></Button>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
