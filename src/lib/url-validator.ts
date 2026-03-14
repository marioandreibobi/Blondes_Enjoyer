const GITHUB_URL_REGEX =
  /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/;

interface ParsedRepo {
  owner: string;
  repo: string;
}

export function validateGitHubUrl(url: string): ParsedRepo {
  const trimmed = url.trim();

  // Block non-HTTPS schemes (SSRF protection)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("file://") ||
    trimmed.startsWith("ftp://") ||
    trimmed.startsWith("data:")
  ) {
    throw new Error("Only HTTPS GitHub URLs are accepted");
  }

  // Block localhost / internal IPs (SSRF protection)
  const lower = trimmed.toLowerCase();
  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("0.0.0.0") ||
    lower.includes("169.254.") ||
    lower.includes("[::1]") ||
    lower.includes("10.") ||
    lower.includes("172.16.") ||
    lower.includes("172.17.") ||
    lower.includes("172.18.") ||
    lower.includes("172.19.") ||
    lower.includes("172.2") ||
    lower.includes("172.30.") ||
    lower.includes("172.31.") ||
    lower.includes("192.168.")
  ) {
    throw new Error("Internal URLs are not allowed");
  }

  // Strip trailing .git (common clone URL format)
  const cleaned = trimmed.replace(/\.git\/?$/, "");

  const match = cleaned.match(GITHUB_URL_REGEX);
  if (!match) {
    throw new Error(
      "Invalid GitHub URL. Expected format: https://github.com/{owner}/{repo}"
    );
  }

  return { owner: match[1], repo: match[2] };
}
