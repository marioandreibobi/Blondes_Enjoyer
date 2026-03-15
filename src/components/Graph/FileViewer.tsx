"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { X, FileCode, AlertTriangle, Loader2, Copy, Check, ChevronUp } from "lucide-react";

interface FileViewerProps {
  owner: string;
  repo: string;
  filePath: string;
  onClose: () => void;
}

/* Minimal language detection from file extension */
function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "tsx", js: "javascript", jsx: "jsx",
    py: "python", json: "json", md: "markdown", css: "css",
    html: "html", yml: "yaml", yaml: "yaml", sh: "bash",
    sql: "sql", rs: "rust", go: "go", rb: "ruby",
    mjs: "javascript", cjs: "javascript", mts: "typescript",
  };
  return map[ext] ?? "plaintext";
}

/* Simple keyword-based syntax coloring per token type */
const KEYWORD_SETS: Record<string, Set<string>> = {
  typescript: new Set([
    "import", "export", "from", "const", "let", "var", "function", "return",
    "if", "else", "for", "while", "class", "interface", "type", "enum",
    "async", "await", "try", "catch", "finally", "throw", "new", "this",
    "typeof", "instanceof", "extends", "implements", "as", "default",
    "switch", "case", "break", "continue", "do", "in", "of", "yield",
    "null", "undefined", "true", "false", "void", "never", "any",
    "public", "private", "protected", "readonly", "static", "abstract",
    "super", "delete", "with", "debugger",
  ]),
  javascript: new Set([
    "import", "export", "from", "const", "let", "var", "function", "return",
    "if", "else", "for", "while", "class", "async", "await", "try",
    "catch", "finally", "throw", "new", "this", "typeof", "instanceof",
    "extends", "default", "switch", "case", "break", "continue", "do",
    "in", "of", "yield", "null", "undefined", "true", "false", "void",
    "super", "delete", "with", "debugger",
  ]),
  python: new Set([
    "import", "from", "def", "class", "return", "if", "elif", "else",
    "for", "while", "try", "except", "finally", "raise", "with", "as",
    "pass", "break", "continue", "lambda", "yield", "and", "or", "not",
    "is", "in", "True", "False", "None", "self", "async", "await",
    "global", "nonlocal", "del", "assert",
  ]),
};
// Aliases
KEYWORD_SETS.tsx = KEYWORD_SETS.typescript;
KEYWORD_SETS.jsx = KEYWORD_SETS.javascript;

/* Tokenize a single line into colored spans */
function tokenizeLine(line: string, lang: string): React.ReactNode[] {
  const keywords = KEYWORD_SETS[lang] ?? new Set();
  const nodes: React.ReactNode[] = [];
  // Match comments, strings, numbers, words, and other chars
  const regex = /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$|"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\.?\d*\b|[a-zA-Z_$][a-zA-Z0-9_$]*|[^\s]|\s+)/gm;

  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(line)) !== null) {
    const token = match[0];
    const key = idx++;

    // Comments
    if (token.startsWith("//") || token.startsWith("#") || token.startsWith("/*")) {
      nodes.push(<span key={key} style={{ color: "#6b7280", fontStyle: "italic" }}>{token}</span>);
    }
    // Strings
    else if (/^["'`]/.test(token) || token.startsWith('"""') || token.startsWith("'''")) {
      nodes.push(<span key={key} style={{ color: "#a5d6ff" }}>{token}</span>);
    }
    // Numbers
    else if (/^\d/.test(token)) {
      nodes.push(<span key={key} style={{ color: "#fbbf24" }}>{token}</span>);
    }
    // Keywords
    else if (keywords.has(token)) {
      nodes.push(<span key={key} style={{ color: "#c084fc", fontWeight: 600 }}>{token}</span>);
    }
    // Types / Capitalized words
    else if (/^[A-Z][a-zA-Z0-9]*$/.test(token)) {
      nodes.push(<span key={key} style={{ color: "#67e8f9" }}>{token}</span>);
    }
    // Function calls (word followed by parenthesis — we just color based on context)
    else if (/^[a-zA-Z_$]/.test(token)) {
      nodes.push(<span key={key} style={{ color: "#F2EDE8" }}>{token}</span>);
    }
    // Operators and punctuation
    else {
      nodes.push(<span key={key} style={{ color: "#9A8F87" }}>{token}</span>);
    }
  }

  return nodes.length > 0 ? nodes : [<span key="empty">{line}</span>];
}

