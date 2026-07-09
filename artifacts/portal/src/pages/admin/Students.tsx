import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { UserRoleUpdateRole, type User } from "@workspace/api-client-react";
import { FileText, Search, Eye } from "lucide-react";

const ROLES = Object.values(UserRoleUpdateRole);

export default function AdminStudents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const { data: users, isLoading } = useListUsers();
  const { data: enrollments, isLoading: enrollmentsLoading } = useListEnrollments();
  const { data: courses } = useListCourses();
  const updateRole = useUpdateUserRole();

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [detailUser, setDetailUser] = useState<User | null>(null);

  const isSuperadmin = currentUser?.role === "superadmin";

  const userById = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);
  const courseById = useMemo(() => new Map((courses ?? []).map((c) => [c.id, c])), [courses]);

  const userName = (id: number) => {
    const u = userById.get(id);
    if (!u) return `User #${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email || `User #${id}`;
  };
  const courseTitle = (id: number) => courseById.get(id)?.title ?? `Course #${id}`;

  const query = search.trim().toLowerCase();

  const filteredUsers = useMemo(
    () =>
      (users ?? []).filter((u) =>
        !query
          ? true
          : [u.firstName, u.lastName, u.email].filter(Boolean).join(" ").toLowerCase().includes(query),
      ),
    [users, query],
  );

  const filteredEnrollments = useMemo(
    () =>
      (enrollments ?? []).filter((e) => {
        if (courseFilter !== "all" && e.courseId !== Number(courseFilter)) return false;
        if (!query) return true;
        const u = userById.get(e.userId);
        return [u?.firstName, u?.lastName, u?.email]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      }),
    [enrollments, courseFilter, query, userById],
  );

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

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <LoadingCard />
      ) : !users || users.length === 0 ? (
        <EmptyCard message="No users yet." />
      ) : filteredUsers.length === 0 ? (
        <EmptyCard message="No users match your search." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden md:table-cell">Joined</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8 border">
                          {u.avatarUrl && (
                            <AvatarImage src={`/api/storage${u.avatarUrl}`} alt="" className="object-cover" />
                          )}
                          <AvatarFallback className="text-xs">
                            {[u.firstName?.[0], u.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{[u.firstName, u.lastName].filter(Boolean).join(" ") || "-"}</div>
                          <div className="sm:hidden text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      {isSuperadmin ? (
                        <Select
                          value={u.role}
                          onValueChange={(v) => handleRoleChange(u.id, v)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-32 sm:w-36 h-9 capitalize"><SelectValue /></SelectTrigger>
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
                    <TableCell className="hidden md:table-cell">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setDetailUser(u)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-serif font-semibold text-primary">Enrollment letters</h2>
            <p className="text-sm text-muted-foreground">
              Download official IEAC / EAHEA enrollment verification letters for any enrolled student.
            </p>
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="w-full sm:w-64 h-9">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All courses</SelectItem>
              {(courses ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {enrollmentsLoading ? (
          <LoadingCard />
        ) : !enrollments || enrollments.length === 0 ? (
          <EmptyCard message="No enrollments yet." />
        ) : filteredEnrollments.length === 0 ? (
          <EmptyCard message="No enrollments match your filters." />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden md:table-cell">Enrolled</TableHead>
                    <TableHead className="text-right">Letters</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">
                        <div>{userName(e.userId)}</div>
                        <div className="sm:hidden">
                          <Badge
                            variant={e.status === "completed" ? "default" : "secondary"}
                            className="capitalize mt-1"
                          >
                            {e.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{courseTitle(e.courseId)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge
                          variant={e.status === "completed" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {e.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {new Date(e.enrolledAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex flex-col gap-2 sm:flex-row">
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

      <Dialog open={Boolean(detailUser)} onOpenChange={(open) => !open && setDetailUser(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Student Details</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border">
                  {detailUser.avatarUrl && (
                    <AvatarImage
                      src={`/api/storage${detailUser.avatarUrl}`}
                      alt=""
                      className="object-cover"
                    />
                  )}
                  <AvatarFallback className="text-lg">
                    {[detailUser.firstName?.[0], detailUser.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {[detailUser.firstName, detailUser.lastName].filter(Boolean).join(" ") || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">{detailUser.email}</p>
                  <Badge variant="secondary" className="capitalize mt-1">{detailUser.role}</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Contact</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <DetailRow label="Phone" value={detailUser.phone} />
                  <DetailRow label="Date of Birth" value={detailUser.dateOfBirth} />
                  <DetailRow label="Country" value={detailUser.country} />
                  <DetailRow label="Address" value={detailUser.address} />
                </dl>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Enrolled Courses</h3>
                {(() => {
                  const own = (enrollments ?? []).filter((e) => e.userId === detailUser.id);
                  return own.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No enrollments.</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {own.map((e) => (
                        <li key={e.id} className="flex justify-between gap-2">
                          <span>{courseTitle(e.courseId)}</span>
                          <span className="text-muted-foreground capitalize">{e.status} · {e.progress}%</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-primary mb-2">Parent/Guardian</h3>
                {detailUser.parentName || detailUser.parentPhone || detailUser.parentEmail ? (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <DetailRow label="Name" value={detailUser.parentName} />
                    <DetailRow label="Relationship" value={detailUser.parentRelationship} />
                    <DetailRow label="Phone" value={detailUser.parentPhone} />
                    <DetailRow label="Email" value={detailUser.parentEmail} />
                    <DetailRow label="Occupation" value={detailUser.parentOccupation} />
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">No parent/guardian details on file.</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right truncate">{value || "—"}</dd>
    </>
  );
}
