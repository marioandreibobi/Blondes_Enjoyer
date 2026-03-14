# CodeAtlas

Interactive 3D visualization of GitHub repository structure, dependencies, and risk areas — powered by AI.

## Quick Start

```bash
# Install dependencies
npm install

# Copy env template and fill in your keys
cp .env.example .env.local

# Generate Prisma client
npx prisma generate

# Start PostgreSQL (via Docker Compose)
docker compose up db -d

# Push schema to database
npx prisma db push

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), paste a GitHub repo URL, and explore.

## Docker (Full Stack)

```bash
# Set your API keys
export GITHUB_TOKEN=ghp_...
export ANTHROPIC_API_KEY=sk-ant-...

# Build and run
docker compose up --build
```

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run E2E tests (Playwright) |
| `npm run db:studio` | Open Prisma Studio |

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui
- **3D Visualization:** 3d-force-graph + Three.js
- **State:** Zustand
- **Database:** PostgreSQL + Prisma
- **AI:** Claude (Anthropic SDK)
- **GitHub API:** Octokit
- **Testing:** Vitest + Playwright
- **Deployment:** Docker Compose
