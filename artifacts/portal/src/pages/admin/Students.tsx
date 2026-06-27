import { useGetCurrentUser, useListUsers, useUpdateUserRole } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { UserRoleUpdateRole } from "@workspace/api-client-react";

const ROLES = Object.values(UserRoleUpdateRole);

export default function AdminStudents() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const { data: users, isLoading } = useListUsers();
  const updateRole = useUpdateUserRole();

  const isSuperadmin = currentUser?.role === "superadmin";

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
    </div>
  );
}
