import { describe, it, expect } from "vitest";
import { parseFile, resolveImports } from "@/lib/parser";

describe("parseFile", () => {
  it("extracts ES module imports", () => {
    const content = `
import React from "react";
import { useState } from "react";
import MyComponent from "./components/MyComponent";
import utils from "../lib/utils";
`;
    const result = parseFile("src/app/page.ts", content);
    expect(result.lines).toBe(6);
    // Only relative imports are kept
    expect(result.imports).toContain("./components/MyComponent");
    expect(result.imports).toContain("../lib/utils");
    expect(result.imports).not.toContain("react");
  });

  it("extracts require() calls", () => {
    const content = `
const fs = require("fs");
const helper = require("./helper");
`;
    const result = parseFile("src/index.ts", content);
    expect(result.imports).toContain("./helper");
    expect(result.imports).not.toContain("fs");
  });

  it("extracts re-exports", () => {
    const content = `export { default } from "./Button";`;
    const result = parseFile("src/components/index.ts", content);
    expect(result.imports).toContain("./Button");
  });

  it("returns empty imports for files with none", () => {
    const content = `const x = 42;\nconsole.log(x);`;
    const result = parseFile("src/constants.ts", content);
    expect(result.imports).toHaveLength(0);
  });

  it("extracts @/ alias imports", () => {
    const content = `
import { prisma } from "@/lib/db";
import { validateUrl } from "@/lib/url-validator";
import React from "react";
import helper from "./helper";
`;
    const result = parseFile("src/app/api/route.ts", content);
    expect(result.imports).toContain("@/lib/db");
    expect(result.imports).toContain("@/lib/url-validator");
    expect(result.imports).toContain("./helper");
    expect(result.imports).not.toContain("react");
  });
});

describe("resolveImports", () => {
  it("resolves relative imports to actual file paths", () => {
    const files = [
      { path: "src/app/page.ts", content: "", lines: 10, imports: ["./layout"] },
      { path: "src/app/layout.ts", content: "", lines: 5, imports: [] },
    ];
    const allPaths = new Set(["src/app/page.ts", "src/app/layout.ts"]);
    const resolved = resolveImports(files, allPaths);

    expect(resolved.get("src/app/page.ts")).toContain("src/app/layout.ts");
  });

  it("resolves imports with extensions", () => {
    const files = [
      { path: "src/index.ts", content: "", lines: 1, imports: ["./utils"] },
      { path: "src/utils.ts", content: "", lines: 1, imports: [] },
    ];
    const allPaths = new Set(["src/index.ts", "src/utils.ts"]);
    const resolved = resolveImports(files, allPaths);

    expect(resolved.get("src/index.ts")).toContain("src/utils.ts");
  });

  it("resolves @/ alias imports to src/ paths", () => {
    const files = [
      { path: "src/app/api/route.ts", content: "", lines: 10, imports: ["@/lib/db", "@/lib/url-validator"] },
      { path: "src/lib/db.ts", content: "", lines: 5, imports: [] },
      { path: "src/lib/url-validator.ts", content: "", lines: 8, imports: [] },
    ];
    const allPaths = new Set(["src/app/api/route.ts", "src/lib/db.ts", "src/lib/url-validator.ts"]);
    const resolved = resolveImports(files, allPaths);

    expect(resolved.get("src/app/api/route.ts")).toContain("src/lib/db.ts");
    expect(resolved.get("src/app/api/route.ts")).toContain("src/lib/url-validator.ts");
  });

  it("resolves @/ alias imports to root paths when no src/ prefix", () => {
    const files = [
      { path: "app/page.ts", content: "", lines: 10, imports: ["@/lib/utils"] },
      { path: "lib/utils.ts", content: "", lines: 5, imports: [] },
    ];
    const allPaths = new Set(["app/page.ts", "lib/utils.ts"]);
    const resolved = resolveImports(files, allPaths);

    expect(resolved.get("app/page.ts")).toContain("lib/utils.ts");
  });

  it("resolves @/ alias imports with index files", () => {
    const files = [
      { path: "src/app/page.ts", content: "", lines: 10, imports: ["@/components/Button"] },
      { path: "src/components/Button/index.tsx", content: "", lines: 20, imports: [] },
    ];
    const allPaths = new Set(["src/app/page.ts", "src/components/Button/index.tsx"]);
    const resolved = resolveImports(files, allPaths);

    expect(resolved.get("src/app/page.ts")).toContain("src/components/Button/index.tsx");
  });
});
