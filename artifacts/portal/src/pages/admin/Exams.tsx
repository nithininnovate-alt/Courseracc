import { useListExams } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function AdminExams() {
  const { data: exams, isLoading } = useListExams();

  return (
    <div className="space-y-8">
      <PageHeader title="Exams" description="All scheduled exams across the university." />

      {isLoading ? (
        <LoadingCard />
      ) : !exams || exams.length === 0 ? (
        <EmptyCard message="No exams scheduled." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Total Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exams.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>#{e.subjectId}</TableCell>
                    <TableCell>{new Date(e.scheduledAt).toLocaleString()}</TableCell>
                    <TableCell>{e.durationMinutes} min</TableCell>
                    <TableCell>{e.totalMarks}</TableCell>
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
