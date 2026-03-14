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

/**
 * Python import patterns:
 * - import foo           → "foo"
 * - import foo.bar       → "foo.bar"
 * - from foo import bar  → "foo"
 * - from . import foo    → "."
 * - from .foo import bar → ".foo"
 * - from ..foo import x  → "..foo"
 */
const PY_IMPORT_REGEX = /^import\s+(\S+)/gm;
const PY_FROM_IMPORT_REGEX = /^from\s+(\S+)\s+import/gm;

function extractRawImportsJS(content: string): string[] {
  const imports = new Set<string>();

  for (const regex of [ES_IMPORT_REGEX, REQUIRE_REGEX, EXPORT_FROM_REGEX]) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      imports.add(match[1]);
    }
  }

  return Array.from(imports);
}

function extractRawImportsPython(content: string): string[] {
  const imports = new Set<string>();

  PY_IMPORT_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PY_IMPORT_REGEX.exec(content)) !== null) {
    // Skip "import" that's part of "from ... import" (already on same line)
    const modulePath = match[1];
    // Handle "import foo, bar" — take the first module
    const firstModule = modulePath.split(",")[0].trim();
    if (firstModule) {
      imports.add(firstModule);
    }
  }

  PY_FROM_IMPORT_REGEX.lastIndex = 0;
  while ((match = PY_FROM_IMPORT_REGEX.exec(content)) !== null) {
    imports.add(match[1]);
  }

  return Array.from(imports);
}

function isPythonFile(path: string): boolean {
  return path.endsWith(".py");
}

function isRelativeImportJS(importPath: string): boolean {
  return importPath.startsWith("./") || importPath.startsWith("../");
}

function isPythonRelativeImport(importPath: string): boolean {
  return importPath.startsWith(".");
}

/**
 * Strip JS/TS extensions from an import path so we can try all possible
 * file extensions during resolution. TypeScript files often import with
 * .js extensions that actually map to .ts files.
 */
function stripJsExtension(importPath: string): string {
  return importPath.replace(/\.(js|jsx|mjs|cjs|ts|tsx|mts|cts)$/, "");
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
  // Also try with the extension stripped (e.g. './types.js' -> './types')
  const resolvedStripped = stripJsExtension(resolved);

  // Try exact match, then with extensions, for both the raw and stripped path
  const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];
  for (const base of [resolved, resolvedStripped]) {
    for (const ext of extensions) {
      const candidate = base + ext;
      if (allPaths.has(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

/**
 * Resolve a Python import path to a file in the repo.
 * Python uses dot notation: "from .utils import foo" means ./utils.py
 * Relative imports start with dots: "." = current package, ".." = parent
 * Absolute imports like "foo.bar" map to foo/bar.py or foo/bar/__init__.py
 */
function resolvePythonImport(
  fromFile: string,
  importPath: string,
  allPaths: Set<string>
): string | null {
  const fromDir = fromFile.split("/").slice(0, -1).join("/");

  if (importPath.startsWith(".")) {
    // Relative import: count leading dots
    const dotMatch = importPath.match(/^(\.+)(.*)/);
    if (!dotMatch) return null;

    const dots = dotMatch[1].length;
    const modulePart = dotMatch[2]; // e.g. "utils" from ".utils"

    const dirParts = fromDir.split("/").filter(Boolean);
    // Each dot beyond the first goes up one directory
    for (let i = 1; i < dots; i++) {
      dirParts.pop();
    }

    if (modulePart) {
      // Convert dot notation to path: "foo.bar" -> "foo/bar"
      const pathParts = modulePart.split(".");
      dirParts.push(...pathParts);
    }

    const resolved = dirParts.join("/");
    // Try: resolved.py, resolved/__init__.py
    const candidates = [
      resolved + ".py",
      resolved + "/__init__.py",
    ];
    for (const candidate of candidates) {
      if (allPaths.has(candidate)) {
        return candidate;
      }
    }
  } else {
    // Absolute import: "foo.bar.baz" -> foo/bar/baz.py or foo/bar/baz/__init__.py
    const pathParts = importPath.split(".");
    const resolved = pathParts.join("/");

    const candidates = [
      resolved + ".py",
      resolved + "/__init__.py",
    ];
    for (const candidate of candidates) {
      if (allPaths.has(candidate)) {
        return candidate;
      }
    }
  }

  return null;
}

export function parseFile(path: string, content: string): ParsedFile {
  const lines = content.split("\n").length;

  let rawImports: string[];
  let filteredImports: string[];

  if (isPythonFile(path)) {
    rawImports = extractRawImportsPython(content);
    // For Python, keep all imports (both relative and absolute can resolve to repo files)
    filteredImports = rawImports;
  } else {
    rawImports = extractRawImportsJS(content);
    filteredImports = rawImports.filter(isRelativeImportJS);
  }

  return {
    path,
    content,
    lines,
    imports: filteredImports,
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
      let target: string | null;
      if (isPythonFile(file.path)) {
        target = resolvePythonImport(file.path, imp, allPaths);
      } else {
        target = resolveRelativeImport(file.path, imp, allPaths);
      }
      if (target) {
        resolvedImports.push(target);
      }
    }
    resolved.set(file.path, resolvedImports);
  }

  return resolved;
}
