import { useListCertificates } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";

export default function AdminCertificates() {
  const { data: certificates, isLoading } = useListCertificates();

  return (
    <div className="space-y-8">
      <PageHeader title="Certificates" description="Issued certificates and credentials." />

      {isLoading ? (
        <LoadingCard />
      ) : !certificates || certificates.length === 0 ? (
        <EmptyCard message="No certificates issued yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Certificate No.</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead className="text-right">File</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.certificateNumber}</TableCell>
                    <TableCell>#{c.userId}</TableCell>
                    <TableCell>#{c.courseId}</TableCell>
                    <TableCell>{new Date(c.issuedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {c.fileUrl ? (
                        <Button size="sm" variant="outline" asChild>
                          <a href={c.fileUrl} target="_blank" rel="noreferrer">
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
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
