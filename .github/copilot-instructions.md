# CodeAtlas — AI Coding Instructions

## Project Context
This is CodeAtlas, a web app that takes a GitHub repo URL and generates an interactive 3D visualization of its structure, dependencies, and risk areas. Built for the QA DNA challenge at VibeHack Bucharest, March 14-15 2026.

**Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, 3d-force-graph, Three.js, Claude API, GitHub REST API

## Tool Usage Rules

### Context7 (Library Docs)
Before writing code that uses any of these libraries, look up the latest docs via Context7 — do NOT guess at APIs:
- `3d-force-graph` — node/link config, event handlers, camera controls
- `next` — App Router conventions, API routes, server components
- `@octokit/rest` — GitHub API methods, auth, pagination
- `@anthropic-ai/sdk` — message format, streaming, vision
- `tree-sitter` / `tree-sitter-wasms` — parser init, query syntax
- `madge` — dependency extraction config

### Superpowers (Web Search)
Use web search to clarify before implementing when:
- Installing a new dependency — check for known issues or breaking changes first
- Working with GitHub API — verify current rate limits and auth requirements
- Writing parsers — search "[language] import extraction tree-sitter" for patterns
- Unsure about a pattern — search for current best practice instead of guessing

### Chrome DevTools (Verification)
After implementing any frontend feature, verify via DevTools:
- **Console:** zero errors, zero unhandled rejections
- **Network:** API calls return correct status codes, no CORS errors
- **Performance:** 3D graph holds 30+ FPS with 200 nodes
- **Memory:** no leaks on repeated graph loads (heap snapshot comparison)

## Code Standards

### TypeScript
- Strict mode — no `any` unless wrapping an untyped library
- All functions have explicit return types
- Use `interface` for object shapes, `type` for unions

### Error Handling
- Every API route returns proper HTTP status codes (400, 404, 500)
- Every async function has try/catch
- Never return raw error messages to the client in production
- AI responses: always wrap JSON.parse in try/catch with a fallback

### Structure
- Functions over 40 lines → break into smaller functions
- One component per file
- Use environment variables for all API keys — never hardcode

### Git
- Commit format: `feat: description` / `fix: description` / `chore: description`
- Branch from `develop`, never from `main` directly
- Feature branches: `feature/short-name`, fix branches: `fix/short-name`

## API Contract
The backend produces and the frontend consumes this shape:

```typescript
interface AnalysisResult {
  repo: {
    name: string
    owner: string
    language: string
    totalFiles: number
    analyzedFiles: number
  }
  graph: {
    nodes: Array<{
      id: string           // file path
      type: string         // "route" | "controller" | "service" | "model" | "middleware" | "util" | "config" | "test" | "entry"
      lines: number
      imports: number      // count of files this imports
      importedBy: number   // count of files that import this
      description: string  // AI-generated 1-liner
      risk: string | null  // AI-generated risk flag or null
      complexity: "low" | "medium" | "high"
    }>
    links: Array<{
      source: string       // file path
      target: string       // file path
    }>
  }
  ai: {
    summary: string
    riskHotspots: Array<{
      file: string
      reason: string
      severity: "low" | "medium" | "high"
    }>
    onboarding: {
      steps: Array<{
        title: string
        file: string | string[]
        explanation: string
      }>
    }
  }
}
```

If you're working on the frontend and the backend isn't ready, mock this structure. If you're working on the backend, output exactly this structure.

## Security Checks (before merge)
Before any PR to develop, verify:
1. Repo URL input rejects non-GitHub URLs (no SSRF via `localhost` or `file://`)
2. No API keys or tokens appear in Network tab responses
3. HTML in repo file names is escaped — no XSS via `<script>` in file paths
4. Error responses don't leak stack traces
5. GitHub tokens are only sent server-side, never to the browser

## File Ownership (avoid conflicts)
- `/src/lib/github.ts`, `/src/lib/parser.ts`, `/src/lib/graph-builder.ts`, `/src/app/api/` → Person A
- `/src/components/Graph/`, `SearchBar`, `Legend` → Person B
- `/src/lib/ai/` (all files) → Person C
- `/src/app/page.tsx`, `/src/components/UI/`, `/src/components/Onboarding/` → Person D

If you need to edit a file owned by someone else, flag it in the PR description.

## When Stuck
- Library not working → check Context7 for the correct current API
- Don't know best practice → use Superpowers to search
- Works in dev, fails in prod → check DevTools Network tab for env differences
- 3D graph slow → DevTools Performance tab, look for layout thrashing
- Claude returns bad JSON → log full request/response, use `jsonrepair` as fallback