export default function FileViewer({ owner, repo, filePath, onClose }: FileViewerProps): React.ReactElement {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  const fileName = filePath.split("/").pop() ?? filePath;
  const lang = detectLanguage(filePath);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const encodedPath = encodeURIComponent(filePath);
    const encodedOwner = encodeURIComponent(owner);
    const encodedRepo = encodeURIComponent(repo);

    fetch(
      `/api/file-content?owner=${encodedOwner}&repo=${encodedRepo}&path=${encodedPath}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to fetch file" }));
          throw new Error(data.error ?? `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: { content: string; truncated: boolean }) => {
        setContent(data.content);
        setTruncated(data.truncated);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Failed to fetch file");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [owner, repo, filePath]);

  const handleCopy = useCallback((): void => {
    if (!content) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [content]);

  const handleScroll = useCallback((): void => {
    if (scrollRef.current) {
      setShowScrollTop(scrollRef.current.scrollTop > 400);
    }
  }, []);

  const scrollToTop = useCallback((): void => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const lines = content?.split("\n") ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative flex flex-col rounded-xl overflow-hidden shadow-2xl"
        style={{
          width: "min(90vw, 1100px)",
          height: "min(85vh, 800px)",
          background: "#0b1120",
          border: "1px solid rgba(224,123,84,0.15)",
          boxShadow: "0 0 60px rgba(224,123,84,0.08)",
        }}
      >
        {/* ─── Header ─── */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{
            background: "rgba(28,22,18,0.9)",
            borderBottom: "1px solid rgba(224,123,84,0.1)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <FileCode size={16} style={{ color: "#E07B54", flexShrink: 0 }} />
            <div className="min-w-0">
              <h3 className="text-sm font-mono font-bold truncate" style={{ color: "#F2EDE8" }}>
                {fileName}
              </h3>
              <p className="text-[10px] font-mono truncate" style={{ color: "rgba(148, 163, 184, 0.6)" }}>
                {filePath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Language badge */}
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: "rgba(224,123,84,0.1)", color: "#E07B54", border: "1px solid rgba(224,123,84,0.15)" }}
            >
              {lang}
            </span>

            {/* Line count */}
            {content && (
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{ background: "rgba(255, 255, 255, 0.04)", color: "#6B5E56" }}
              >
                {lines.length} lines
              </span>
            )}

            {/* Copy button */}
            <button
              onClick={handleCopy}
              disabled={!content}
              className="p-1.5 rounded-lg transition-all hover:bg-white/5"
              style={{ color: copied ? "#22c55e" : "#6B5E56" }}
              title="Copy file contents"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-all hover:bg-white/10"
              style={{ color: "#6B5E56" }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ─── Body ─── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={24} className="animate-spin" style={{ color: "#E07B54" }} />
              <p className="text-xs font-mono" style={{ color: "#6B5E56" }}>
                Fetching file from GitHub...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-center px-8">
              <AlertTriangle size={24} style={{ color: "#ef4444" }} />
              <p className="text-sm font-medium" style={{ color: "#ef4444" }}>
                Failed to load file
              </p>
              <p className="text-xs" style={{ color: "#6B5E56" }}>
                {error}
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-auto"
            style={{ background: "#0b1120" }}
          >
            {truncated && (
              <div
                className="px-5 py-2 text-xs font-mono flex items-center gap-2"
                style={{ background: "rgba(245, 158, 11, 0.08)", color: "#fbbf24", borderBottom: "1px solid rgba(245, 158, 11, 0.15)" }}
              >
                <AlertTriangle size={12} />
                File truncated — showing first 500 KB
              </div>
            )}

            <table className="w-full border-collapse" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace" }}>
              <tbody>
                {lines.map((line, i) => (
                  <tr
                    key={i}
                    className="group hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Line number */}
                    <td
                      className="select-none text-right align-top px-4 py-0 sticky left-0"
                      style={{
                        color: "rgba(100, 116, 139, 0.4)",
                        fontSize: "12px",
                        lineHeight: "20px",
                        minWidth: "48px",
                        background: "#0b1120",
                        borderRight: "1px solid rgba(224,123,84,0.06)",
                        userSelect: "none",
                      }}
                    >
                      {i + 1}
                    </td>
                    {/* Code */}
                    <td
                      className="align-top pl-4 pr-6 py-0"
                      style={{
                        fontSize: "12px",
                        lineHeight: "20px",
                        whiteSpace: "pre",
                        tabSize: 2,
                      }}
                    >
                      {tokenizeLine(line, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Scroll-to-top button ─── */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="absolute bottom-4 right-4 p-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: "rgba(28,22,18,0.95)",
              border: "1px solid rgba(224,123,84,0.2)",
              color: "#E07B54",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
          >
            <ChevronUp size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
