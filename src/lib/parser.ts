import type { ParsedFile } from "@/types";

/**
 * Extract import paths from TypeScript/JavaScript source code.
 * Uses regex-based extraction (tree-sitter can be added later for accuracy).
 */

// Matches: import ... from "path" / import ... from 'path'
const ES_IMPORT_REGEX = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;

// Matches: require("path") / require('path')
const REQUIRE_REGEX = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

// Matches: export ... from "path"
const EXPORT_FROM_REGEX = /export\s+(?:[\s\S]*?\s+from\s+)['"]([^'"]+)['"]/g;

function extractRawImports(content: string): string[] {
  const imports = new Set<string>();

  for (const regex of [ES_IMPORT_REGEX, REQUIRE_REGEX, EXPORT_FROM_REGEX]) {
    // Reset lastIndex for each use
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      imports.add(match[1]);
    }
  }

  return Array.from(imports);
}

function isRelativeImport(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}

function resolveRelativeImport(
  fromFile: string,
  importPath: string,
  allPaths: Set<string>
): string | null {
  const fromDir = fromFile.split("/").slice(0, -1).join("/");
  const parts = importPath.split("/");
  const dirParts = fromDir.split("/").filter(Boolean);

  for (const part of parts) {
    if (part === "..") {
      dirParts.pop();
    } else if (part !== ".") {
      dirParts.push(part);
    }
  }

  const resolved = dirParts.join("/");

  // Try exact match, then with extensions
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  for (const ext of extensions) {
    const candidate = resolved + ext;
    if (allPaths.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function parseFile(path: string, content: string): ParsedFile {
  const lines = content.split("\n").length;
  const rawImports = extractRawImports(content);

  return {
    path,
    content,
    lines,
    imports: rawImports.filter(isRelativeImport),
  };
}

export function resolveImports(
  files: ParsedFile[],
  allPaths: Set<string>
): Map<string, string[]> {
  const resolved = new Map<string, string[]>();

  for (const file of files) {
    const resolvedImports: string[] = [];
    for (const imp of file.imports) {
      const target = resolveRelativeImport(file.path, imp, allPaths);
      if (target) {
        resolvedImports.push(target);
      }
    }
    resolved.set(file.path, resolvedImports);
  }

  return resolved;
}
