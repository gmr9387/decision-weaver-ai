import { TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Zap } from 'lucide-react';

interface InferenceTabProps {
  autoResolveThreshold: number[];
  setAutoResolveThreshold: (v: number[]) => void;
  escalationThreshold: number[];
  setEscalationThreshold: (v: number[]) => void;
  modes: { instant: boolean; deep: boolean; assisted: boolean };
  setModes: React.Dispatch<React.SetStateAction<{ instant: boolean; deep: boolean; assisted: boolean }>>;
}

export function InferenceTab({
  autoResolveThreshold, setAutoResolveThreshold,
  escalationThreshold, setEscalationThreshold,
  modes, setModes,
}: InferenceTabProps) {
  return (
    <TabsContent value="inference" className="space-y-4">
      <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-6">
        <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" /> Confidence Thresholds
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-body-sm text-muted-foreground">Auto-Resolution Threshold</span>
              <Badge variant="confidence" className="font-mono">{autoResolveThreshold[0]}%</Badge>
            </div>
            <Slider value={autoResolveThreshold} onValueChange={setAutoResolveThreshold} min={50} max={99} step={1} />
            <p className="text-caption text-muted-foreground mt-1">Cases above this confidence are auto-resolved</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-body-sm text-muted-foreground">Escalation Threshold</span>
              <Badge variant="warning" className="font-mono">{escalationThreshold[0]}%</Badge>
            </div>
            <Slider value={escalationThreshold} onValueChange={setEscalationThreshold} min={10} max={70} step={1} />
            <p className="text-caption text-muted-foreground mt-1">Cases below this confidence are escalated</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
        <h3 className="text-body-md font-semibold text-foreground">Inference Modes</h3>
        {([
          { key: 'instant' as const, mode: 'Instant Mode', desc: 'Normalization + rules + scoring. Fastest path.' },
          { key: 'deep' as const, mode: 'Deep Mode', desc: 'Instant + contradiction analysis + expanded actions.' },
          { key: 'assisted' as const, mode: 'Assisted Reasoning', desc: 'Deep + optional LLM reasoning for complex cases.' },
        ]).map(m => (
          <div key={m.key} className="flex items-center justify-between p-4 rounded-lg bg-surface-2">
            <div>
              <span className="text-body-sm font-medium text-foreground">{m.mode}</span>
              <p className="text-caption text-muted-foreground">{m.desc}</p>
            </div>
            <Switch checked={modes[m.key]} onCheckedChange={v => setModes(prev => ({ ...prev, [m.key]: v }))} />
          </div>
        ))}
      </div>
    </TabsContent>
  );
}
