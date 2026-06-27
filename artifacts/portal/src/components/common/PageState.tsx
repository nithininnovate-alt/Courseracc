import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Inbox } from "lucide-react";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-serif font-bold text-primary">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function LoadingCard() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export function EmptyCard({ message }: { message: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="py-16 text-center text-muted-foreground">
        <Inbox className="w-10 h-10 mx-auto mb-4 opacity-40" />
        {message}
      </CardContent>
    </Card>
  );
}
