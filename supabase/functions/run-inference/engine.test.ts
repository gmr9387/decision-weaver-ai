import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  evaluateRules,
  evaluateCondition,
  collectLeaves,
  safeJsonParse,
} from "./evaluator-engine.ts";
import { resolveDecision } from "./decision-engine.ts";
import {
  deriveContradictionPenalty,
  deriveMissingFactPenalty,
  deriveSeverity,
} from "./governance-engine.ts";
import {
  deriveDataQuality,
  deriveCorroboratingSignals,
} from "./confidence-metrics.ts";
import { buildDecisionTrace, roundOne } from "./trace-engine.ts";

// ---------- helpers ----------
const versionMap = new Map<string, { id: string; rule_id: string; version: number }>();

function mkRule(opts: {
  id: string;
  name: string;
  priority?: number;
  conditions: unknown;
  output: unknown;
  confidence_impact?: number;
  rule_type?: string;
}) {
  return {
    id: opts.id,
    name: opts.name,
    rule_type: opts.rule_type ?? "decision",
    priority: opts.priority ?? 5,
    version: 1,
    conditions: JSON.stringify(opts.conditions),
    output: JSON.stringify(opts.output),
    confidence_impact: opts.confidence_impact ?? 10,
    explanation_template: "rule {{amount}}",
  };
}

// ==================== evaluator-engine ====================

Deno.test("evaluator: safeJsonParse handles invalid json", () => {
  assertEquals(safeJsonParse<{ a?: number }>("not json", { a: 1 }), { a: 1 });
  assertEquals(safeJsonParse<{ a: number }>('{"a":2}', { a: 0 }), { a: 2 });
  assertEquals(safeJsonParse<{ x: number }>({ x: 9 }, { x: 0 }), { x: 9 });
});

Deno.test("evaluator: simple approve rule fires", () => {
  const rule = mkRule({
    id: "r1",
    name: "Approve Small",
    conditions: { fact: "amount", operator: "lessThan", value: 1000 },
    output: { decision: "approve" },
  });
  const out = evaluateRules({
    scopedRules: [rule],
    versionMap,
    facts: { amount: 500 },
  });
  assertEquals(out.firedCount, 1);
  assertEquals(out.firedRuleIds, ["r1"]);
  assertEquals(out.decisionVotes.approve, Math.max(1, 11 - 5));
});

Deno.test("evaluator: simple deny rule fires", () => {
  const rule = mkRule({
    id: "r2",
    name: "Deny Large",
    priority: 2,
    conditions: { fact: "amount", operator: "greaterThan", value: 10000 },
    output: { decision: "deny" },
  });
  const out = evaluateRules({
    scopedRules: [rule],
    versionMap,
    facts: { amount: 50000 },
  });
  assertEquals(out.firedCount, 1);
  assert(out.decisionVotes.deny > 0);
});

Deno.test("evaluator: missing fact detection", () => {
  const rule = mkRule({
    id: "r3",
    name: "Needs Score",
    conditions: { fact: "risk_score", operator: "greaterThan", value: 50 },
    output: { decision: "review" },
  });
  const out = evaluateRules({
    scopedRules: [rule],
    versionMap,
    facts: { amount: 10 },
  });
  assertEquals(out.firedCount, 0);
  assert(out.missingFacts.includes("risk_score"));
});

Deno.test("evaluator: nested ALL conditions", () => {
  const rule = mkRule({
    id: "r4",
    name: "All Match",
    conditions: {
      all: [
        { fact: "amount", operator: "greaterThan", value: 100 },
        { fact: "verified", operator: "equals", value: true },
      ],
    },
    output: { decision: "approve" },
  });
  const fires = evaluateRules({
    scopedRules: [rule],
    versionMap,
    facts: { amount: 500, verified: true },
  });
  assertEquals(fires.firedCount, 1);

  const skips = evaluateRules({
    scopedRules: [rule],
    versionMap,
    facts: { amount: 500, verified: false },
  });
  assertEquals(skips.firedCount, 0);
});

Deno.test("evaluator: nested ANY conditions", () => {
  const rule = mkRule({
    id: "r5",
    name: "Any Match",
    conditions: {
      any: [
        { fact: "flag_a", operator: "equals", value: true },
        { fact: "flag_b", operator: "equals", value: true },
      ],
    },
    output: { decision: "flag" },
  });
  const out = evaluateRules({
    scopedRules: [rule],
    versionMap,
    facts: { flag_a: false, flag_b: true },
  });
  assertEquals(out.firedCount, 1);
});

Deno.test("evaluator: evaluateCondition unknown operator", () => {
  const res = evaluateCondition(
    { fact: "x", operator: "bogus", value: 1 },
    { x: 1 },
  );
  assertEquals(res.met, false);
});

Deno.test("evaluator: collectLeaves flattens nested", () => {
  const leaves = collectLeaves(
    {
      all: [
        { fact: "a", operator: "equals", value: 1 },
        { any: [{ fact: "b", operator: "equals", value: 2 }] },
      ],
    },
    { a: 1, b: 2 },
  );
  assertEquals(leaves.length, 2);
  assert(leaves.every((l) => l.met));
});

