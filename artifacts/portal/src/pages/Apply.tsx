import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useCreateApplication,
  useListCourses,
  type ApplicationDocumentInput,
} from "@workspace/api-client-react";
import { useUpload } from "@workspace/object-storage-web";
import { useUser } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ArrowLeft, ArrowRight, Upload, FileText, X, Loader2 } from "lucide-react";
import cguLogo from "@assets/cropped-cgu_logo-768x244_1782643160003.png";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const STEPS = ["Personal", "Academic", "Program", "Documents", "Review"] as const;

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  address: string;
  city: string;
  country: string;
  previousQualification: string;
  previousInstitution: string;
  graduationYear: string;
  gradePercentage: string;
  programName: string;
  courseId: number | undefined;
}

const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  nationality: "",
  address: "",
  city: "",
  country: "",
  previousQualification: "",
  previousInstitution: "",
  graduationYear: "",
  gradePercentage: "",
  programName: "",
  courseId: undefined,
};

export default function ApplyPage() {
  const { toast } = useToast();
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const createApplication = useCreateApplication();
  const { data: courses } = useListCourses();

  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [documents, setDocuments] = useState<ApplicationDocumentInput[]>([]);
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    fullName: [user?.firstName, user?.lastName].filter(Boolean).join(" "),
    email: user?.primaryEmailAddress?.emailAddress ?? "",
  });

  const set = (key: keyof FormState, value: string | number | undefined) =>
    setForm((f) => ({ ...f, [key]: value }));

  const text = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(key, e.target.value);

  const canProceed = (): boolean => {
    if (step === 0) return form.fullName.trim() !== "" && form.email.trim() !== "";
    if (step === 2) return form.programName.trim() !== "";
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = () => {
    createApplication.mutate(
      {
        data: {
          programName: form.programName,
          courseId: form.courseId,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || undefined,
          dateOfBirth: form.dateOfBirth || undefined,
          gender: form.gender || undefined,
          nationality: form.nationality || undefined,
          address: form.address || undefined,
          city: form.city || undefined,
          country: form.country || undefined,
          previousQualification: form.previousQualification || undefined,
          previousInstitution: form.previousInstitution || undefined,
          graduationYear: form.graduationYear || undefined,
          gradePercentage: form.gradePercentage || undefined,
          documents: documents.length > 0 ? documents : undefined,
        },
      },
      {
        onSuccess: () => setSubmitted(true),
        onError: () =>
          toast({ title: "Error", description: "Could not submit your application.", variant: "destructive" }),
      },
    );
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/30 font-sans py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="rounded-2xl">
            <CardContent className="py-16 text-center space-y-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
              <h2 className="text-2xl font-serif font-bold text-primary">Application Received</h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                Thank you for applying to Central Global University. A confirmation email has been sent to{" "}
                <span className="font-medium text-foreground">{form.email}</span>. You can track your application
                status anytime from your dashboard.
              </p>
              <div className="flex justify-center gap-3 pt-2">
                <Button onClick={() => setLocation("/portal/applications")}>Track Application</Button>
                <Button variant="outline" onClick={() => setLocation("/portal")}>Go to Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 font-sans py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link href="/portal" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <div className="mb-8">
          <img src={cguLogo} alt="Central Global University" className="h-12 w-auto" />
        </div>

        {/* Stepper */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors",
                    i < step
                      ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400"
                      : i === step
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border",
                  )}
                >
                  {i < step ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                </div>
                <span className={cn("text-[11px] font-medium hidden sm:block", i === step ? "text-primary" : "text-muted-foreground")}>
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("flex-1 h-0.5 mx-2 -mt-5 rounded", i < step ? "bg-green-400" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-2xl font-serif text-primary">
              {step === 0 && "Personal Information"}
              {step === 1 && "Academic Background"}
              {step === 2 && "Program Selection"}
              {step === 3 && "Supporting Documents"}
              {step === 4 && "Review & Submit"}
            </CardTitle>
            <CardDescription>
              {step === 0 && "Tell us a bit about yourself."}
              {step === 1 && "Share your previous education details."}
              {step === 2 && "Choose the programme you wish to apply for."}
              {step === 3 && "Upload transcripts, ID, or other supporting files (PDF or images)."}
              {step === 4 && "Please review your details before submitting."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" required value={form.fullName} onChange={text("fullName")} className="h-12" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" required value={form.email} onChange={text("email")} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={form.phone} onChange={text("phone")} className="h-12" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input id="dateOfBirth" type="date" value={form.dateOfBirth} onChange={text("dateOfBirth")} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="undisclosed">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nationality">Nationality</Label>
                    <Input id="nationality" value={form.nationality} onChange={text("nationality")} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" value={form.city} onChange={text("city")} className="h-12" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" value={form.country} onChange={text("country")} className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" value={form.address} onChange={text("address")} className="h-12" />
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="previousQualification">Highest Qualification</Label>
                  <Input id="previousQualification" value={form.previousQualification} onChange={text("previousQualification")} placeholder="e.g. High School Diploma, BSc" className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="previousInstitution">Institution</Label>
                  <Input id="previousInstitution" value={form.previousInstitution} onChange={text("previousInstitution")} className="h-12" />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="graduationYear">Graduation Year</Label>
                    <Input id="graduationYear" value={form.graduationYear} onChange={text("graduationYear")} placeholder="e.g. 2023" className="h-12" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gradePercentage">Grade / Percentage</Label>
                    <Input id="gradePercentage" value={form.gradePercentage} onChange={text("gradePercentage")} placeholder="e.g. 85% or 3.8 GPA" className="h-12" />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                {courses && courses.length > 0 && (
                  <div className="space-y-2">
                    <Label>Select a Programme</Label>
                    <Select
                      value={form.courseId ? String(form.courseId) : ""}
                      onValueChange={(v) => {
                        const c = courses.find((x) => String(x.id) === v);
                        set("courseId", c?.id);
                        if (c) set("programName", c.title);
                      }}
                    >
                      <SelectTrigger className="h-12"><SelectValue placeholder="Choose from catalog" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.title} <span className="capitalize text-muted-foreground">({c.level})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="programName">Programme Name *</Label>
                  <Input id="programName" required value={form.programName} onChange={text("programName")} placeholder="e.g. BSc Computer Science" className="h-12" />
                  <p className="text-xs text-muted-foreground">Pick from the catalog above or type the programme you are interested in.</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <DocumentStep documents={documents} setDocuments={setDocuments} />
            )}

            {step === 4 && (
              <ReviewStep form={form} documents={documents} />
            )}

            <div className="flex justify-between gap-3 pt-8">
              <Button variant="outline" onClick={back} disabled={step === 0} className="h-12">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button onClick={next} disabled={!canProceed()} className="h-12">
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={createApplication.isPending} className="h-12 font-semibold">
                  {createApplication.isPending ? "Submitting..." : "Submit Application"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DocumentStep({
  documents,
  setDocuments,
}: {
  documents: ApplicationDocumentInput[];
  setDocuments: React.Dispatch<React.SetStateAction<ApplicationDocumentInput[]>>;
}) {
  const { toast } = useToast();
  const { uploadFile, isUploading } = useUpload({
    onError: () => toast({ title: "Upload failed", description: "Could not upload file.", variant: "destructive" }),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const res = await uploadFile(file);
      if (res) {
        setDocuments((d) => [
          ...d,
          { name: file.name, type: file.type || "document", objectPath: res.objectPath },
        ]);
      }
    }
  };

  return (
    <div className="space-y-4">
      <label
        className={cn(
          "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl py-12 cursor-pointer transition-colors",
          isUploading ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/50",
        )}
      >
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : (
          <Upload className="w-8 h-8 text-muted-foreground" />
        )}
        <span className="text-sm font-medium text-muted-foreground">
          {isUploading ? "Uploading..." : "Click to upload supporting documents"}
        </span>
        <input
          type="file"
          multiple
          className="hidden"
          disabled={isUploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc, i) => (
            <li key={i} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card">
              <span className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm truncate">{doc.name}</span>
              </span>
              <button
                type="button"
                onClick={() => setDocuments((d) => d.filter((_, idx) => idx !== i))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Documents are optional but recommended. You can upload more than one file.</p>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function ReviewStep({ form, documents }: { form: FormState; documents: ApplicationDocumentInput[] }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-primary mb-2">Programme</h3>
        <ReviewRow label="Programme" value={form.programName} />
      </section>
      <section>
        <h3 className="text-sm font-semibold text-primary mb-2">Personal</h3>
        <ReviewRow label="Full Name" value={form.fullName} />
        <ReviewRow label="Email" value={form.email} />
        <ReviewRow label="Phone" value={form.phone} />
        <ReviewRow label="Date of Birth" value={form.dateOfBirth} />
        <ReviewRow label="Gender" value={form.gender} />
        <ReviewRow label="Nationality" value={form.nationality} />
        <ReviewRow label="City" value={form.city} />
        <ReviewRow label="Country" value={form.country} />
        <ReviewRow label="Address" value={form.address} />
      </section>
      <section>
        <h3 className="text-sm font-semibold text-primary mb-2">Academic</h3>
        <ReviewRow label="Qualification" value={form.previousQualification} />
        <ReviewRow label="Institution" value={form.previousInstitution} />
        <ReviewRow label="Graduation Year" value={form.graduationYear} />
        <ReviewRow label="Grade" value={form.gradePercentage} />
      </section>
      <section>
        <h3 className="text-sm font-semibold text-primary mb-2">Documents ({documents.length})</h3>
        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <ul className="space-y-1">
            {documents.map((d, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-primary" /> {d.name}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
