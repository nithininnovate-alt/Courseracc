import { useMemo, useState } from "react";
import {
  useListUsers,
  useListPayments,
  useListResults,
  useListCourses,
  useListExams,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { Download } from "lucide-react";

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminReports() {
  return (
    <div className="space-y-8">
      <PageHeader title="Reports" description="Browse and export university data as CSV." />
      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>
        <TabsContent value="students" className="mt-6">
          <StudentsReport />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentsReport />
        </TabsContent>
        <TabsContent value="results" className="mt-6">
          <ResultsReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Toolbar({ search, setSearch, onExport, count }: { search: string; setSearch: (v: string) => void; onExport: () => void; count: number }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs"
      />
      <Button variant="outline" onClick={onExport} disabled={count === 0}>
        <Download className="w-4 h-4 mr-2" /> Export CSV ({count})
      </Button>
    </div>
  );
}

function StudentsReport() {
  const { data: users, isLoading } = useListUsers();
  const [search, setSearch] = useState("");

  const students = useMemo(() => (users ?? []).filter((u) => u.role === "student"), [users]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((u) =>
      [u.firstName, u.lastName, u.email, u.country].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [students, search]);

  const exportCsv = () => {
    downloadCsv("students.csv", [
      ["ID", "First Name", "Last Name", "Email", "Phone", "Country", "Joined"],
      ...filtered.map((u) => [
        u.id,
        u.firstName ?? "",
        u.lastName ?? "",
        u.email,
        u.phone ?? "",
        u.country ?? "",
        new Date(u.createdAt).toLocaleDateString(),
      ]),
    ]);
  };

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <Toolbar search={search} setSearch={setSearch} onExport={exportCsv} count={filtered.length} />
      {filtered.length === 0 ? (
        <EmptyCard message="No students found." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}
                    </TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.phone ?? "—"}</TableCell>
                    <TableCell>{u.country ?? "—"}</TableCell>
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

function PaymentsReport() {
  const { data: payments, isLoading } = useListPayments();
  const { data: users } = useListUsers();
  const { data: courses } = useListCourses();
  const [search, setSearch] = useState("");

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));
  const userName = (id: number) => {
    const u = userMap.get(id);
    if (!u) return `#${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (payments ?? []).filter((p) =>
      [userName(p.userId), p.invoiceNumber, p.reference, p.status, p.provider]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments, users, search]);

  const exportCsv = () => {
    downloadCsv("payments.csv", [
      ["ID", "Invoice", "Student", "Course", "Amount", "Currency", "Status", "Provider", "Date"],
      ...filtered.map((p) => [
        p.id,
        p.invoiceNumber ?? "",
        userName(p.userId),
        p.courseId ? courseMap.get(p.courseId)?.title ?? `#${p.courseId}` : "",
        p.amount,
        p.currency,
        p.status,
        p.provider,
        new Date(p.createdAt).toLocaleDateString(),
      ]),
    ]);
  };

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <Toolbar search={search} setSearch={setSearch} onExport={exportCsv} count={filtered.length} />
      {filtered.length === 0 ? (
        <EmptyCard message="No payments found." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.invoiceNumber ?? `#${p.id}`}</TableCell>
                    <TableCell>{userName(p.userId)}</TableCell>
                    <TableCell>
                      {p.currency} {p.amount.toLocaleString()}
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
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

function ResultsReport() {
  const { data: results, isLoading } = useListResults();
  const { data: users } = useListUsers();
  const { data: exams } = useListExams();
  const [search, setSearch] = useState("");

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const examMap = new Map((exams ?? []).map((e) => [e.id, e]));
  const userName = (id: number) => {
    const u = userMap.get(id);
    if (!u) return `#${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return (results ?? []).filter((r) =>
      [userName(r.userId), examMap.get(r.examId)?.title, r.grade]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, users, exams, search]);

  const exportCsv = () => {
    downloadCsv("results.csv", [
      ["ID", "Student", "Exam", "Score", "Grade", "Passed", "Published"],
      ...filtered.map((r) => [
        r.id,
        userName(r.userId),
        examMap.get(r.examId)?.title ?? `#${r.examId}`,
        r.score,
        r.grade ?? "",
        r.passed ? "Yes" : "No",
        r.published ? "Yes" : "No",
      ]),
    ]);
  };

  if (isLoading) return <LoadingCard />;

  return (
    <div className="space-y-4">
      <Toolbar search={search} setSearch={setSearch} onExport={exportCsv} count={filtered.length} />
      {filtered.length === 0 ? (
        <EmptyCard message="No results found." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Exam</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{userName(r.userId)}</TableCell>
                    <TableCell>{examMap.get(r.examId)?.title ?? `#${r.examId}`}</TableCell>
                    <TableCell>{r.score}</TableCell>
                    <TableCell>{r.grade ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.passed ? "approved" : "failed"} />
                    </TableCell>
                    <TableCell>{r.published ? "Yes" : "No"}</TableCell>
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
