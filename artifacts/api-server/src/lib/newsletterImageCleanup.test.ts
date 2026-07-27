import { describe, it, expect } from "vitest";
import { extractReferencedImageNames } from "./newsletterImageCleanup";

describe("extractReferencedImageNames", () => {
  it("extracts relative public-object image paths", () => {
    const set = extractReferencedImageNames([
      `<p>hi</p><img src="/api/storage/public-objects/newsletter-images/abc-123">`,
    ]);
    expect(set.has("newsletter-images/abc-123")).toBe(true);
  });

  it("extracts absolutized URLs", () => {
    const set = extractReferencedImageNames([
      `<img src="https://example.com/api/storage/public-objects/newsletter-images/uuid-1" alt="x">`,
    ]);
    expect(set.has("newsletter-images/uuid-1")).toBe(true);
  });

  it("ignores nulls and unrelated paths", () => {
    const set = extractReferencedImageNames([
      null,
      `<img src="/api/storage/public-objects/other/uuid-2">`,
    ]);
    expect(set.size).toBe(0);
  });
});
