import { useCallback, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Unlink,
  ImagePlus,
  Loader2,
  Undo2,
  Redo2,
} from "lucide-react";

interface RichTextEditorProps {
  /** Called with the current HTML and plain text on every change. */
  onChange: (html: string, text: string) => void;
  placeholder?: string;
  /** Increment to clear the editor (e.g. after a successful send). */
  resetKey?: number;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0"
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </Button>
  );
}

async function uploadPublicImage(file: File): Promise<string> {
  const res = await fetch("/api/storage/uploads/request-public-url", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-portal": "admin" },
    credentials: "include",
    body: JSON.stringify({
      name: file.name,
      size: file.size,
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to get upload URL");
  }
  const { uploadURL, objectPath } = (await res.json()) as {
    uploadURL: string;
    objectPath: string;
  };
  const put = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!put.ok) throw new Error("Failed to upload image");
  // objectPath is like /public-objects/newsletter-images/<id>; the API serves
  // it at /api/storage/public-objects/... — that path is stored in the HTML
  // and absolutized server-side at send time.
  return `/api/storage${objectPath}`;
}

export default function RichTextEditor({
  onChange,
  placeholder,
  resetKey,
}: RichTextEditorProps) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const lastReset = useRef(resetKey);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Image.configure({ inline: false }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[220px] px-3 py-2 focus:outline-none [&_img]:max-w-full [&_img]:rounded-lg",
        ...(placeholder ? { "data-placeholder": placeholder } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? "" : editor.getHTML(), editor.getText());
    },
  });

  if (editor && resetKey !== lastReset.current) {
    lastReset.current = resetKey;
    editor.commands.clearContent();
  }

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const handleImageFile = useCallback(
    async (file: File) => {
      if (!editor) return;
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Not an image",
          description: "Please choose an image file.",
          variant: "destructive",
        });
        return;
      }
      setUploading(true);
      try {
        const src = await uploadPublicImage(file);
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      } catch (err) {
        toast({
          title: "Image upload failed",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    },
    [editor, toast],
  );

  if (!editor) return null;
  const e: Editor = editor;

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1">
        <ToolbarButton
          title="Bold"
          active={e.isActive("bold")}
          onClick={() => e.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={e.isActive("italic")}
          onClick={() => e.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Heading"
          active={e.isActive("heading", { level: 2 })}
          onClick={() => e.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Subheading"
          active={e.isActive("heading", { level: 3 })}
          onClick={() => e.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={e.isActive("bulletList")}
          onClick={() => e.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={e.isActive("orderedList")}
          onClick={() => e.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Quote"
          active={e.isActive("blockquote")}
          onClick={() => e.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton title="Add link" active={e.isActive("link")} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Remove link"
          disabled={!e.isActive("link")}
          onClick={() => e.chain().focus().unsetLink().run()}
        >
          <Unlink className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          title="Insert image"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
        </ToolbarButton>
        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarButton
            title="Undo"
            disabled={!e.can().undo()}
            onClick={() => e.chain().focus().undo().run()}
          >
            <Undo2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            title="Redo"
            disabled={!e.can().redo()}
            onClick={() => e.chain().focus().redo().run()}
          >
            <Redo2 className="h-4 w-4" />
          </ToolbarButton>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (f) void handleImageFile(f);
            ev.target.value = "";
          }}
        />
      </div>
      <EditorContent editor={e} />
    </div>
  );
}
