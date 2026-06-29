import { useMemo, useState } from "react";
import { useListApplications, useUpdateApplication } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { ApplicationUpdateStatus } from "@workspace/api-client-react";
import type { Application } from "@workspace/api-client-react";
import { Search, FileText, Download, CheckCircle2, XCircle } from "lucide-react";

const STATUSES = Object.values(ApplicationUpdateStatus);

export default function AdminApplications() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: applications, isLoading } = useListApplications();
  const updateApplication = useUpdateApplication();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Application | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [reviewNote, setReviewNote] = useState("");

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!applications) return [];
    const q = query.trim().toLowerCase();
    return applications.filter((a) => {
      const matchesQuery =
        q === "" ||
        a.fullName.toLowerCase().includes(q) ||
        a.email.toLowerCase().includes(q) ||
        a.programName.toLowerCase().includes(q);
      const matchesFilter = filter === "all" || a.status === filter;
      return matchesQuery && matchesFilter;
    });
  }, [applications, query, filter]);

  const openReview = (a: Application) => {
    setActive(a);
    setStatus(a.status);
    setReviewNote(a.reviewNote ?? "");
    setOpen(true);
  };

  const save = (nextStatus: string) => {
    if (!active) return;
    updateApplication.mutate(
      { id: active.id, data: { status: nextStatus as ApplicationUpdateStatus, reviewNote: reviewNote || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Updated", description: "Application status updated." });
          qc.invalidateQueries();
          setOpen(false);
        },
        onError: () =>
          toast({ title: "Error", description: "Could not update application.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Applications" description="Review and process admission applications." />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or program"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-11"
          />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-11 w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingCard />
      ) : !applications || applications.length === 0 ? (
        <EmptyCard message="No applications submitted yet." />
      ) : filtered.length === 0 ? (
        <EmptyCard message="No applications match your search." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.fullName}</TableCell>
                    <TableCell>{a.programName}</TableCell>
                    <TableCell className="text-muted-foreground">{a.email}</TableCell>
                    <TableCell>{a.documents?.length ?? 0}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell>{new Date(a.submittedAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openReview(a)}>Review</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif">Review Application</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-6">
              {/* Applicant details */}
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <Detail label="Full Name" value={active.fullName} />
                <Detail label="Email" value={active.email} />
                <Detail label="Phone" value={active.phone} />
                <Detail label="Date of Birth" value={active.dateOfBirth} />
                <Detail label="Gender" value={active.gender} />
                <Detail label="Nationality" value={active.nationality} />
                <Detail label="City" value={active.city} />
                <Detail label="Country" value={active.country} />
                <Detail label="Address" value={active.address} />
                <Detail label="Program" value={active.programName} />
                <Detail label="Qualification" value={active.previousQualification} />
                <Detail label="Institution" value={active.previousInstitution} />
                <Detail label="Graduation Year" value={active.graduationYear} />
                <Detail label="Grade" value={active.gradePercentage} />
              </div>

              {/* Documents */}
              <div>
                <p className="text-sm font-semibold text-primary mb-2">Documents</p>
                {!active.documents || active.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No documents uploaded.</p>
                ) : (
                  <ul className="space-y-2">
                    {active.documents.map((doc) => (
                      <li key={doc.id} className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border">
                        <span className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                          <span className="text-sm truncate">{doc.name}</span>
                        </span>
                        <a href={`/api/storage${doc.objectPath}`} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                          <Download className="w-4 h-4" /> View
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {active.status === "approved" && active.admissionLetterUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/storage${active.admissionLetterUrl}`} target="_blank" rel="noreferrer">
                    <Download className="w-4 h-4 mr-2" /> Download Admission Letter
                  </a>
                </Button>
              )}

              {/* Decision */}
              <div className="space-y-4 border-t border-border pt-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reviewNote">Remarks</Label>
                  <Textarea
                    id="reviewNote"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Remarks shared with the applicant (required for rejection)"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => save("rejected")}
              disabled={updateApplication.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button onClick={() => save(status)} disabled={updateApplication.isPending} variant="secondary">
              Save Status
            </Button>
            <Button onClick={() => save("approved")} disabled={updateApplication.isPending}>
              <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
