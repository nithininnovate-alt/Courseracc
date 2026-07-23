import { useState } from "react";
import { useValidateDiscountCode } from "@workspace/api-client-react";
import type { DiscountValidation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BadgePercent, X } from "lucide-react";

interface DiscountCodeFieldProps {
  courseId: number;
  planId?: number | null;
  /** The currently applied (server-validated) discount, or null. */
  applied: DiscountValidation | null;
  onApplied: (validation: DiscountValidation | null) => void;
}

/**
 * Checkout discount-code entry. A code only takes effect after server
 * validation succeeds; removing it reverts to full price.
 */
export function DiscountCodeField({
  courseId,
  planId,
  applied,
  onApplied,
}: DiscountCodeFieldProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const validate = useValidateDiscountCode();

  const apply = () => {
    if (!code.trim()) return;
    setError(null);
    validate.mutate(
      {
        data: {
          code: code.trim(),
          courseId,
          ...(planId != null ? { planId } : {}),
        },
      },
      {
        onSuccess: (res) => {
          if (res.valid) {
            onApplied(res);
            setError(null);
          } else {
            onApplied(null);
            setError(res.error ?? "This code is not valid.");
          }
        },
        onError: () => {
          onApplied(null);
          setError("Could not check the code. Please try again.");
        },
      },
    );
  };

  if (applied?.valid) {
    return (
      <div className="w-full max-w-md rounded-xl border border-primary/40 bg-primary/5 p-3 text-left">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm">
            <BadgePercent className="w-4 h-4 text-primary" />
            <span className="font-medium">{applied.code}</span>
            <span className="text-muted-foreground">
              {applied.centerName ? `via ${applied.centerName}` : ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => {
              onApplied(null);
              setCode("");
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Amount due</span>
            <span>${(applied.amountDue ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Partner discount</span>
            <span>-${(applied.discountAmount ?? 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total to pay</span>
            <span className="text-primary">
              ${(applied.total ?? 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md text-left space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Partner discount code (optional)"
          className="uppercase"
          data-testid="input-discount-code"
        />
        <Button
          type="button"
          variant="outline"
          onClick={apply}
          disabled={validate.isPending || !code.trim()}
          data-testid="button-apply-discount"
        >
          {validate.isPending ? "Checking…" : "Apply"}
        </Button>
      </div>
      {error && (
        <p className="text-xs text-destructive" data-testid="text-discount-error">
          {error}
        </p>
      )}
    </div>
  );
}
