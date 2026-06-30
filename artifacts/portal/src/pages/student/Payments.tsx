import { useEffect, useState } from "react";
import {
  useListPayments,
  useListCourses,
  useCreatePayment,
  useCapturePaypalOrder,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { PageHeader, LoadingCard, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";

export default function StudentPayments() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: payments, isLoading } = useListPayments();
  const { data: courses } = useListCourses();
  const createPayment = useCreatePayment();
  const captureOrder = useCapturePaypalOrder();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [courseId, setCourseId] = useState<string>("");

  // Capture a PayPal order when returning from approval (?token=ORDER_ID).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const token = sp.get("token");
    if (!token) return;
    window.history.replaceState({}, "", window.location.pathname);
    captureOrder.mutate(
      { data: { orderId: token } },
      {
        onSuccess: () => {
          toast({ title: "Payment successful", description: "Your payment has been confirmed." });
          qc.invalidateQueries();
        },
        onError: () =>
          toast({ title: "Payment not completed", description: "We could not confirm your payment.", variant: "destructive" }),
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePay = () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid payment amount.", variant: "destructive" });
      return;
    }
    createPayment.mutate(
      { data: { amount: value, courseId: courseId ? Number(courseId) : undefined } },
      {
        onSuccess: () => {
          toast({ title: "Payment recorded", description: "Your payment has been submitted." });
          qc.invalidateQueries();
          setOpen(false);
          setAmount("");
          setCourseId("");
        },
        onError: () =>
          toast({ title: "Error", description: "Could not record payment.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Payments"
        description="View your transactions, download invoices, and make payments."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Make a Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Make a Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (USD)</Label>
                  <Input id="amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Course (optional)</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                    <SelectContent>
                      {(courses ?? []).map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handlePay} disabled={createPayment.isPending}>
                  {createPayment.isPending ? "Processing..." : "Pay"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <LoadingCard />
      ) : !payments || payments.length === 0 ? (
        <EmptyCard message="No payments yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice / Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.invoiceNumber ?? p.reference ?? `#${p.id}`}</TableCell>
                    <TableCell className="font-medium">{p.currency} {p.amount.toLocaleString()}</TableCell>
                    <TableCell className="capitalize">{p.provider}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {p.status === "completed" ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/api/payments/${p.id}/invoice`} target="_blank" rel="noreferrer">
                            <Download className="w-4 h-4 mr-2" /> PDF
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
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
