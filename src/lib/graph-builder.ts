import type { GraphNode, GraphLink, ParsedFile, NodeType, Complexity } from "@/types";

function inferNodeType(path: string): NodeType {
  const lower = path.toLowerCase();

  if (lower.includes(".test.") || lower.includes(".spec.") || lower.includes("__tests__")) return "test";
  if (lower.includes("/api/") || lower.includes("route.")) return "route";
  if (lower.includes("controller")) return "controller";
  if (lower.includes("service") || lower.includes("/lib/")) return "service";
  if (lower.includes("model") || lower.includes("schema") || lower.includes("prisma")) return "model";
  if (lower.includes("middleware")) return "middleware";
  if (lower.includes("config") || lower.includes(".config.")) return "config";
  if (lower.includes("util") || lower.includes("helper") || lower.includes("lib/")) return "util";
  if (lower.match(/index\.(ts|js|tsx|jsx)$/) || lower.includes("app.") || lower.includes("main.")) return "entry";

  return "util";
}

function inferComplexity(lines: number, importCount: number): Complexity {
  if (lines > 200 || importCount > 10) return "high";
  if (lines > 80 || importCount > 5) return "medium";
  return "low";
}

export function buildGraph(
  files: ParsedFile[],
  resolvedImports: Map<string, string[]>
): { nodes: GraphNode[]; links: GraphLink[] } {
  // Count how many files import each file
  const importedByCount = new Map<string, number>();
  Array.from(resolvedImports.values()).forEach((targets) => {
    targets.forEach((target) => {
      importedByCount.set(target, (importedByCount.get(target) ?? 0) + 1);
    });
  });

  const nodes: GraphNode[] = files.map((file) => {
    const importsOut = resolvedImports.get(file.path) ?? [];
    return {
      id: file.path,
      type: inferNodeType(file.path),
      lines: file.lines,
      imports: importsOut.length,
      importedBy: importedByCount.get(file.path) ?? 0,
      description: "", // Filled by AI later
      risk: null, // Filled by AI later
      complexity: inferComplexity(file.lines, importsOut.length),
    };
  });

  const links: GraphLink[] = [];
  Array.from(resolvedImports.entries()).forEach(([source, targets]) => {
    targets.forEach((target) => {
      links.push({ source, target });
    });
  });

  return { nodes, links };
}
