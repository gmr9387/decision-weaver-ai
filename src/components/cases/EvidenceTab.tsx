import { Badge } from '@/components/ui/badge';
import { TabsContent } from '@/components/ui/tabs';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Shield,
  FileSearch,
  TrendingUp,
} from 'lucide-react';
import type { InferenceResult } from '@/lib/types';

interface EvidenceTabProps {
  ir: InferenceResult | undefined;
}

export function EvidenceTab({ ir }: EvidenceTabProps) {
  if (!ir) {
    return (
      <TabsContent value="evidence">
        <div className="rounded-xl border border-border bg-gradient-card p-6">
          <p className="text-body-sm text-muted-foreground">
            No evidence available.
          </p>
        </div>
      </TabsContent>
    );
  }

  const evidenceRefs = ir.evidenceRefs ?? [];
  const missingFacts = ir.missingFacts ?? [];

  const completeness =
    evidenceRefs.length + missingFacts.length > 0
      ? Math.round(
          (evidenceRefs.length /
            (evidenceRefs.length + missingFacts.length)) *
            100
        )
      : 100;

  const readiness =
    Math.max(
      0,
      Math.min(
        100,
        ir.confidence -
          missingFacts.length * 5 -
          (ir.contradictions?.length ?? 0) * 5
      )
    );

  return (
    <TabsContent value="evidence" className="space-y-4">
      {/* Executive Evidence Summary */}

      <div className="grid md:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Evidence Items
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {evidenceRefs.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-caption text-muted-foreground">
              Missing Facts
            </span>
          </div>

          <div className="text-2xl font-semibold text-foreground">
            {missingFacts.length}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-caption text-muted-foreground">
              Completeness
            </span>
          </div>

          <div className="text-2xl font-semibold text-success">
            {completeness}%
          </div>
        </div>

        <div className="rounded-xl border border-border bg-gradient-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-caption text-muted-foreground">
              Appeal Readiness
            </span>
          </div>

          <div className="text-2xl font-semibold text-primary">
            {Math.round(readiness)}%
          </div>
        </div>
      </div>

      {/* Evidence Package */}

      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileSearch className="w-4 h-4 text-primary" />
          Evidence Package
        </h3>

        {evidenceRefs.length > 0 ? (
          <div className="space-y-2">
            {evidenceRefs.map((ref) => (
              <div
                key={ref}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-2"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-success" />

                  <span className="text-body-sm font-mono text-foreground">
                    {ref}
                  </span>
                </div>

                <Badge variant="secondary">
                  Verified Evidence
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">
            No evidence references were attached to this decision.
          </p>
        )}
      </div>

      {/* Missing Information */}

      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Missing Information
        </h3>

        {missingFacts.length > 0 ? (
          <div className="space-y-2">
            {missingFacts.map((fact) => (
              <div
                key={fact}
                className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
              >
                <span className="font-mono text-body-sm text-foreground">
                  {fact}
                </span>

                <Badge variant="warning">
                  Missing
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-body-sm">
              No missing evidence detected.
            </span>
          </div>
        )}
      </div>

      {/* Evidence Impact */}

      <div className="rounded-xl border border-border bg-gradient-card p-6">
        <h3 className="text-body-md font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Evidence Impact
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-muted-foreground">
              Confidence Score
            </span>

            <span className="font-mono text-primary font-semibold">
              {ir.confidence.toFixed(1)}%
            </span>
          </div>

          <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
            <div
              className="h-full bg-primary"
              style={{
                width: `${Math.min(100, ir.confidence)}%`,
              }}
            />
          </div>

          <p className="text-caption text-muted-foreground">
            Confidence is influenced by evidence completeness,
            corroborating signals, rule strength, contradictions,
            and missing information.
          </p>
        </div>
      </div>
    </TabsContent>
  );
}