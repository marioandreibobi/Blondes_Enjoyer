import { describe, it, expect } from "vitest";
import { validateGitHubUrl } from "@/lib/url-validator";

describe("validateGitHubUrl", () => {
  it("accepts valid GitHub HTTPS URLs", () => {
    const result = validateGitHubUrl("https://github.com/vercel/next.js");
    expect(result).toEqual({ owner: "vercel", repo: "next.js" });
  });

  it("accepts URLs with trailing slash", () => {
    const result = validateGitHubUrl("https://github.com/facebook/react/");
    expect(result).toEqual({ owner: "facebook", repo: "react" });
  });

  it("rejects HTTP URLs", () => {
    expect(() =>
      validateGitHubUrl("http://github.com/owner/repo")
    ).toThrow("Only HTTPS GitHub URLs are accepted");
  });

  it("rejects file:// URLs (SSRF)", () => {
    expect(() =>
      validateGitHubUrl("file:///etc/passwd")
    ).toThrow("Only HTTPS GitHub URLs are accepted");
  });

  it("rejects localhost URLs (SSRF)", () => {
    expect(() =>
      validateGitHubUrl("https://localhost:3000/api/analyze")
    ).toThrow("Internal URLs are not allowed");
  });

  it("rejects 127.0.0.1 URLs (SSRF)", () => {
    expect(() =>
      validateGitHubUrl("https://127.0.0.1/owner/repo")
    ).toThrow("Internal URLs are not allowed");
  });

  it("rejects private IP ranges (SSRF)", () => {
    expect(() =>
      validateGitHubUrl("https://192.168.1.1/owner/repo")
    ).toThrow("Internal URLs are not allowed");
  });

  it("rejects non-GitHub domains", () => {
    expect(() =>
      validateGitHubUrl("https://gitlab.com/owner/repo")
    ).toThrow("Invalid GitHub URL");
  });

  it("rejects URLs with extra path segments", () => {
    expect(() =>
      validateGitHubUrl("https://github.com/owner/repo/tree/main")
    ).toThrow("Invalid GitHub URL");
  });

  it("rejects empty string", () => {
    expect(() => validateGitHubUrl("")).toThrow();
  });
});
