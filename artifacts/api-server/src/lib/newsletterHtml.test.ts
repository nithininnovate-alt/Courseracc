import { describe, it, expect } from "vitest";
import {
  sanitizeNewsletterHtml,
  absolutizeUrls,
  htmlToPlainText,
} from "./newsletterHtml";

describe("sanitizeNewsletterHtml", () => {
  it("keeps allowed formatting tags", () => {
    const out = sanitizeNewsletterHtml(
      "<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>One</li></ul>",
    );
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<strong>Bold</strong>");
    expect(out).toContain("<li>One</li>");
  });

  it("strips scripts and event handlers", () => {
    const out = sanitizeNewsletterHtml(
      `<p onclick="alert(1)">hi</p><script>alert(2)</script><img src="x" onerror="alert(3)">`,
    );
    expect(out).not.toContain("script");
    expect(out).not.toContain("onclick");
    expect(out).not.toContain("onerror");
    expect(out).toContain("hi");
  });

  it("blocks javascript: links", () => {
    const out = sanitizeNewsletterHtml(`<a href="javascript:alert(1)">x</a>`);
    expect(out).not.toContain("javascript:");
  });

  it("keeps relative public image paths and forces safe styling", () => {
    const out = sanitizeNewsletterHtml(
      `<img src="/api/storage/public-objects/newsletter-images/abc" alt="pic">`,
    );
    expect(out).toContain('src="/api/storage/public-objects/newsletter-images/abc"');
    expect(out).toContain("max-width:100%");
  });

  it("adds rel/target to links", () => {
    const out = sanitizeNewsletterHtml(`<a href="https://example.com">x</a>`);
    expect(out).toContain('rel="noopener noreferrer"');
    expect(out).toContain('target="_blank"');
  });

  it("strips iframes and forms", () => {
    const out = sanitizeNewsletterHtml(
      `<iframe src="https://evil.com"></iframe><form action="/x"><input></form><p>ok</p>`,
    );
    expect(out).not.toContain("iframe");
    expect(out).not.toContain("form");
    expect(out).toContain("<p>ok</p>");
  });
});

  it("drops images with unsafe or unknown src schemes", () => {
    const out = sanitizeNewsletterHtml(
      `<img src="data:text/html,x"><img src="//evil.com/a.png"><img src="/etc/passwd"><img src="https://ok.com/a.png"><p>ok</p>`,
    );
    expect(out).not.toContain("data:");
    expect(out).not.toContain("evil.com");
    expect(out).not.toContain("/etc/passwd");
    expect(out).toContain('src="https://ok.com/a.png"');
  });

  it("keeps image alt text and link URLs in plain text", () => {
    const out = htmlToPlainText(
      `<img src="/api/storage/public-objects/x" alt="Campus photo"><a href="https://cgu.edu">Visit</a>`,
    );
    expect(out).toContain("[Image: Campus photo]");
    expect(out).toContain("Visit (https://cgu.edu)");
  });

describe("absolutizeUrls", () => {
  it("rewrites relative src/href to the base origin", () => {
    const out = absolutizeUrls(
      `<img src="/api/storage/public-objects/a"><a href="/portal">x</a>`,
      "https://cgu.example.com/",
    );
    expect(out).toContain('src="https://cgu.example.com/api/storage/public-objects/a"');
    expect(out).toContain('href="https://cgu.example.com/portal"');
  });

  it("leaves absolute URLs untouched", () => {
    const html = `<img src="https://cdn.example.com/a.png">`;
    expect(absolutizeUrls(html, "https://cgu.example.com")).toBe(html);
  });
});

describe("htmlToPlainText", () => {
  it("converts structure to readable text", () => {
    const out = htmlToPlainText(
      "<h2>Hello</h2><p>World &amp; friends</p><ul><li>A</li><li>B</li></ul>",
    );
    expect(out).toContain("Hello");
    expect(out).toContain("World & friends");
    expect(out).toContain("• A");
  });
});
