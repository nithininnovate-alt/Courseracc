import { useListApplications } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function StudentApplications() {
  const { data: applications, isLoading } = useListApplications();

  return (
    <div className="space-y-8">
      <PageHeader
        title="My Applications"
        description="Track the status of your admission applications."
        action={<Button asChild><Link href="/apply">New Application</Link></Button>}
      />

      {isLoading ? (
        <LoadingCard />
      ) : !applications || applications.length === 0 ? (
        <EmptyCard message="You have not submitted any applications yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.programName}</TableCell>
                    <TableCell>{a.fullName}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>{new Date(a.submittedAt).toLocaleDateString()}</TableCell>
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
