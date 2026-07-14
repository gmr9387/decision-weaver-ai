# Decision Weaver

**Part of the ValtariOS platform — The Operating System for Decisions.**

Decision Weaver is an enterprise-grade **Decision Intelligence & Rules Governance** platform. It combines a deterministic rules engine, an auditable inference workbench, and a governance/operations control plane so teams can execute, explain, and evolve automated decisions with confidence.

> Positioning: not an AI model evaluator, not an LLM playground, not a BI dashboard. Weaver is **decision infrastructure** — the layer between raw data/events and business outcomes.

---

## Table of Contents

1. [What Weaver Does](#what-weaver-does)
2. [Platform Architecture](#platform-architecture)
3. [Feature Overview](#feature-overview)
4. [Tech Stack](#tech-stack)
5. [Repository Layout](#repository-layout)
6. [Getting Started](#getting-started)
7. [Environment & Backend](#environment--backend)
8. [Database Schema](#database-schema)
9. [Edge Functions & Inference Engine](#edge-functions--inference-engine)
10. [Frontend Application](#frontend-application)
11. [Design System](#design-system)
12. [Testing](#testing)
13. [Security & Access Control](#security--access-control)
14. [Deployment](#deployment)
15. [Roadmap](#roadmap)

---

## What Weaver Does

Weaver ingests **cases** (any business record — a transaction, claim, applicant, alert, ticket), evaluates them against a governed library of **rules**, and produces an **auditable decision** with:

- A decision type (`approve`, `deny`, `review`, `escalate`, `request_info`)
- A calibrated **confidence score** with a breakdown of contributing factors
- A **decision trace** listing candidate decisions, fired rules, contradictions, and missing facts
- **Governance signals** (contradiction penalties, severity, data-quality warnings)
- **Human-in-the-loop hooks** for review, override, and outcome labeling

Every decision is persisted, traceable, and replayable.

---

## Platform Architecture

Decision Weaver sits inside the **ValtariOS** platform layer, which provides shared identity, navigation, and event contracts for a family of decision-domain products.

```text
┌───────────────────────────────────────────────────────────┐
│                     Users & Applications                  │
├───────────────────────────────────────────────────────────┤
│                     ValtariOS Platform                    │
│  (navigation, event contracts, service registry, health)  │
├──────────────┬──────────────┬─────────────┬───────────────┤
│   Weaver     │   Glue*      │  Guardian*  │   Core*       │
│  (decisions) │  (workflows) │ (risk/gov)  │ (data/ident)  │
├──────────────┴──────────────┴─────────────┴───────────────┤
│                      Data Layer                           │
│           Postgres · RLS · Realtime · Storage             │
└───────────────────────────────────────────────────────────┘
```
`*` placeholder modules — see `/platform` and `/architecture` in-app.

**Weaver internal architecture** (5 layers):

1. **Ingest** — API + UI ingestion of cases and facts
2. **Rules & Governance** — versioned rule library with visual condition trees
3. **Inference Engine** — deterministic evaluator with confidence, contradictions, trace
4. **Operations & Observability** — engine health, audit timeline, run history
5. **Human-in-the-Loop** — review, override, outcome labeling for calibration

---

## Feature Overview

### Decision Intelligence
- **Rules Studio** — CRUD for rules with a visual drag-and-drop **Condition Tree Builder** (nested AND/OR, live JSON toggle, auto-type detection).
- **Simulation Lab** — what-if testing without persistence; edit facts, re-run inference, compare baselines.
- **Inference Engine** — deterministic evaluation with weighted scoring, contradiction detection, missing-fact handling, and severity-aware penalties.
- **Decision Trace** — candidate decisions, fired rules, confidence breakdown, governance signals per run.

### Cases & Workflow
- Case list with filters, status, decisions, and confidence bands.
- Case detail with tabs: Overview, Facts, Evidence, Rules Trace, Inference, History.
- **Replay** — re-run a historical case against the current rule set and diff the decision.

### Governance
- **Governance Dashboard** inside Rules Studio (rule health, conflicts, dependencies).
- **Rule Conflicts** and **Rule Dependencies** analyzers (`src/lib/rule-conflicts.ts`, `src/lib/rule-dependencies.ts`).
- Severity-weighted contradiction penalties and data-quality scoring.

### Operations
- `/operations` — audit event timeline + **Decision Engine Health** panel:
  - total/enabled rules, avg rules fired per run
  - top-10 most-fired rules
  - decision & confidence distributions
  - governance metrics (contradictions, missing facts)
  - engine status badge: Healthy / Watch / Needs Attention

### Platform
- `/platform` — ValtariOS Control Center with service registry, health, events, integrations placeholders.
- `/architecture` — enterprise architecture documentation page (60-second overview, service relationships, principles, future modules).

### Cross-cutting
- **Multi-tenant** with organization scoping, RBAC (admin / reviewer / analyst / executive), and RLS.
- **Soft auth wall** — guests can browse; mutations trigger `AuthGateDialog`.
- **API ingest** — rate-limited (30/min) with per-org API keys.
- **Webhooks** — HMAC-SHA256 signing, exponential backoff, delivery logs.
- **Global error boundary** with branded fallback UI.
- **Toast notifications** for all mutating actions.

---

## Tech Stack

| Layer         | Technology                                          |
| ------------- | --------------------------------------------------- |
| Frontend      | React 18, Vite 5, TypeScript 5                      |
| Styling       | Tailwind CSS v3, shadcn/ui, semantic design tokens  |
| State/Data    | TanStack Query, React Router v6, React Hook Form + Zod |
| Charts        | Recharts                                            |
| Motion        | Framer Motion                                       |
| Backend       | Lovable Cloud (Postgres, Auth, Storage, Realtime)   |
| Functions     | Deno Edge Functions                                 |
| Testing       | Vitest + Testing Library (frontend), Deno test (edge) |

---

## Repository Layout

```text
src/
  components/
    cases/            Case detail tabs (Overview, Facts, Evidence, Rules Trace, Inference, History)
    dashboard/        KPI cards, distribution charts, trend charts
    design-system/    StatCard, Badges, InspectorPanel, TraceCard, GovernanceCard
    layout/           AppLayout, AppSidebar
    operations/       EngineHealthPanel
    replay/           ReplayPanel, ReplayDiffCard
    rules/            ConditionTreeBuilder, RuleListPanel, RuleDetailPanel, RuleFormDialog,
                      GovernanceDashboard, ConditionTreeView
    simulation/       FactsEditor, SimulationResult
    settings/         Organization, Inference, Policies, Webhooks, ApiLogs, Notifications
  hooks/              use-auth, use-auth-gate, use-data, use-actions, use-toast
  lib/                types, mock-data, replay, rule-conflicts, rule-dependencies,
                      rule-governance, platform-events, platform-navigation
  pages/              Landing, Auth, Dashboard, Cases, CaseDetail, RulesStudio,
                      SimulationLab, Analytics, Operations, Platform, Architecture,
                      ApiDocs, Settings, ResetPassword, NotFound
  integrations/
    supabase/         Auto-generated client and types (do not edit)

supabase/
  functions/
    run-inference/    Modular decision engine (see below)
    ingest-case/      Rate-limited external ingest with API-key auth
    aggregate-metrics/ Daily rollup job
    seed-demo-data/   Onboarding seed for new orgs
    _shared/          CORS, auth, rate-limit, webhooks helpers
  config.toml         Function configuration (auto-managed)
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm (or bun/pnpm — repo uses npm by default)

### Local Development

```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
npm install
npm run dev            # start Vite dev server on :8080
```

### Scripts

| Command             | Purpose                             |
| ------------------- | ----------------------------------- |
| `npm run dev`       | Start Vite dev server               |
| `npm run build`     | Production build                    |
| `npm run build:dev` | Development-mode build              |
| `npm run preview`   | Preview production build            |
| `npm run lint`      | Run ESLint                          |
| `npm run test`      | Run Vitest suite once               |
| `npm run test:watch`| Vitest in watch mode                |

Edge-function tests run under Deno:

```bash
deno test supabase/functions/run-inference/ --allow-all
```

---

## Environment & Backend

Weaver runs on **Lovable Cloud** (managed Postgres + Auth + Functions + Storage). The frontend picks up credentials from Vite env vars written by the platform:

```env
VITE_SUPABASE_URL=<managed>
VITE_SUPABASE_PUBLISHABLE_KEY=<managed>
VITE_SUPABASE_PROJECT_ID=<managed>
```

Do not edit `.env`, `src/integrations/supabase/client.ts`, or `src/integrations/supabase/types.ts` — they are auto-generated.

Import the Supabase client with:

```ts
import { supabase } from "@/integrations/supabase/client";
```

---

## Database Schema

14 tables under the `public` schema (see `src/integrations/supabase/types.ts` for the source of truth):

- `organizations` — tenant root, JSONB settings
- `profiles` — per-user profile joined to `auth.users`
- `user_roles` — RBAC (admin / reviewer / analyst / executive) — **separate table, checked via `has_role()` SECURITY DEFINER function**
- `cases` — business records under evaluation
- `facts` — key/value evidence attached to a case
- `rules` — rule definitions with weight, priority, tags, `is_enabled`
- `inference_runs` — persisted runs with decision, confidence, trace, and fired rules
- `daily_metrics` — rollup metrics per org
- `api_keys` — per-org keys for external ingest
- `webhooks` + `webhook_deliveries` — outbound event stream with retry state
- `audit_events` — governance timeline (rule created/updated, outcome labeled, etc.)
- Plus supporting tables for notifications and policies

All tables have RLS enabled and explicit `GRANT` statements for `authenticated` and `service_role`.

---

## Edge Functions & Inference Engine

`supabase/functions/run-inference/` is the deterministic decision engine, modularized for testability:

| Module                 | Responsibility                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `evaluator-engine.ts`  | Condition-tree evaluation (ALL/ANY, leaf ops, safe JSON parse)    |
| `decision-engine.ts`   | Weighted candidate selection, contradictions, missing-fact routing |
| `confidence-metrics.ts`| Data-quality and corroborating-signal scoring                     |
| `governance-engine.ts` | Contradiction penalties, severity, missing-fact penalty           |
| `trace-engine.ts`      | Assembles the decision trace (candidates + fired rules + signals) |
| `index.ts`             | HTTP entry — orchestrates modules, persists runs, emits webhooks  |

Tests:
- `engine.test.ts` — 18 deterministic engine tests
- `modules.test.ts` — 21 module unit tests
- `index.test.ts` — integration tests

Other functions:
- `ingest-case/` — external API ingest, HMAC + rate-limited
- `aggregate-metrics/` — daily rollup
- `seed-demo-data/` — onboarding demo data

---

## Frontend Application

### Routes

| Route                | Purpose                                                     |
| -------------------- | ----------------------------------------------------------- |
| `/`                  | Landing page (public)                                       |
| `/auth`              | Sign in / sign up / reset                                   |
| `/dashboard`         | KPIs, volume, decision distribution, confidence trends      |
| `/cases`             | Case list with filters                                      |
| `/cases/:id`         | Case detail (Overview, Facts, Evidence, Trace, Inference, History) |
| `/rules`             | Rules Studio + Governance Dashboard                         |
| `/simulation`        | Simulation Lab                                              |
| `/analytics`         | Cross-cutting analytics                                     |
| `/operations`        | Audit timeline + Decision Engine Health                     |
| `/platform`          | ValtariOS Control Center                                    |
| `/architecture`      | Enterprise architecture reference                           |
| `/api-docs`          | Ingest API documentation                                    |
| `/settings`          | Org, Inference, Policies, Webhooks, API logs, Notifications |

### Data Strategy

Data hooks (`src/hooks/use-data.ts`) query Supabase but **fall back to mock constants** in `src/lib/mock-data.ts` when RLS restricts access or the request fails — allowing guests to explore the surface without breaking the UI.

Mutations flow through `src/hooks/use-actions.ts` and are gated by `useAuthGate` — unauthenticated users see the `AuthGateDialog` before mutation.

---

## Design System

All colors, gradients, and shadows are **semantic tokens** defined in `src/index.css` and consumed via `tailwind.config.ts`. Never hardcode `text-white`, `bg-black`, or hex utilities in components.

Shared design primitives live in `src/components/design-system/`:

- `StatCard` — metric with optional trend/delta
- `Badges` — `DecisionBadge`, `ConfidenceBadge`, `HealthBadge`
- `InspectorPanel` — collapsible inspector layout
- `TraceCard` — trace/step visualizer
- `GovernanceCard` — governance signal container

Visual language: dark, executive, operational — inspired by Palantir Foundry, Datadog, Azure Portal.

---

## Testing

**Frontend** (Vitest + Testing Library + jsdom):

```bash
npm run test
npm run test:watch
```

**Edge functions** (Deno):

```bash
deno test supabase/functions/run-inference/ --allow-all
deno test supabase/functions/ingest-case/ --allow-all
```

The frontend build and typecheck run automatically on every change in the Lovable sandbox.

---

## Security & Access Control

- **Auth**: email/password + Google OAuth (via Lovable Cloud managed auth).
- **RBAC**: roles in a dedicated `user_roles` table, checked by `public.has_role(user_id, role)` — a `SECURITY DEFINER` function to prevent recursive RLS.
- **RLS**: enabled on every public table with explicit policies per role.
- **API ingest**: per-org API keys, HMAC signatures, 30 req/min rate limit.
- **Webhooks**: HMAC-SHA256 signed, exponential backoff, full delivery log.
- **Error boundary**: global React `ErrorBoundary` in `src/main.tsx` catches unexpected crashes.

Never store roles or admin flags on the `profiles` table — that is a privilege-escalation vector.

---

## Deployment

Weaver deploys through Lovable — use **Share → Publish** in the Lovable project. Custom domains are configured under Project Settings → Domains.

Edge functions deploy automatically with the project — do not deploy them manually.

---

## Roadmap

Near-term:

1. **Rule Versioning & Diff** — immutable snapshots on every rule edit, side-by-side diff, replay with historical version.
2. **Outcome Labeling & Calibration** — `case_outcomes` capture (confirmed / rejected / overridden), accuracy engine per rule / version / decision type.
3. **Audit Event Stream** — `rule_version_created`, `outcome_labeled`, `accuracy_recalculated` emitted to `audit_events`.
4. **Human-in-the-Loop Workflow** — case assignment, comments, approval chain.
5. **Real-time Dashboard Updates** — Postgres realtime channels for multi-user ops.
6. **CSV / Batch Import & Export**.

Longer-term (ValtariOS platform):

- **Glue** — workflow orchestration between decisions
- **Guardian** — cross-domain risk & governance
- **Core** — shared identity, monitoring, billing
- **Marketplace** — packaged rule sets and integrations

---

© Valtaris — ValtariOS · Decision Weaver
