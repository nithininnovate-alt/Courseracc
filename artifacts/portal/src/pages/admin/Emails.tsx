import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEmailLogs,
  useResendEmailLog,
  getListEmailLogsQueryKey,
  type EmailLog,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Eye, RefreshCw, Loader2 } from "lucide-react";

export default function AdminEmails() {
  const { data: logs, isLoading } = useListEmailLogs();
  const [preview, setPreview] = useState<EmailLog | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const resend = useResendEmailLog({
    mutation: {
      onSuccess: (updated) => {
        qc.invalidateQueries({ queryKey: getListEmailLogsQueryKey() });
        toast({
          title: updated.status === "sent" ? "Email resent" : "Resend failed",
          description:
            updated.status === "sent"
              ? `Delivered to ${updated.recipient}.`
              : "The provider could not deliver this email.",
          variant: updated.status === "sent" ? undefined : "destructive",
        });
      },
      onError: () => {
        toast({
          title: "Resend failed",
          description: "Something went wrong while resending.",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="Email Logs" description="Outbound email activity and delivery status." />

      {isLoading ? (
        <LoadingCard />
      ) : !logs || logs.length === 0 ? (
        <EmptyCard message="No emails logged yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l) => {
                  const resending =
                    resend.isPending && resend.variables?.id === l.id;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.recipient}</TableCell>
                      <TableCell>{l.subject}</TableCell>
                      <TableCell className="text-muted-foreground">{l.template}</TableCell>
                      <TableCell><StatusBadge status={l.status} /></TableCell>
                      <TableCell>{new Date(l.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPreview(l)}
                        >
                          <Eye className="w-4 h-4 sm:mr-1" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        {l.status === "failed" && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="ml-2"
                            disabled={resending}
                            onClick={() => resend.mutate({ id: l.id })}
                          >
                            {resending ? (
                              <Loader2 className="w-4 h-4 animate-spin sm:mr-1" />
                            ) : (
                              <RefreshCw className="w-4 h-4 sm:mr-1" />
                            )}
                            <span className="hidden sm:inline">Resend</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.subject}</DialogTitle>
            <DialogDescription>
              To {preview?.recipient} · {preview?.template} ·{" "}
              {preview && new Date(preview.createdAt).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          {preview?.html ? (
            <div
              className="rounded-xl border border-border overflow-hidden bg-white"
              // eslint-disable-next-line react/no-danger
              dangerouslySetInnerHTML={{ __html: preview.html }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
              {preview?.body || "No content stored for this email."}
            </pre>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
