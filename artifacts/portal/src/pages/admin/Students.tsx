import {
  useGetCurrentUser,
  useListUsers,
  useUpdateUserRole,
  useListEnrollments,
  useListCourses,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { UserRoleUpdateRole } from "@workspace/api-client-react";
import { FileText } from "lucide-react";

const ROLES = Object.values(UserRoleUpdateRole);

export default function AdminStudents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const { data: users, isLoading } = useListUsers();
  const { data: enrollments, isLoading: enrollmentsLoading } = useListEnrollments();
  const { data: courses } = useListCourses();
  const updateRole = useUpdateUserRole();

  const isSuperadmin = currentUser?.role === "superadmin";

  const userName = (id: number) => {
    const u = users?.find((x) => x.id === id);
    if (!u) return `User #${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${id}`;
  };
  const courseTitle = (id: number) =>
    courses?.find((c) => c.id === id)?.title ?? `Course #${id}`;

  const handleRoleChange = (id: number, role: string) => {
    updateRole.mutate(
      { id, data: { role: role as UserRoleUpdateRole } },
      {
        onSuccess: () => {
          toast({ title: "Role updated", description: "The user's role was changed." });
          qc.invalidateQueries();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not update role.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users"
        description={isSuperadmin ? "Manage all users and their roles." : "View registered users."}
      />

      {isLoading ? (
        <LoadingCard />
      ) : !users || users.length === 0 ? (
        <EmptyCard message="No users yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {isSuperadmin ? (
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-36 h-9 capitalize"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-serif font-semibold text-primary">Enrollment letters</h2>
          <p className="text-sm text-muted-foreground">
            Download official IEAC / EAHEA enrollment verification letters for any enrolled student.
          </p>
        </div>

        {enrollmentsLoading ? (
          <LoadingCard />
        ) : !enrollments || enrollments.length === 0 ? (
          <EmptyCard message="No enrollments yet." />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enrolled</TableHead>
                    <TableHead className="text-right">Letters</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{userName(e.userId)}</TableCell>
                      <TableCell className="text-muted-foreground">{courseTitle(e.courseId)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={e.status === "completed" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(e.enrolledAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/api/enrollments/${e.id}/letter?validator=ieac`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" /> IEAC
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={`/api/enrollments/${e.id}/letter?validator=eahea`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText className="w-3.5 h-3.5 mr-1" /> EAHEA
                            </a>
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
      </div>
    </div>
  );
}
