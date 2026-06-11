import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  deriveCorroboratingSignals,
  deriveDataQuality,
  isPopulated,
} from "./confidence-metrics.ts";
import { resolveDecision } from "./decision-engine.ts";
import {
  deriveContradictionPenalty,
  deriveMissingFactPenalty,
  deriveSeverity,
} from "./governance-engine.ts";
import { buildDecisionTrace } from "./trace-engine.ts";

Deno.test("isPopulated: handles empty/null/undefined", () => {
  assertEquals(isPopulated(null), false);
  assertEquals(isPopulated(undefined), false);
  assertEquals(isPopulated(""), false);
  assertEquals(isPopulated("  "), false);
  assertEquals(isPopulated([]), false);
  assertEquals(isPopulated("x"), true);
  assertEquals(isPopulated(0), true);
  assertEquals(isPopulated([1]), true);
});

Deno.test("deriveDataQuality: full facts, no missing, no evidence", () => {
  const q = deriveDataQuality({ a: 1, b: "x" }, [], []);
  assertEquals(q, 100);
});

Deno.test("deriveDataQuality: applies missing penalty and evidence boost, clamped 0-100", () => {
  const q = deriveDataQuality({ a: 1, b: "" }, ["c", "d"], ["e1", "e2"]);
  // population = 50, +6 evidence, -20 missing => 36
  assertEquals(q, 36);

  const low = deriveDataQuality({}, ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"], []);
  assertEquals(low, 0);

  const high = deriveDataQuality({ a: 1 }, [], ["e", "e", "e", "e", "e", "e", "e", "e"]);
  assert(high <= 100);
});

Deno.test("deriveCorroboratingSignals: weighs by priority", () => {
  const rules = [
    { fired: true, priority: 1 },
    { fired: true, priority: 3 },
    { fired: true, priority: 5 },
    { fired: false, priority: 1 },
  ];
  // 30 + 20 + 8 = 58
  assertEquals(deriveCorroboratingSignals(rules), 58);
  assertEquals(deriveCorroboratingSignals([]), 0);
});

Deno.test("resolveDecision: picks highest vote", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 3, deny: 1 },
    contradictions: [],
    missingFacts: [],
    finalConfidence: 90,
  });
  assertEquals(r.decision, "approve");
});

Deno.test("resolveDecision: unresolved when no votes", () => {
  const r = resolveDecision({
    decisionVotes: {},
    contradictions: [],
    missingFacts: [],
    finalConfidence: 90,
  });
  assertEquals(r.decision, "unresolved");
});

Deno.test("resolveDecision: contradictions + low confidence => review", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 2 },
    contradictions: ["c1"],
    missingFacts: [],
    finalConfidence: 60,
  });
  assertEquals(r.decision, "review");
});

Deno.test("resolveDecision: missing facts + low confidence => request_info", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 2 },
    contradictions: [],
    missingFacts: ["m1"],
    finalConfidence: 50,
  });
  assertEquals(r.decision, "request_info");
});

Deno.test("resolveDecision: deny preserved despite missing facts", () => {
  const r = resolveDecision({
    decisionVotes: { deny: 2 },
    contradictions: [],
    missingFacts: ["m1"],
    finalConfidence: 30,
  });
  assertEquals(r.decision, "deny");
});

Deno.test("resolveDecision: very low confidence => review", () => {
  const r = resolveDecision({
    decisionVotes: { approve: 1 },
    contradictions: [],
    missingFacts: [],
    finalConfidence: 20,
  });
  assertEquals(r.decision, "review");
});

Deno.test("buildDecisionTrace: shapes output and rounds confidence inputs", () => {
  const trace = buildDecisionTrace({
    traceId: "t1",
    organizationId: "o1",
    caseId: null,
    mode: "instant",
    decision: "approve",
    totalRules: 3,
    firedCount: 2,
    firedRuleIds: ["r1", "r2"],
    missingFacts: [],
    contradictions: [],
    evidenceRefs: ["e1"],
    candidateDecisions: [{ decision: "approve", score: 2 }],
    confidenceInputs: {
      ruleStrength: 12.345,
      corroboratingSignals: 58.0,
      evidenceCompleteness: 33.333,
      dataQuality: 99.99,
      contradictionPenalty: 0,
      contradictionSeverityPenalty: 0,
      missingFactPenalty: 0,
      aiConfidenceAdjustment: 0,
    },
    firedRules: [
      { ruleId: "r1", ruleName: "R1", priority: 1, fired: true, conditionsMet: [], conditionsUnmet: [], confidenceImpact: 10, explanation: "x" },
    ],
  });

  assertEquals(trace.traceId, "t1");
  assertEquals(trace.organizationId, "o1");
  assertEquals(trace.deterministicDecision, "approve");
  assertEquals(trace.deterministicDecisionPreserved, true);
  assertEquals(trace.rulesEvaluated, 3);
  assertEquals(trace.rulesFired, 2);
  assertEquals(trace.confidenceInputs.ruleStrength, 12.3);
  assertEquals(trace.confidenceInputs.evidenceCompleteness, 33.3);
  assertEquals(trace.confidenceInputs.dataQuality, 100);
  assertEquals(trace.ruleTrace.length, 1);
  assert(typeof trace.evaluatedAt === "string");
});

Deno.test("deriveContradictionPenalty: zero contradictions", () => {
  const r = deriveContradictionPenalty([]);
  assertEquals(r.penalty, 0);
  assertEquals(r.severityPenalty, 0);
});

Deno.test("deriveContradictionPenalty: one contradiction", () => {
  const r = deriveContradictionPenalty(["c1"]);
  assertEquals(r.penalty, 15);
  assertEquals(r.severityPenalty, 0);
});

Deno.test("deriveContradictionPenalty: two contradictions", () => {
  const r = deriveContradictionPenalty(["c1", "c2"]);
  assertEquals(r.penalty, 30);
  assertEquals(r.severityPenalty, 10);
});

Deno.test("deriveContradictionPenalty: four contradictions", () => {
  const r = deriveContradictionPenalty(["c1", "c2", "c3", "c4"]);
  assertEquals(r.penalty, 60);
  assertEquals(r.severityPenalty, 20);
});

Deno.test("deriveMissingFactPenalty: empty", () => {
  assertEquals(deriveMissingFactPenalty([]), 0);
});

Deno.test("deriveMissingFactPenalty: three missing", () => {
  assertEquals(deriveMissingFactPenalty(["a", "b", "c"]), 24);
});

Deno.test("deriveSeverity: critical when priority <= 2 fired", () => {
  assertEquals(
    deriveSeverity([
      { fired: true, priority: 1 },
      { fired: false, priority: 3 },
    ]),
    "critical",
  );
});

Deno.test("deriveSeverity: high when priority <= 4 fired", () => {
  assertEquals(
    deriveSeverity([
      { fired: false, priority: 1 },
      { fired: true, priority: 3 },
    ]),
    "high",
  );
});

Deno.test("deriveSeverity: medium when only low priority fired", () => {
  assertEquals(
    deriveSeverity([
      { fired: true, priority: 5 },
      { fired: false, priority: 1 },
    ]),
    "medium",
  );
});

Deno.test("deriveSeverity: medium when no rules fired", () => {
  assertEquals(
    deriveSeverity([
      { fired: false, priority: 1 },
      { fired: false, priority: 3 },
    ]),
    "medium",
  );
});
