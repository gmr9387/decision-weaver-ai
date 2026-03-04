import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight as ChevronRightIcon, Zap } from 'lucide-react';
import type { InferenceResult } from '@/lib/types';

interface SimulationResultProps {
  simResult: InferenceResult;
  baseline?: InferenceResult;
}

export function SimulationResult({ simResult, baseline }: SimulationResultProps) {
  const [showFiredRules, setShowFiredRules] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="space-y-4">
      {/* Decision & Confidence */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="default" className="capitalize">{simResult.decision}</Badge>
        <Badge variant="confidence" className="font-mono">{simResult.confidence.toFixed(1)}%</Badge>
        <Badge variant="outline" className="capitalize text-caption">{simResult.confidenceBand}</Badge>
        {baseline && (
          simResult.confidence < baseline.confidence ? (
            <span className="text-caption text-destructive flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> -{(baseline.confidence - simResult.confidence).toFixed(1)}%
            </span>
          ) : simResult.confidence > baseline.confidence ? (
            <span className="text-caption text-success flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> +{(simResult.confidence - baseline.confidence).toFixed(1)}%
            </span>
          ) : null
        )}
      </div>

      <p className="text-body-sm text-muted-foreground">{simResult.explanation}</p>

      {/* Contradictions */}
      {simResult.contradictions.length > 0 && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 space-y-1">
          <span className="text-caption font-semibold text-destructive flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Contradictions
          </span>
          {simResult.contradictions.map((c, i) => (
            <p key={i} className="text-caption text-destructive/80">{c}</p>
          ))}
        </div>
      )}

      {/* Missing Facts */}
      {simResult.missingFacts.length > 0 && (
        <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
          <span className="text-caption font-semibold text-warning">Missing Facts: </span>
          <span className="text-caption text-muted-foreground">{simResult.missingFacts.join(', ')}</span>
        </div>
      )}

      {/* Candidate Decisions */}
      {simResult.candidateDecisions.length > 1 && (
        <div className="space-y-1">
          <span className="text-caption font-semibold text-muted-foreground">Candidate Decisions</span>
          <div className="flex gap-2 flex-wrap">
            {simResult.candidateDecisions.map((cd, i) => (
              <Badge key={i} variant="outline" className="capitalize text-caption">
                {cd.decision} ({cd.score}%)
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Confidence Breakdown */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
      >
        {showBreakdown ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        Confidence Breakdown
      </button>
      {showBreakdown && simResult.confidenceBreakdown && (
        <div className="grid grid-cols-2 gap-2 text-caption">
          {Object.entries(simResult.confidenceBreakdown).map(([k, v]) => (
            <div key={k} className="flex justify-between p-2 rounded bg-surface-2">
              <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
              <span className="font-mono text-foreground">{typeof v === 'number' ? v.toFixed(1) : v}</span>
            </div>
          ))}
        </div>
      )}

      {/* Fired Rules */}
      <button
        onClick={() => setShowFiredRules(!showFiredRules)}
        className="flex items-center gap-1 text-caption font-medium text-primary hover:underline"
      >
        {showFiredRules ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
        Rule Details ({simResult.firedRules.length} evaluated)
      </button>
      {showFiredRules && (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {simResult.firedRules.map((rule, i) => (
            <div key={i} className={`p-3 rounded-lg text-caption ${rule.fired ? 'bg-primary/5 border border-primary/20' : 'bg-surface-2 border border-border'}`}>
              <div className="flex items-center gap-2 mb-1">
                {rule.fired ? (
                  <Zap className="w-3 h-3 text-primary" />
                ) : (
                  <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />
                )}
                <span className="font-medium text-foreground">{rule.name}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{rule.type}</Badge>
                {rule.fired && <span className="text-primary font-mono">+{rule.confidenceImpact}</span>}
              </div>
              {rule.conditionsMet.length > 0 && (
                <p className="text-success/80 ml-5">✓ {rule.conditionsMet.join(', ')}</p>
              )}
              {rule.conditionsUnmet.length > 0 && (
                <p className="text-destructive/70 ml-5">✗ {rule.conditionsUnmet.join(', ')}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
