import { useState } from "react";
import { useListApplications, type Application } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { StatusBadge } from "@/components/common/StatusBadge";
import { StatusTracker } from "@/components/common/StatusTracker";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { FileText, Download } from "lucide-react";

export default function StudentApplications() {
  const { data: applications, isLoading } = useListApplications();
  const [active, setActive] = useState<Application | null>(null);

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
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.programName}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>{new Date(a.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setActive(a)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={Boolean(active)} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">{active?.programName}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-6">
              <div className="py-2">
                <StatusTracker status={active.status} />
              </div>

              {active.reviewNote && (
                <div className="rounded-xl bg-muted/50 p-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Reviewer Remarks</p>
                  <p className="text-sm">{active.reviewNote}</p>
                </div>
              )}

              {active.status === "approved" && active.admissionLetterUrl && (
                <Button asChild className="w-full">
                  <a href={`/api/storage${active.admissionLetterUrl}`} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Download Admission Letter
                  </a>
                </Button>
              )}

              <div>
                <p className="text-sm font-semibold text-primary mb-2">Submitted Documents</p>
                {!active.documents || active.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents were uploaded.</p>
                ) : (
                  <ul className="space-y-2">
                    {active.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                        <span className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm truncate">{doc.name}</span>
                        </span>
                        <a href={`/api/storage${doc.objectPath}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          <Download className="w-4 h-4" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
