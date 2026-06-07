import { supabase } from '@/integrations/supabase/client';

export type ReplayInput = {
  facts: Record<string, unknown>;
  mode?: 'instant' | 'deep' | 'assisted';
};

export type ReplayResult = {
  decision: string;
  confidence: number;
  confidenceBand?: string;
  firedRules: any[];
  missingFacts: string[];
  contradictions: string[];
  decisionTrace?: any;
};

export type ReplayDiff = {
  decisionChanged: boolean;
  originalDecision: string;
  replayedDecision: string;

  confidenceDelta: number;
  originalConfidence: number;
  replayedConfidence: number;

  addedRuleIds: string[];
  removedRuleIds: string[];
  versionShifts: Array<{
    ruleId: string;
    ruleName: string;
    originalVersion: number | null;
    replayedVersion: number | null;
  }>;

  addedMissingFacts: string[];
  removedMissingFacts: string[];
};

function firedIdSet(rules: any[]): Map<string, any> {
  const m = new Map<string, any>();
  for (const r of rules || []) {
    if (!r?.fired) continue;
    const id = r.ruleId ?? r.rule_id;
    if (id) m.set(id, r);
  }
  return m;
}

function getVersion(rule: any): number | null {
  const v = rule?.ruleVersion ?? rule?.rule_version;
  return v == null ? null : Number(v);
}

function getRuleName(rule: any): string {
  return rule?.ruleName ?? rule?.rule_name ?? rule?.name ?? rule?.ruleId ?? 'Unnamed rule';
}

export async function replayInferenceRun(
  inputSnapshot: Record<string, unknown>,
  mode: 'instant' | 'deep' | 'assisted' = 'instant',
): Promise<ReplayResult> {
  const { data, error } = await supabase.functions.invoke('run-inference', {
    body: { facts: inputSnapshot, mode, persist: false },
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Replay returned no data');
  return data as ReplayResult;
}

export function diffReplay(original: any, replayed: ReplayResult): ReplayDiff {
  const origDecision = String(original?.decision ?? 'unresolved');
  const repDecision = String(replayed?.decision ?? 'unresolved');

  const origConfidence = Number(original?.confidence ?? 0);
  const repConfidence = Number(replayed?.confidence ?? 0);

  const origFired = firedIdSet(original?.firedRules ?? original?.fired_rules ?? []);
  const repFired = firedIdSet(replayed?.firedRules ?? []);

  const addedRuleIds: string[] = [];
  const removedRuleIds: string[] = [];
  const versionShifts: ReplayDiff['versionShifts'] = [];

  for (const id of repFired.keys()) {
    if (!origFired.has(id)) addedRuleIds.push(id);
  }
  for (const id of origFired.keys()) {
    if (!repFired.has(id)) removedRuleIds.push(id);
  }
  for (const id of origFired.keys()) {
    if (!repFired.has(id)) continue;
    const ov = getVersion(origFired.get(id));
    const rv = getVersion(repFired.get(id));
    if (ov !== rv) {
      versionShifts.push({
        ruleId: id,
        ruleName: getRuleName(repFired.get(id) || origFired.get(id)),
        originalVersion: ov,
        replayedVersion: rv,
      });
    }
  }

  const origMissing = new Set<string>(
    (original?.missingFacts ?? original?.missing_facts ?? []) as string[],
  );
  const repMissing = new Set<string>((replayed?.missingFacts ?? []) as string[]);

  const addedMissingFacts = [...repMissing].filter((f) => !origMissing.has(f));
  const removedMissingFacts = [...origMissing].filter((f) => !repMissing.has(f));

  return {
    decisionChanged: origDecision !== repDecision,
    originalDecision: origDecision,
    replayedDecision: repDecision,
    confidenceDelta: Math.round((repConfidence - origConfidence) * 10) / 10,
    originalConfidence: origConfidence,
    replayedConfidence: repConfidence,
    addedRuleIds,
    removedRuleIds,
    versionShifts,
    addedMissingFacts,
    removedMissingFacts,
  };
}
