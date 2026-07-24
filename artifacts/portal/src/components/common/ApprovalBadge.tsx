import { Badge } from "@/components/ui/badge";

/** Staff review outcome badge for an assignment submission. */
export function ApprovalBadge({ status }: { status?: string }) {
  if (status === "approved") {
    return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Approved</Badge>;
  }
  if (status === "needs_revision") {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Needs revision</Badge>;
  }
  return <Badge variant="secondary">Pending review</Badge>;
}
