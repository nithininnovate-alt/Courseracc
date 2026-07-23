import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNewsletters,
  useSendNewsletter,
  getListNewslettersQueryKey,
  useListNewsletterSubscribers,
  useListCourses,
  type Newsletter,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RichTextEditor from "@/components/common/RichTextEditor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  LoadingCard,
  EmptyCard,
} from "@/components/common/PageState";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, Eye, Copy, Globe } from "lucide-react";

const SITE_URL = "https://cgu.codeiac.software";

function buildEmbedCode(): string {
  return `<!-- Central Global University — Newsletter Signup -->
<div id="cgu-newsletter" style="max-width:420px;font-family:inherit">
  <form onsubmit="return cguSubscribe(this)">
    <input type="text" name="website" value="" style="display:none" tabindex="-1" autocomplete="off">
    <input type="text" name="name" placeholder="Your name (optional)"
      style="width:100%;padding:10px 12px;margin-bottom:8px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box">
    <input type="email" name="email" required placeholder="Your email address"
      style="width:100%;padding:10px 12px;margin-bottom:8px;border:1px solid #ccc;border-radius:8px;box-sizing:border-box">
    <button type="submit"
      style="width:100%;padding:10px 12px;background:#5b3a8e;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">
      Subscribe to our newsletter
    </button>
    <p data-cgu-msg style="margin:8px 0 0;font-size:13px"></p>
  </form>
</div>
<script>
function cguSubscribe(form){
  var msg=form.querySelector('[data-cgu-msg]');
  var btn=form.querySelector('button');
  btn.disabled=true;msg.textContent='';
  fetch('${SITE_URL}/api/newsletter/subscribe',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      email:form.email.value,
      name:form.name.value,
      website:form.website.value,
      source:location.hostname
    })
  }).then(function(r){return r.json()}).then(function(d){
    msg.textContent=d.message||(d.ok?'Thank you for subscribing!':'Something went wrong.');
    msg.style.color=d.ok?'#15803d':'#b91c1c';
    if(d.ok){form.email.value='';form.name.value='';}
  }).catch(function(){
    msg.textContent='Could not subscribe right now. Please try again later.';
    msg.style.color='#b91c1c';
  }).finally(function(){btn.disabled=false;});
  return false;
}
</script>`;
}

export default function AdminNewsletters() {
  const { data: newsletters, isLoading } = useListNewsletters();
  const { data: courses } = useListCourses();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [editorReset, setEditorReset] = useState(0);
  const [audience, setAudience] = useState<"all" | "course">("all");
  const [courseId, setCourseId] = useState<string>("");
  const [preview, setPreview] = useState<Newsletter | null>(null);

  const send = useSendNewsletter({
    mutation: {
      onSuccess: (n) => {
        qc.invalidateQueries({ queryKey: getListNewslettersQueryKey() });
        setSubject("");
        setBodyHtml("");
        setBodyText("");
        setEditorReset((k) => k + 1);
        setAudience("all");
        setCourseId("");
        toast({
          title: "Newsletter sent",
          description: `Sent to ${n.recipientCount} student${n.recipientCount === 1 ? "" : "s"}.`,
        });
      },
      onError: (err: unknown) => {
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data
            ?.error ?? "Something went wrong while sending.";
        toast({
          title: "Could not send",
          description: message,
          variant: "destructive",
        });
      },
    },
  });

  // An image-only newsletter has empty text but non-empty HTML.
  const hasContent =
    bodyText.trim().length > 0 ||
    (bodyHtml.length > 0 && bodyHtml.includes("<img"));
  const canSend =
    subject.trim().length > 0 &&
    hasContent &&
    (audience === "all" || courseId !== "") &&
    !send.isPending;

  const handleSend = () => {
    if (!canSend) return;
    send.mutate({
      data: {
        subject: subject.trim(),
        body: bodyText.trim() || subject.trim(),
        bodyHtml,
        audience,
        ...(audience === "course" ? { courseId: Number(courseId) } : {}),
      },
    });
  };

  const courseTitle = (id?: number | null) =>
    courses?.find((c) => c.id === id)?.title ?? `Course #${id}`;

  const { data: subscribers } = useListNewsletterSubscribers();
  const [embedOpen, setEmbedOpen] = useState(false);
  const embedCode = buildEmbedCode();
  const copyEmbed = async () => {
    await navigator.clipboard.writeText(embedCode);
    toast({
      title: "Embed code copied",
      description: "Paste it into a WordPress Custom HTML block.",
    });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Newsletters"
        description="Compose and send announcements to students by email."
      />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Compose newsletter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nl-audience">Audience</Label>
              <Select
                value={audience}
                onValueChange={(v) => setAudience(v as "all" | "course")}
              >
                <SelectTrigger id="nl-audience">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="course">Students in a course</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {audience === "course" && (
              <div className="space-y-2">
                <Label htmlFor="nl-course">Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger id="nl-course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nl-subject">Subject</Label>
            <Input
              id="nl-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. September enrolment now open"
            />
          </div>
          <div className="space-y-2">
            <Label>Message</Label>
            <RichTextEditor
              resetKey={editorReset}
              onChange={(html, text) => {
                setBodyHtml(html);
                setBodyText(text);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Use the toolbar for headings, formatting, links and images.
              Images are uploaded and embedded automatically.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSend} disabled={!canSend}>
              {send.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send newsletter
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <LoadingCard />
      ) : !newsletters || newsletters.length === 0 ? (
        <EmptyCard message="No newsletters sent yet." />
      ) : (
        <Card className="rounded-2xl">
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newsletters.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.subject}</TableCell>
                    <TableCell>
                      {n.audience === "course"
                        ? courseTitle(n.courseId)
                        : "All students"}
                    </TableCell>
                    <TableCell>{n.recipientCount}</TableCell>
                    <TableCell>
                      {new Date(n.sentAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPreview(n)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">
            External signups
            {subscribers ? ` (${subscribers.length})` : ""}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmbedOpen(true)}
            data-testid="button-embed-code"
          >
            <Globe className="w-4 h-4 mr-1" /> Get embed code
          </Button>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {!subscribers || subscribers.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              No external signups yet. Embed the signup form on your WordPress
              or other websites to start collecting subscribers here.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Source site</TableHead>
                  <TableHead>Signed up</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscribers.map((s) => (
                  <TableRow key={s.id} data-testid={`row-subscriber-${s.id}`}>
                    <TableCell className="font-medium">{s.email}</TableCell>
                    <TableCell>{s.name ?? "—"}</TableCell>
                    <TableCell>{s.source ?? "—"}</TableCell>
                    <TableCell>
                      {new Date(s.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Newsletter signup embed code</DialogTitle>
            <DialogDescription>
              In WordPress, add a <strong>Custom HTML</strong> block (or a
              widget) and paste this code. Signups land directly in the table
              above. Works on any website, not just WordPress.
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap break-all">
            {embedCode}
          </pre>
          <Button onClick={copyEmbed} data-testid="button-copy-embed">
            <Copy className="w-4 h-4 mr-2" /> Copy code
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{preview?.subject}</DialogTitle>
            <DialogDescription>
              {preview?.audience === "course"
                ? `Sent to students in ${courseTitle(preview?.courseId)}`
                : "Sent to all students"}{" "}
              · {preview ? new Date(preview.sentAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>
          {preview?.bodyHtml ? (
            // Server-sanitized HTML (allowlist enforced on save).
            <div
              className="prose prose-sm max-w-none max-h-80 overflow-y-auto [&_img]:max-w-full [&_img]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm text-muted-foreground max-h-80 overflow-y-auto">
              {preview?.body}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
