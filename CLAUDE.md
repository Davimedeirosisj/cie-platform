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
- **Visualization**: ECharts, Mapbox GL for heatmaps

## Development Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Architecture

### Data Model

The app manages a hierarchical territorial structure:
- **Estado** (State) → **Municipio** (Municipality) → **Bairro** (Neighborhood) → **Zona** (Zone) → **Secao** (Section)

Each campaign can set goals (**Metas**) at any level in this hierarchy.

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
│   ├── mapa-calor/      # Heatmap visualization
│   ├── relatorios/      # Reports
│   ├── importacao/      # Excel data import wizard
│   ├── configuracoes/   # Campaign settings
│   └── busca/           # Search across territory
├── layout.tsx           # Root layout with TooltipProvider
└── page.tsx             # Redirect/public page

lib/
├── supabase/            # Client & server Supabase instances
├── types/               # TypeScript type definitions
├── actions/             # Server Actions (importacao, campanhas, territorio, auth)
├── queries/             # Data fetching (dashboard, rankings)
├── import/              # Excel parsing logic
└── nav-items.ts         # Sidebar navigation config

components/
├── ui/                  # Base shadcn/ui components (button, dialog, etc)
├── app-sidebar.tsx      # Main navigation sidebar
├── campaign-selector.tsx # Campaign picker dropdown
├── user-menu.tsx        # User profile menu
├── territory/           # Territory CRUD dialogs & forms
├── campanhas/           # Campaign management
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

**Next.js Config** (`next.config.ts`):
- Server Actions body size limit: 10MB (for Excel imports)

**TypeScript**: Path alias `@/*` points to repository root for clean imports

**ESLint**: Uses `eslint-config-next` with TypeScript support

## Notable Dependencies

- `@supabase/ssr` - Server-side auth session management
- `zustand` - Lightweight state management (campaign selection)
- `shadcn` - Component library CLI
- `echarts` + `mapbox-gl` - Data visualization
- `xlsx` - Excel file parsing
- `cmdk` - Command palette (used in search/filters)
- `date-fns` - Date utilities
- `clsx`, `tailwind-merge` - Utility helpers

## Development Notes

- **No Middleware** currently configured; auth handled server-side in layouts
- **Large Imports**: Server Actions accept up to 10MB (Excel batch uploads)
- **Territory Search**: `app/(app)/busca/` uses full-text search across territory
- **Sidebar Caching**: Campaign selector and user menu re-rendered per request (not cached)
- **Type Safety**: Strict TypeScript mode; Supabase types generated from schema

## Deployment

- **Target**: Vercel (standard Next.js deployment)
- Build output: `.next/` directory
- Environment variables managed via Vercel dashboard
