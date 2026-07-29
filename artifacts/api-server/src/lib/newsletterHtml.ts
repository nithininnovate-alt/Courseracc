import sanitizeHtml from "sanitize-html";

/**
 * Server-side sanitizer for admin-composed newsletter HTML. Allowlist only —
 * formatting tags, links, lists, and images. Everything else (scripts, event
 * handlers, styles beyond a safe subset, iframes, forms) is stripped.
 */
/** Only http(s) URLs or app-served public object paths are valid image sources. */
function isAllowedImageSrc(src: string | undefined): boolean {
  if (!src) return false;
  if (/^https?:\/\//i.test(src)) return true;
  return src.startsWith("/api/storage/public-objects/");
}

export function sanitizeNewsletterHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "h1",
      "h2",
      "h3",
      "h4",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "hr",
      "span",
      "div",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "width", "height", "style"],
      "*": [],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    // Drop images whose src is not https/http or an app-served public object.
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !isAllowedImageSrc(frame.attribs.src),
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
      img: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          style: "max-width:100%;height:auto;border-radius:8px;",
        },
      }),
    },
  });
}

/**
 * Email clients cannot resolve relative URLs — rewrite relative image sources
 * (and links) to absolute URLs on the app's public domain at send time.
 */
export function absolutizeUrls(html: string, baseUrl: string): string {
  const origin = baseUrl.replace(/\/+$/, "");
  return html.replace(
    /(src|href)="(\/[^"]*)"/g,
    (_m, attr, path) => `${attr}="${origin}${path}"`,
  );
}

/** Resolve the externally reachable base URL for links/images in emails. */
export function publicBaseUrl(): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const domains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN;
  const first = domains?.split(",")[0]?.trim();
  return first ? `https://${first}` : "";
}

/** True if the HTML still contains relative (non-absolute) src/href URLs. */
export function hasRelativeUrls(html: string): boolean {
  return /(src|href)="\/[^"]*"/.test(html);
}

/** Derive a plain-text fallback from newsletter HTML. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<img[^>]*alt="([^"]+)"[^>]*>/gi, "[Image: $1]\n")
    .replace(/<img[^>]*>/gi, "[Image]\n")
    .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "$2 ($1)")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
