import {
  useListCertificates,
  useListEligibleRecipients,
  useIssueCertificate,
  useRevokeCertificate,
  useListUsers,
  useListCourses,
  type EligibleRecipient,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Download, Ban, Award, ScrollText } from "lucide-react";

export default function AdminCertificates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: certificates, isLoading } = useListCertificates();
  const { data: eligible, isLoading: eligibleLoading } = useListEligibleRecipients();
  const { data: users } = useListUsers();
  const { data: courses } = useListCourses();
  const issue = useIssueCertificate();
  const revoke = useRevokeCertificate();

  const userMap = new Map((users ?? []).map((u) => [u.id, u]));
  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  const userName = (id: number) => {
    const u = userMap.get(id);
    if (!u) return `#${id}`;
    return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
  };

  const handleIssue = (r: EligibleRecipient, type: "degree" | "transcript") => {
    issue.mutate(
      { data: { userId: r.userId, courseId: r.courseId, type } },
      {
        onSuccess: () => {
          toast({ title: "Certificate issued", description: `${r.fullName} — ${r.courseTitle}` });
          qc.invalidateQueries();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not issue certificate.", variant: "destructive" }),
      },
    );
  };

  const handleRevoke = (id: number) => {
    if (!confirm("Revoke this certificate? The student will no longer be able to download it.")) return;
    revoke.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Certificate revoked" });
          qc.invalidateQueries();
        },
        onError: () =>
          toast({ title: "Error", description: "Could not revoke certificate.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Certificates"
        description="Issue degree certificates and transcripts, and manage issued credentials."
      />

      <section className="space-y-4">
        <h2 className="text-lg font-serif font-semibold text-primary">Eligible students</h2>
        {eligibleLoading ? (
          <LoadingCard />
        ) : !eligible || eligible.length === 0 ? (
          <EmptyCard message="No students have completed a course yet." />
        ) : (
          <Card className="rounded-2xl">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Issue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligible.map((r) => (
                    <TableRow key={`${r.userId}-${r.courseId}`}>
                      <TableCell>
                        <div className="font-medium">{r.fullName}</div>
                        <div className="text-xs text-muted-foreground">{r.email}</div>
                      </TableCell>
                      <TableCell>{r.courseTitle}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant={r.hasDegree ? "ghost" : "default"}
                            disabled={r.hasDegree || issue.isPending}
                            onClick={() => handleIssue(r, "degree")}
                          >
                            <Award className="w-4 h-4 mr-2" />
                            {r.hasDegree ? "Degree issued" : "Degree"}
                          </Button>
                          <Button
                            size="sm"
                            variant={r.hasTranscript ? "ghost" : "outline"}
                            disabled={r.hasTranscript || issue.isPending}
                            onClick={() => handleIssue(r, "transcript")}
                          >
                            <ScrollText className="w-4 h-4 mr-2" />
                            {r.hasTranscript ? "Transcript issued" : "Transcript"}
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
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-serif font-semibold text-primary">Issued certificates</h2>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.certificateNumber}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize border-0">
                          {c.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{userName(c.userId)}</TableCell>
                      <TableCell>{courseMap.get(c.courseId)?.title ?? `#${c.courseId}`}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.status === "revoked" ? "rejected" : "approved"} />
                      </TableCell>
                      <TableCell>{new Date(c.issuedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.status === "issued" ? (
                            <>
                              <Button size="sm" variant="outline" asChild>
                                <a
                                  href={`/api/certificates/${c.id}/download`}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRevoke(c.id)}
                                disabled={revoke.isPending}
                              >
                                <Ban className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-muted-foreground text-sm">Revoked</span>
                          )}
                        </div>
                      </TableCell>
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
