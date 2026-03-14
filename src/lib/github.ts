import { Octokit } from "@octokit/rest";
import type { RepoTreeItem } from "@/types";

function getOctokit(): Octokit {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }
  return new Octokit({ auth: token });
}

export async function fetchRepoTree(
  owner: string,
  repo: string
): Promise<RepoTreeItem[]> {
  const octokit = getOctokit();

  // Get default branch SHA first — "HEAD" literal doesn't work with getTree
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${defaultBranch}`,
  });
  const commitSha = refData.object.sha;

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: commitSha,
    recursive: "true",
  });

  return data.tree
    .filter(
      (item): item is typeof item & { path: string; sha: string } =>
        item.path !== undefined && item.sha !== undefined
    )
    .map((item) => ({
      path: item.path,
      type: item.type as "blob" | "tree",
      size: item.size,
      sha: item.sha,
    }));
}

export async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const octokit = getOctokit();

  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  if (Array.isArray(data) || data.type !== "file") {
    throw new Error(`Path ${path} is not a file`);
  }

  return Buffer.from(data.content, "base64").toString("utf-8");
}

const ANALYZABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".mjs",
  ".cts",
  ".cjs",
  ".py",
]);

export function isAnalyzableFile(path: string): boolean {
  return ANALYZABLE_EXTENSIONS.has(
    "." + path.split(".").pop()?.toLowerCase()
  );
}

export async function fetchRepoLanguage(
  owner: string,
  repo: string
): Promise<string> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.get({ owner, repo });
  return data.language ?? "unknown";
}
