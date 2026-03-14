import type { GraphNode, GraphLink, ParsedFile, NodeType, Complexity } from "@/types";

function inferNodeType(path: string): NodeType {
  const lower = path.toLowerCase();
  const fileName = lower.split("/").pop() ?? "";

  // Test files: check filename patterns AND directory patterns
  if (
    fileName.includes(".test.") ||
    fileName.includes(".spec.") ||
    lower.includes("__tests__/") ||
    lower.includes("/test/") ||
    lower.includes("/tests/") ||
    lower.startsWith("test/") ||
    lower.startsWith("tests/")
  ) return "test";

  if (lower.includes("/api/") || fileName.startsWith("route.")) return "route";
  if (lower.includes("controller")) return "controller";
  if (lower.includes("/services/") || fileName.includes("service.")) return "service";
  if (lower.includes("model") || lower.includes("schema") || lower.includes("prisma")) return "model";
  if (lower.includes("middleware")) return "middleware";
  if (lower.includes(".config.") || fileName.startsWith("config.")) return "config";
  if (fileName.match(/^index\.(ts|js|tsx|jsx)$/) || fileName.startsWith("app.") || fileName.startsWith("main.")) return "entry";
  if (lower.includes("util") || lower.includes("helper")) return "util";
  if (lower.includes("/lib/") || lower.startsWith("lib/")) return "service";

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

  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  const links: GraphLink[] = [];
  Array.from(resolvedImports.entries()).forEach(([source, targets]) => {
    targets.forEach((target) => {
      const sourceNode = nodeById.get(source);
      const targetNode = nodeById.get(target);
      const sourceSignal = sourceNode ? sourceNode.imports + 1 : 1;
      const targetSignal = targetNode ? targetNode.importedBy + 1 : 1;

      links.push({
        source,
        target,
        strength: Math.max(1, Math.round((sourceSignal + targetSignal) / 2)),
      });
    });
  });

  return { nodes, links };
}
