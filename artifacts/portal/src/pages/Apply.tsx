import { useState } from "react";
import { Link } from "wouter";
import { useCreateApplication } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, CheckCircle2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ApplyPage() {
  const { toast } = useToast();
  const createApplication = useCreateApplication();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    programName: "",
    fullName: "",
    email: "",
    phone: "",
    documentsUrl: "",
  });

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createApplication.mutate(
      {
        data: {
          programName: form.programName,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          documentsUrl: form.documentsUrl || undefined,
        },
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: () =>
          toast({ title: "Error", description: "Could not submit your application.", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="min-h-screen bg-muted/30 font-sans py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Globe className="text-primary-foreground w-7 h-7" />
          </div>
          <span className="text-2xl font-bold font-serif tracking-tight text-primary">Central Global</span>
        </div>

        {submitted ? (
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-2xl font-serif font-bold text-primary">Application Received</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Thank you for applying to Central Global University. Our admissions team will review your
                application and contact you by email.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button asChild><Link href="/sign-in">Sign In</Link></Button>
                <Button variant="outline" asChild><Link href="/">Return Home</Link></Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-2xl font-serif text-primary">Apply for Admission</CardTitle>
              <CardDescription>Complete the form below to begin your application.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="programName">Program of Interest</Label>
                  <Input id="programName" required value={form.programName} onChange={update("programName")} placeholder="e.g. BSc Computer Science" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" required value={form.fullName} onChange={update("fullName")} className="h-12" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" required value={form.email} onChange={update("email")} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={update("phone")} className="h-12" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentsUrl">Documents URL (optional)</Label>
                  <Input id="documentsUrl" value={form.documentsUrl} onChange={update("documentsUrl")} placeholder="https://..." className="h-12" />
                </div>
                <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={createApplication.isPending}>
                  {createApplication.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
