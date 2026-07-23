import { useState } from "react";
import {
  useListPartnerCenters,
  useCreatePartnerCenter,
  useUpdatePartnerCenter,
  useListDiscountCodes,
  useCreateDiscountCode,
  useUpdateDiscountCode,
  getListPartnerCentersQueryKey,
  getListDiscountCodesQueryKey,
  type PartnerCenter,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, EmptyCard } from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Plus, Ticket } from "lucide-react";

function discountLabel(c: PartnerCenter): string {
  return c.discountType === "percent"
    ? `${c.discountValue}% off`
    : `$${c.discountValue.toLocaleString()} off`;
}

export default function AdminPartnerCenters() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: centers, isLoading } = useListPartnerCenters();
  const { data: codes, isLoading: codesLoading } = useListDiscountCodes();

  const createCenter = useCreatePartnerCenter();
  const updateCenter = useUpdatePartnerCenter();
  const createCode = useCreateDiscountCode();
  const updateCode = useUpdateDiscountCode();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListPartnerCentersQueryKey() });
    qc.invalidateQueries({ queryKey: getListDiscountCodesQueryKey() });
  };

  const [centerOpen, setCenterOpen] = useState(false);
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">(
    "percent",
  );
  const [discountValue, setDiscountValue] = useState("");

  const [codeOpen, setCodeOpen] = useState(false);
  const [codeCenterId, setCodeCenterId] = useState<string>("");
  const [codeText, setCodeText] = useState("");

  const onError = (err: unknown) =>
    toast({
      title: "Something went wrong",
      description: err instanceof Error ? err.message : "Please try again.",
      variant: "destructive",
    });

  const submitCenter = () => {
    const value = Number(discountValue);
    if (!name.trim() || !(value > 0)) return;
    createCenter.mutate(
      { data: { name: name.trim(), discountType, discountValue: value } },
      {
        onSuccess: () => {
          setCenterOpen(false);
          setName("");
          setDiscountValue("");
          invalidate();
          toast({ title: "Partner center created" });
        },
        onError,
      },
    );
  };

  const submitCode = () => {
    if (!codeCenterId) return;
    createCode.mutate(
      {
        data: {
          centerId: Number(codeCenterId),
          ...(codeText.trim() ? { code: codeText.trim().toUpperCase() } : {}),
        },
      },
      {
        onSuccess: (res) => {
          setCodeOpen(false);
          setCodeText("");
          invalidate();
          toast({ title: "Code created", description: res.code });
        },
        onError,
      },
    );
  };

  if (isLoading || codesLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const activeCenters = (centers ?? []).filter((c) => c.active);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Partner Centers"
        description="Manage partner centers and the tuition discount codes they issue."
      />

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-serif text-xl">Centers</CardTitle>
          <Dialog open={centerOpen} onOpenChange={setCenterOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-new-center">
                <Plus className="w-4 h-4 mr-1" /> New center
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New partner center</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Center name"
                  data-testid="input-center-name"
                />
                <div className="flex gap-2">
                  <Select
                    value={discountType}
                    onValueChange={(v) =>
                      setDiscountType(v as "percent" | "fixed")
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent (%)</SelectItem>
                      <SelectItem value="fixed">Fixed ($)</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    max={discountType === "percent" ? 100 : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={
                      discountType === "percent" ? "e.g. 10" : "e.g. 250"
                    }
                    data-testid="input-center-discount"
                  />
                </div>
                <Button
                  onClick={submitCenter}
                  disabled={
                    createCenter.isPending ||
                    !name.trim() ||
                    !(Number(discountValue) > 0) ||
                    (discountType === "percent" && Number(discountValue) > 100)
                  }
                  className="w-full"
                  data-testid="button-create-center"
                >
                  {createCenter.isPending ? "Creating…" : "Create center"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(centers ?? []).length === 0 ? (
            <EmptyCard message="No partner centers yet. Create one to start issuing discount codes." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(centers ?? []).map((c) => (
                  <TableRow key={c.id} data-testid={`row-center-${c.id}`}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{discountLabel(c)}</TableCell>
                    <TableCell>
                      <Badge variant={c.active ? "default" : "secondary"}>
                        {c.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={c.active}
                        onCheckedChange={(active) =>
                          updateCenter.mutate(
                            { id: c.id, data: { active } },
                            { onSuccess: invalidate, onError },
                          )
                        }
                        data-testid={`switch-center-${c.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-serif text-xl">Discount codes</CardTitle>
          <Dialog open={codeOpen} onOpenChange={setCodeOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={activeCenters.length === 0}
                data-testid="button-new-code"
              >
                <Ticket className="w-4 h-4 mr-1" /> New code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New discount code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Select value={codeCenterId} onValueChange={setCodeCenterId}>
                  <SelectTrigger data-testid="select-code-center">
                    <SelectValue placeholder="Partner center" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCenters.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} ({discountLabel(c)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={codeText}
                  onChange={(e) => setCodeText(e.target.value.toUpperCase())}
                  placeholder="Code (optional — leave blank to auto-generate)"
                  className="uppercase"
                  data-testid="input-code-text"
                />
                <Button
                  onClick={submitCode}
                  disabled={createCode.isPending || !codeCenterId}
                  className="w-full"
                  data-testid="button-create-code"
                >
                  {createCode.isPending ? "Creating…" : "Create code"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {(codes ?? []).length === 0 ? (
            <EmptyCard message="No discount codes yet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Center</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(codes ?? []).map((code) => (
                  <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                    <TableCell className="font-mono font-medium">
                      {code.code}
                    </TableCell>
                    <TableCell>{code.centerName ?? "—"}</TableCell>
                    <TableCell data-testid={`text-code-uses-${code.id}`}>
                      {code.usageCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.active ? "default" : "secondary"}>
                        {code.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={code.active}
                        onCheckedChange={(active) =>
                          updateCode.mutate(
                            { id: code.id, data: { active } },
                            { onSuccess: invalidate, onError },
                          )
                        }
                        data-testid={`switch-code-${code.id}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
