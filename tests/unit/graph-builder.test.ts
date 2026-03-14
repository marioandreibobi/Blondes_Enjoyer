import { describe, it, expect } from "vitest";
import { buildGraph } from "@/lib/graph-builder";
import type { ParsedFile } from "@/types";

describe("buildGraph", () => {
  it("creates nodes from parsed files", () => {
    const files: ParsedFile[] = [
      { path: "src/app/api/route.ts", content: "", lines: 50, imports: [] },
      { path: "src/lib/utils.ts", content: "", lines: 20, imports: [] },
    ];
    const resolvedImports = new Map<string, string[]>([
      ["src/app/api/route.ts", ["src/lib/utils.ts"]],
      ["src/lib/utils.ts", []],
    ]);

    const { nodes, links } = buildGraph(files, resolvedImports);

    expect(nodes).toHaveLength(2);
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({
      source: "src/app/api/route.ts",
      target: "src/lib/utils.ts",
    });
  });

  it("infers node types from file paths", () => {
    const files: ParsedFile[] = [
      { path: "src/app/api/route.ts", content: "", lines: 10, imports: [] },
      { path: "src/lib/utils.ts", content: "", lines: 10, imports: [] },
      { path: "src/middleware.ts", content: "", lines: 10, imports: [] },
      { path: "tests/unit/app.test.ts", content: "", lines: 10, imports: [] },
    ];
    const resolvedImports = new Map<string, string[]>();
    files.forEach((f) => resolvedImports.set(f.path, []));

    const { nodes } = buildGraph(files, resolvedImports);

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    expect(nodeMap.get("src/app/api/route.ts")?.type).toBe("route");
    expect(nodeMap.get("src/lib/utils.ts")?.type).toBe("service");
    expect(nodeMap.get("src/middleware.ts")?.type).toBe("middleware");
    expect(nodeMap.get("tests/unit/app.test.ts")?.type).toBe("test");
  });

  it("correctly counts importedBy", () => {
    const files: ParsedFile[] = [
      { path: "a.ts", content: "", lines: 10, imports: [] },
      { path: "b.ts", content: "", lines: 10, imports: [] },
      { path: "c.ts", content: "", lines: 10, imports: [] },
    ];
    const resolvedImports = new Map([
      ["a.ts", ["c.ts"]],
      ["b.ts", ["c.ts"]],
      ["c.ts", []],
    ]);

    const { nodes } = buildGraph(files, resolvedImports);
    const cNode = nodes.find((n) => n.id === "c.ts");
    expect(cNode?.importedBy).toBe(2);
  });

  it("infers complexity based on lines and imports", () => {
    const files: ParsedFile[] = [
      { path: "small.ts", content: "", lines: 20, imports: [] },
      { path: "medium.ts", content: "", lines: 100, imports: [] },
      { path: "large.ts", content: "", lines: 300, imports: [] },
    ];
    const resolvedImports = new Map<string, string[]>();
    files.forEach((f) => resolvedImports.set(f.path, []));

    const { nodes } = buildGraph(files, resolvedImports);
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    expect(nodeMap.get("small.ts")?.complexity).toBe("low");
    expect(nodeMap.get("medium.ts")?.complexity).toBe("medium");
    expect(nodeMap.get("large.ts")?.complexity).toBe("high");
  });
});
