# Decision Weaver — Enterprise Maturity Build Plan

Backend is healthy. Plan preserves all existing schema, inference logic, RLS, and visual language. No removed features.

## Scope Strategy

All 7 phases are mostly **frontend + read-only DB work**, with one small additive migration (Phase 1) and one optional view (Phase 5). No changes to `run-inference`, `ingest-case`, or existing tables' columns.

## Phase 1 — Replay & Auditability
- **Migration (additive only):** new edge function `replay-inference` (clones `run-inference` evaluator in non-persist mode) and a thin `replay_runs` table (`id`, `original_run_id`, `replayed_decision`, `replayed_confidence`, `replayed_fired_rules jsonb`, `replayed_missing_facts jsonb`, `diff jsonb`, `created_at`, `created_by`, `organization_id`) with RLS + GRANTs.
- **UI:**
  - `src/lib/replay.ts` — client that calls `replay-inference` with stored `input_snapshot`.
  - `src/components/replay/ReplayDiffCard.tsx` — decision/confidence/rule deltas (added, removed, version-shifted).
  - `src/components/replay/MissingFactsDiff.tsx`.
  - "Replay" button on `CaseDetail` → `InferenceTab` and on `inference_runs` rows.

## Phase 2 — Rule Governance
- `src/lib/rule-governance.ts` — pure scoring fn: disabled, zero-hit, no explanation template, high-priority, |confidence_impact| ≥ 80, stale (>90d no hit_count change proxy via `updated_at`).
- `src/components/rules/GovernanceCard.tsx` (Healthy / Watch / Needs Attention).
- New `src/components/rules/GovernanceDashboard.tsx` mounted as a tab inside `RulesStudio`.
- Inline governance chip on `RuleListPanel` (replaces ad-hoc `getReadiness`).

## Phase 3 — Conflict Detection
- `src/lib/rule-conflicts.ts` — analyze rules whose `output.decision` conflicts pairwise (`approve`↔`deny`, `approve`↔`escalate`, etc.) when condition overlap is plausible (same primary fact keys).
- `src/components/rules/ConflictWarningCard.tsx`.
- New "Conflicts" tab in `RulesStudio`.

## Phase 4 — Dependency Mapping
- `src/lib/rule-dependencies.ts` — walk `conditions` tree extracting fact paths; `output` for `derived_fact` rules registers producers.
- `src/components/rules/DependencyGraph.tsx` — lightweight SVG force-less DAG (no new deps) + table view toggle.
- New "Dependencies" tab in `RulesStudio`.

## Phase 5 — Decision Operations Timeline
- `src/components/operations/DecisionTimeline.tsx` — vertical audit timeline from `inference_runs` joined with `rules.version` references already in `decision_trace`.
- New page `src/pages/Operations.tsx` mounted at `/operations`, linked in `AppSidebar`.

## Phase 6 — Design System Extraction
- New `src/components/design-system/` folder:
  - `StatCard.tsx`, `DecisionBadge.tsx`, `ConfidenceBadge.tsx`, `HealthBadge.tsx`, `InspectorPanel.tsx`, `TraceCard.tsx`, `GovernanceCard.tsx` (re-exports the rules one).
- Refactor obvious duplicates (`MetricCard` → `StatCard` wrapper) without changing rendered markup classes.

## Phase 7 — Polish
- Normalize section headers across Overview / Inference / Evidence / Facts / Rules tabs to the **Decision → Trace → Evidence → Governance → Audit** model using `InspectorPanel`.
- No color, font, or spacing changes.

## Technical Notes
- Replay engine reuses the existing `run-inference` evaluator logic by extracting it into `supabase/functions/_shared/evaluator.ts` and importing from both functions — keeps logic single-sourced.
- Governance, conflict, and dependency analyses are **pure client-side** over already-fetched `rules` — no new queries, no perf impact.
- All new components use existing tokens (`bg-gradient-card`, `border-border`, `text-foreground`, etc.).

## Delivery Order
Phases ship sequentially in one turn each so you can review per-phase. Phase 1 includes the only migration; remaining phases are pure frontend.

Confirm to proceed, or tell me which phases to skip / reorder.