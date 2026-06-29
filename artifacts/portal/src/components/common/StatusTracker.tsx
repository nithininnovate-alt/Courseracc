import { Check, X, Clock, Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER = ["pending", "under_review", "approved"] as const;

const STEP_META = [
  { key: "pending", label: "Submitted", icon: FileText },
  { key: "under_review", label: "Under Review", icon: Search },
  { key: "decision", label: "Decision", icon: Check },
];

export function StatusTracker({ status }: { status: string }) {
  const rejected = status === "rejected";
  const approved = status === "approved";
  const currentIndex = rejected || approved ? 2 : ORDER.indexOf(status as (typeof ORDER)[number]);

  return (
    <div className="flex items-center w-full">
      {STEP_META.map((step, i) => {
        const isDecision = i === 2;
        const done = i < currentIndex || (isDecision && (approved || rejected));
        const active = i === currentIndex && !rejected && !approved;

        let Icon = step.icon;
        let circleClass =
          "bg-muted text-muted-foreground border-border";
        let label = step.label;

        if (isDecision && rejected) {
          Icon = X;
          circleClass = "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400";
          label = "Rejected";
        } else if (isDecision && approved) {
          Icon = Check;
          circleClass = "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400";
          label = "Approved";
        } else if (done) {
          Icon = Check;
          circleClass = "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400";
        } else if (active) {
          Icon = Clock;
          circleClass = "bg-primary/10 text-primary border-primary/40";
        }

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full border-2 flex items-center justify-center transition-colors",
                  circleClass,
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium text-center whitespace-nowrap",
                  active || done || (isDecision && (approved || rejected))
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEP_META.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 -mt-6 rounded",
                  i < currentIndex ? "bg-green-400" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