// ==================== decision-engine ====================

Deno.test("decision: highest weighted decision wins", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 1, deny: 7, review: 2 },
    contradictions: [],
    missingFacts: [],
    finalConfidence: 88,
  });
  assertEquals(r.decision, "deny");
});

Deno.test("decision: contradiction forces review at low confidence", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 3 },
    contradictions: ["amount vs limit"],
    missingFacts: [],
    finalConfidence: 60,
  });
  assertEquals(r.decision, "review");
});

Deno.test("decision: missing facts trigger request_info", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 2 },
    contradictions: [],
    missingFacts: ["ssn"],
    finalConfidence: 50,
  });
  assertEquals(r.decision, "request_info");
});

// ==================== governance-engine ====================

Deno.test("governance: contradiction penalties scale", () => {
  assertEquals(deriveContradictionPenalty([]).penalty, 0);
  assertEquals(deriveContradictionPenalty(["a"]).penalty, 15);
  assertEquals(deriveContradictionPenalty(["a", "b"]).penalty, 30);
  assertEquals(deriveContradictionPenalty(["a", "b", "c", "d"]).severityPenalty, 20);
});

Deno.test("governance: severity assignment by priority", () => {
  assertEquals(deriveSeverity([{ fired: true, priority: 1 }]), "critical");
  assertEquals(deriveSeverity([{ fired: true, priority: 4 }]), "high");
  assertEquals(deriveSeverity([{ fired: true, priority: 8 }]), "medium");
});

Deno.test("governance: missing fact penalty", () => {
  assertEquals(deriveMissingFactPenalty([]), 0);
  assertEquals(deriveMissingFactPenalty(["a", "b"]), 16);
});

// ==================== confidence-metrics ====================

Deno.test("confidence: data quality scoring", () => {
  assertEquals(deriveDataQuality({ a: 1, b: 2 }, [], []), 100);
  const partial = deriveDataQuality({ a: 1, b: "" }, ["c"], []);
  // population 50, missing -10 => 40
  assertEquals(partial, 40);
});

Deno.test("confidence: corroborating signal scoring", () => {
  assertEquals(
    deriveCorroboratingSignals([
      { fired: true, priority: 1 },
      { fired: true, priority: 4 },
      { fired: true, priority: 9 },
    ]),
    58,
  );
});

// ==================== trace-engine ====================

Deno.test("trace: roundOne rounds to one decimal", () => {
  assertEquals(roundOne(12.345), 12.3);
  assertEquals(roundOne(0), 0);
});

Deno.test("trace: generation, candidates, fired rules captured", () => {
  const trace = buildDecisionTrace({
    traceId: "trace-1",
    organizationId: "org-1",
    caseId: "case-1",
    mode: "instant",
    decision: "approve",
    totalRules: 5,
    firedCount: 2,
    firedRuleIds: ["r1", "r2"],
    missingFacts: ["ssn"],
    contradictions: [],
    evidenceRefs: ["doc-1"],
    candidateDecisions: [
      { decision: "approve", score: 6 },
      { decision: "review", score: 2 },
    ],
    confidenceInputs: {
      ruleStrength: 40.55,
      corroboratingSignals: 30,
      evidenceCompleteness: 50,
      dataQuality: 80,
      contradictionPenalty: 0,
      contradictionSeverityPenalty: 0,
      missingFactPenalty: 8,
      aiConfidenceAdjustment: 0,
    },
    firedRules: [
      {
        ruleId: "r1",
        rule_id: "r1",
        ruleName: "R1",
        rule_name: "R1",
        ruleVersion: 1,
        rule_version: 1,
        ruleSnapshotId: null,
        rule_snapshot_id: null,
        name: "R1",
        priority: 1,
        fired: true,
        conditionsMet: ["amount>0"],
        conditionsUnmet: [],
        confidenceImpact: 20,
        explanation: "ok",
      },
      {
        ruleId: "r2",
        rule_id: "r2",
        ruleName: "R2",
        rule_name: "R2",
        ruleVersion: 1,
        rule_version: 1,
        ruleSnapshotId: null,
        rule_snapshot_id: null,
        name: "R2",
        priority: 3,
        fired: true,
        conditionsMet: [],
        conditionsUnmet: [],
        confidenceImpact: 10,
        explanation: "",
      },
    ],
  });

  assertEquals(trace.traceId, "trace-1");
  assertEquals(trace.deterministicDecision, "approve");
  assertEquals(trace.candidateDecisions.length, 2);
  assertEquals(trace.candidateDecisions[0].decision, "approve");
  assertEquals(trace.ruleTrace.length, 2);
  assertEquals(trace.ruleTrace[0].ruleId, "r1");
  assertEquals(trace.confidenceInputs.ruleStrength, 40.6);
  assertEquals(trace.missingFacts, ["ssn"]);
  assertEquals(trace.evidenceRefs, ["doc-1"]);
  assert(typeof trace.evaluatedAt === "string");
});
