import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  deriveCorroboratingSignals,
  deriveDataQuality,
} from "./confidence-metrics.ts";
import { resolveDecision, type Decision } from "./decision-engine.ts";
import { evaluateRules, type RuleVersionRef } from "./evaluator-engine.ts";
import {
  deriveContradictionPenalty,
  deriveContradictionSeverityPenalty,
  deriveMissingFactPenalty,
  deriveSeverity,
} from "./governance-engine.ts";