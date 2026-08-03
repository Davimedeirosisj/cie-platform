# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Centro de Inteligência Eleitoral (CIE)** is an electoral intelligence platform built with Next.js 16, React 19, and TypeScript. It provides campaign managers with tools to track territorial organization, set goals, import voting data, and analyze electoral performance.

### Core Technologies
- **Framework**: Next.js 16 (App Router) with React 19
- **Language**: TypeScript 5 with strict mode
- **UI**: Shadcn/ui components with Tailwind CSS v4
- **Database**: Supabase (PostgreSQL + Auth)
- **State**: Zustand (client-side) + Server Components
- **Data Processing**: Excel parsing with XLSX library
- **Visualization**: ECharts, Mapbox GL for the territory map

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm test         # Vitest — pure logic only, no DB, no credentials
```

**Data integrity is checked in the database, not by these tests.** Run
`select * from fn_verificar_integridade();` after every import: it re-derives
the totals across dimensions, looks for orphan/duplicate territory rows, stuck
batches and coordinates outside the state, and *calls* every RPC — a SQL
function resolves table names only when invoked, so a dropped column stays
invisible until someone uses the feature. That has already bitten twice
(`fn_comparar_campanhas`, then `fn_busca_global` twice over).

## Architecture

### Data Model

Territory is **not** a single chain. Bairro and zona eleitoral are two
*parallel* groupings of the same seções, and they hang off different parents:

```
Estado ─┬─ Município ── Bairro ─┐
        └─ Zona ────────────────┴─ Seção   (seção carries both FKs)
```

A **zona eleitoral is scoped to the estado**: TSE numbers them uniquely per UF
and one zona serves several municípios in the interior (Zona 5 covers Baturité,
Guaramiranga, Mulungu and Pacoti). A **bairro** belongs to a município.

Getting either parent wrong shatters each real zona into one row per child it
touches, which fragments zona rankings. This was fixed twice: zona under bairro
(0017) and then zona under município (0024). A zona's municípios and bairros are
**derived from its seções** — never stored on the zona.

**Votes** live in a single polymorphic `votos` table: a `nivel` plus exactly
one territorial FK. Campaign files arrive at different granularities (some
aggregated per bairro, some with full seção detail), and the same votes may
appear in more than one file. Aggregation is therefore **"finest grain wins"**
per território: if finer data exists inside a território it is used, otherwise
the total recorded at that território itself is. Never `SUM` across levels —
that double counts. See migrations 0014–0018.

**Metas** are the opposite: independently settable at any level, since a goal
is a planning decision rather than a roll-up.

**Key Types** in `lib/types/`:
- `Campanha` - Campaign metadata (name, status: planejamento|ativa|encerrada)
- `Estado`, `Municipio`, `Bairro`, `Zona`, `Secao` - Territory entities
- `Meta` - Campaign goals at specific territory levels

### Directory Structure

```
app/
├── (auth)/              # Public routes: login, signup
├── (app)/               # Protected routes with sidebar layout
│   ├── dashboard/       # Analytics & KPIs
│   ├── municipios/      # Territory CRUD
│   ├── bairros/
│   ├── zonas/
│   ├── secoes/
│   ├── rankings/        # Vote rankings
│   ├── mapa/            # Interactive territory map
│   ├── relatorios/      # Reports (CSV export, print)
│   ├── importacao/      # Excel data import wizard
│   ├── configuracoes/   # Campanhas, usuarios, auditoria
│   └── busca/           # Search across territory
├── layout.tsx           # Root layout with TooltipProvider
└── page.tsx             # Redirect/public page

lib/
├── supabase/            # Client, server & admin (service-role) Supabase instances
├── types/                # TypeScript type definitions
├── actions/               # Server Actions (importacao, campanhas, territorio, auth, usuarios)
├── queries/                # Data fetching (dashboard, dashboard-optimized, rankings)
├── validation/              # Zod schemas, one file per domain
├── auth/                     # protectedAction/validateInput wrapper, rate limiting, role checks
├── import/                    # Excel parsing logic
├── map/                        # Mapbox config/token check
├── reports/                     # CSV export helper
└── nav-items.ts                 # Sidebar navigation config

components/
├── ui/                  # Base shadcn/ui components (button, dialog, etc — Base UI, not Radix)
├── app-sidebar.tsx      # Main navigation sidebar
├── campaign-selector.tsx # Campaign picker dropdown
├── user-menu.tsx        # User profile menu
├── territory/           # Territory CRUD dialogs & forms
├── campanhas/           # Campaign management
├── usuarios/            # Role/active-status management, invite dialog
├── auditoria/           # Audit log filters
├── map/                 # Interactive territory map (Mapbox)
├── import/              # Import wizard
├── dashboard/           # Dashboard components (KPI cards, charts)
└── rankings/            # Ranking table component

