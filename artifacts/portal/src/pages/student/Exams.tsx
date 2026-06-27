import { useListExams, useListResults } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function StudentExams() {
  const { data: exams, isLoading } = useListExams();
  const { data: results } = useListResults();

  return (
    <div className="space-y-8">
      <PageHeader title="Exams" description="Your scheduled exams and published results." />

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Scheduled Exams</h2>
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
                    <TableHead>Scheduled</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Total Marks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exams.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.title}</TableCell>
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
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-serif font-bold text-primary">Results</h2>
        {!results || results.length === 0 ? (
          <EmptyCard message="No results published yet." />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Published</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">Exam #{r.examId}</TableCell>
                      <TableCell>{r.score}</TableCell>
                      <TableCell>{r.grade ?? "-"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={r.passed ? "bg-green-100 text-green-800 border-0" : "bg-red-100 text-red-800 border-0"}>
                          {r.passed ? "Passed" : "Failed"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(r.publishedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
