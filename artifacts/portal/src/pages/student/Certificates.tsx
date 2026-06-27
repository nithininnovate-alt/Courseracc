import { useListCertificates, useListCourses } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Download } from "lucide-react";
import { PageHeader, EmptyCard } from "@/components/common/PageState";

export default function StudentCertificates() {
  const { data: certificates, isLoading } = useListCertificates();
  const { data: courses } = useListCourses();

  const courseMap = new Map((courses ?? []).map((c) => [c.id, c]));

  return (
    <div className="space-y-8">
      <PageHeader title="Certificates" description="Your earned certificates and credentials." />

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      ) : !certificates || certificates.length === 0 ? (
        <EmptyCard message="You have not earned any certificates yet." />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certificates.map((c) => (
            <Card key={c.id} className="rounded-2xl">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="font-serif text-lg">
                  {courseMap.get(c.courseId)?.title ?? `Course #${c.courseId}`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Certificate No.</p>
                  <p className="font-mono text-foreground">{c.certificateNumber}</p>
                  <p className="pt-2">Issued {new Date(c.issuedAt).toLocaleDateString()}</p>
                </div>
                {c.fileUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={c.fileUrl} target="_blank" rel="noreferrer">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