stores/
└── campaign-store.ts    # Zustand store: selected campaign ID (persisted)
```

### Key Patterns

1. **Server Components by Default** - All routes use async Server Components for data fetching
   - Supabase server client (`lib/supabase/server.ts`) handles auth in Server Components
   - Browser client (`lib/supabase/client.ts`) used only where needed

2. **Server Actions** - Data mutations via `lib/actions/`
   - Examples: `territorio.ts` (CRUD operations), `importacao.ts` (batch imports), `campanhas.ts`
   - Server Actions handle large request bodies (10MB limit set in `next.config.ts` for Excel imports)

3. **Campaign Context** - Passed through sidebar layout
   - Selected campaign ID stored in Zustand (`useCampaignStore`)
   - Most pages require active campaign selection
   - **The toolbar campaign is a *view* filter, never a write target and never
     where metas live.** Goals belong to the campaign flagged `is_campanha_meta`
     — read them via `fetchCampanhaMeta()` (`lib/queries/campanha-meta.ts`) and
     show that campaign's name on screen instead of hardcoding "2026". Confusing
     the two has caused four separate bugs: imports landing on the wrong
     campaign, metas saved where nothing reads them, and Rankings/Relatórios
     showing "—" for goals that existed.

4. **Territory Hierarchy** - All mutations cascade through parent-child relationships
   - Creating a Secao requires Zona ID → Bairro ID → Municipio ID → Estado ID
   - Meta editing validates level-specific constraints

## Common Tasks

### Adding a New Territory Management Page
1. Create route in `app/(app)/[entity]/`
2. Use Server Component to fetch data via Supabase
3. Create form/dialog component in `components/territory/`
4. Add Server Action in `lib/actions/territorio.ts`
5. Update `lib/nav-items.ts` sidebar navigation

### Importing Data
- Entry point: `app/(app)/importacao/page.tsx`
- Parse logic: `lib/import/parse-xlsx.ts`
- Batch insert via Server Action: `lib/actions/importacao.ts`
- Note: Rows are sent as JSON to Server Actions (watch 10MB body limit)
- **Imports create territories without coordinates**, so anything new is
  invisible on `/mapa` until geocoded — run
  `node scripts/geocode-territorios.mjs municipios` (or `bairros <MUNICIPIO>`),
  review the UPDATE it prints, then apply it

### Dashboard & Analytics
- KPI calculations in `lib/queries/dashboard.ts`
- Chart components in `components/dashboard/`
- Ranking data in `lib/queries/rankings.ts`

### Authentication
- Supabase Auth (email/password)
- Server-side session via cookies (handled by `@supabase/ssr` middleware)
- User profile loaded in `app/(app)/layout.tsx` from `profiles` table

## Environment & Configuration

**Required Environment Variables** (`.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

**Optional Environment Variables**:
```
NEXT_PUBLIC_MAPBOX_TOKEN=   # enables /mapa; it shows a setup notice without it
SUPABASE_SERVICE_ROLE_KEY=  # server-only; enables inviting new users from Configurações > Usuários
```

**Next.js Config** (`next.config.ts`):
- Server Actions body size limit: 10MB (for Excel imports)

**TypeScript**: Path alias `@/*` points to repository root for clean imports

**ESLint**: Uses `eslint-config-next` with TypeScript support

## Notable Dependencies

- `@supabase/ssr` - Server-side auth session management
- `zustand` - Lightweight state management (campaign selection)
- `zod` - Server Action input validation (`lib/validation/`)
- `swr` - Client-side caching for dashboard top-items (`lib/hooks/useTopItems.ts`)
- `shadcn` - Component library CLI (built on `@base-ui/react`, not Radix)
- `echarts` + `mapbox-gl` - Data visualization
- `xlsx` - Excel file parsing
- `cmdk` - Command palette (used in search/filters)
- `date-fns` - Date utilities
- `clsx`, `tailwind-merge` - Utility helpers

## Development Notes

- **Proxy (`proxy.ts`)** — Next.js 16's rename of `middleware.ts` — refreshes the Supabase session and redirects unauthenticated requests to `/login` (and authenticated ones away from `/login`/`/signup`) for every route except static assets
- **Public signup is self-closing**: `/signup` only works until the first `super_admin` profile exists (checked via the `fn_super_admin_exists()` RPC in both the page and the `signUp` action); after that, new users are added from Configurações > Usuários (requires `SUPABASE_SERVICE_ROLE_KEY`)
- **Large Imports**: Server Actions accept up to 10MB (Excel batch uploads)
- **Territory Search**: `app/(app)/busca/` calls the `fn_busca_global` RPC across all 4 territorial levels
- **Sidebar Caching**: Campaign selector and user menu re-rendered per request (not cached)
- **Type Safety**: Strict TypeScript mode; Supabase types generated from schema
- **shadcn/ui runs on Base UI**, not Radix — components use the `render` prop for polymorphic rendering (e.g. `<DialogTrigger render={<Button />} />`), not `asChild`

## Deployment

- **Target**: Vercel (standard Next.js deployment)
- Build output: `.next/` directory
- Environment variables managed via Vercel dashboard
