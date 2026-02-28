import { AppLayout } from '@/components/layout/AppLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Copy, Terminal, Shield, Gauge, ArrowRight, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function CodeBlock({ code, language = 'bash' }: { code: string; language?: string }) {
  const { toast } = useToast();
  return (
    <div className="relative group rounded-lg bg-surface-1 border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-border">
        <span className="text-caption text-muted-foreground font-mono">{language}</span>
        <Button
          variant="ghost"
          size="icon"
          className="w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => { navigator.clipboard.writeText(code); toast({ title: 'Copied' }); }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-gradient-card p-6 space-y-4">
      <h3 className="text-body-md font-semibold text-foreground flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function ApiDocs() {
  return (
    <AppLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-display-sm text-foreground">API Documentation</h1>
            <p className="text-body-sm text-muted-foreground">Ingest cases from external systems via REST API</p>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-surface-2 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="endpoint">Endpoint</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="errors">Errors & Limits</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Section title="Getting Started" icon={ArrowRight}>
              <div className="space-y-3">
                <p className="text-body-sm text-muted-foreground">
                  The InferenceCore API allows external systems to submit cases for automated adjudication.
                  Cases submitted via the API are processed identically to those created in the UI.
                </p>
                <div className="space-y-2">
                  {[
                    { step: '1', text: 'Generate an API key from Settings → Organization' },
                    { step: '2', text: 'Send a POST request with your case data and API key' },
                    { step: '3', text: 'The case appears in your Cases dashboard for review' },
                    { step: '4', text: 'Run inference (manual or batch) to process the case' },
                  ].map(s => (
                    <div key={s.step} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                      <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <span className="text-caption font-bold text-primary">{s.step}</span>
                      </div>
                      <span className="text-body-sm text-foreground">{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>

            <Section title="Authentication" icon={Shield}>
              <p className="text-body-sm text-muted-foreground">
                All API requests require an organization API key passed via the <code className="bg-surface-2 px-1.5 py-0.5 rounded text-xs font-mono text-foreground">x-api-key</code> header.
              </p>
              <div className="p-4 rounded-lg bg-surface-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-xs">Header</Badge>
                  <code className="text-body-sm font-mono text-foreground">x-api-key: ic_your_api_key_here</code>
                </div>
                <p className="text-caption text-muted-foreground">
                  API keys are scoped to your organization. All cases created are automatically associated with your org.
                  Keys can be regenerated from Settings — regenerating invalidates the previous key.
                </p>
              </div>
            </Section>
          </TabsContent>

          <TabsContent value="endpoint" className="space-y-4">
            <Section title="POST /ingest-case" icon={Terminal}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="success" className="font-mono">POST</Badge>
                <code className="text-body-sm font-mono text-foreground">/functions/v1/ingest-case</code>
              </div>
              <p className="text-body-sm text-muted-foreground">Creates a new case with optional facts and metadata.</p>
            </Section>

            <Section title="Request Body" icon={ChevronRight}>
              <div className="overflow-x-auto">
                <table className="w-full text-body-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Field</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Required</th>
                      <th className="text-left py-2 text-muted-foreground font-medium">Description</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-xs">
                    {[
                      { field: 'category', type: 'string', req: false, desc: 'Case category. Default: "General"' },
                      { field: 'severity', type: 'enum', req: false, desc: '"low" | "medium" | "high" | "critical". Default: "medium"' },
                      { field: 'source', type: 'string', req: false, desc: 'Origin system. Default: "API Ingest"' },
                      { field: 'description', type: 'string', req: false, desc: 'Case description text' },
                      { field: 'amount', type: 'number', req: false, desc: 'Monetary amount associated with case' },
                      { field: 'owner', type: 'string', req: false, desc: 'Assignee name or identifier' },
                      { field: 'tags', type: 'string[]', req: false, desc: 'Array of tag strings' },
                      { field: 'facts', type: 'object', req: false, desc: 'Key-value map of case facts for inference' },
                      { field: 'metadata', type: 'object', req: false, desc: 'Arbitrary metadata JSON' },
                      { field: 'case_number', type: 'string', req: false, desc: 'Custom case number. Auto-generated if omitted' },
                    ].map(r => (
                      <tr key={r.field} className="border-b border-border/50">
                        <td className="py-2 pr-4 text-foreground">{r.field}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{r.type}</td>
                        <td className="py-2 pr-4">
                          <Badge variant={r.req ? 'destructive' : 'secondary'} className="text-[10px]">
                            {r.req ? 'Required' : 'Optional'}
                          </Badge>
                        </td>
                        <td className="py-2 text-muted-foreground font-sans text-caption">{r.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Response (201 Created)" icon={ChevronRight}>
              <CodeBlock language="json" code={`{
  "success": true,
  "case": {
    "id": "uuid",
    "case_number": "IC-2026-1012",
    "status": "open",
    "severity": "high",
    "created_at": "2026-02-28T16:26:41.848Z",
    "facts_count": 5
  }
}`} />
            </Section>
          </TabsContent>

          <TabsContent value="examples" className="space-y-4">
            <Section title="Basic Case Submission" icon={Terminal}>
              <CodeBlock code={`curl -X POST \\
  https://avcsczjzociyodulwcui.supabase.co/functions/v1/ingest-case \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ic_your_api_key_here" \\
  -d '{
    "category": "Risk Assessment",
    "severity": "high",
    "description": "Suspicious transaction pattern detected",
    "amount": 125000
  }'`} />
            </Section>

            <Section title="Case with Facts (for Inference)" icon={Terminal}>
              <CodeBlock code={`curl -X POST \\
  https://avcsczjzociyodulwcui.supabase.co/functions/v1/ingest-case \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ic_your_api_key_here" \\
  -d '{
    "category": "Authorization Review",
    "severity": "critical",
    "source": "Partner Feed",
    "description": "Multi-account authorization anomaly",
    "amount": 250000,
    "tags": ["fraud-detection", "multi-account"],
    "facts": {
      "amount_requested": 250000,
      "risk_score": 92,
      "requester_tier": "standard",
      "authorization_type": "Prior Authorization",
      "compliance_status": "flagged",
      "flagged_accounts": 5
    },
    "metadata": {
      "external_id": "EXT-2026-48291",
      "partner": "AcmeCorp"
    }
  }'`} />
            </Section>

            <Section title="Python Example" icon={Terminal}>
              <CodeBlock language="python" code={`import requests

response = requests.post(
    "https://avcsczjzociyodulwcui.supabase.co/functions/v1/ingest-case",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "ic_your_api_key_here",
    },
    json={
        "category": "Compliance Check",
        "severity": "medium",
        "description": "Quarterly compliance review",
        "facts": {
            "compliance_score": 78,
            "violations_count": 2,
        },
    },
)

print(response.json())
# {"success": true, "case": {"id": "...", ...}}`} />
            </Section>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <Section title="Error Responses" icon={Shield}>
              <div className="space-y-3">
                {[
                  { code: '400', desc: 'Bad Request', detail: 'Invalid field values (e.g., unknown severity level)' },
                  { code: '401', desc: 'Unauthorized', detail: 'Missing or malformed x-api-key header' },
                  { code: '403', desc: 'Forbidden', detail: 'API key does not match any organization' },
                  { code: '405', desc: 'Method Not Allowed', detail: 'Only POST requests are accepted' },
                  { code: '429', desc: 'Too Many Requests', detail: 'Rate limit exceeded (see below)' },
                  { code: '500', desc: 'Internal Error', detail: 'Server-side failure — retry with backoff' },
                ].map(e => (
                  <div key={e.code} className="flex items-start gap-3 p-3 rounded-lg bg-surface-2">
                    <Badge variant={parseInt(e.code) >= 500 ? 'destructive' : parseInt(e.code) >= 400 ? 'warning' : 'secondary'} className="font-mono shrink-0">
                      {e.code}
                    </Badge>
                    <div>
                      <span className="text-body-sm font-medium text-foreground">{e.desc}</span>
                      <p className="text-caption text-muted-foreground">{e.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Rate Limits" icon={Gauge}>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-surface-2 text-center">
                    <span className="text-display-sm text-primary font-bold">30</span>
                    <p className="text-caption text-muted-foreground mt-1">Requests per minute</p>
                  </div>
                  <div className="p-4 rounded-lg bg-surface-2 text-center">
                    <span className="text-display-sm text-primary font-bold">1 min</span>
                    <p className="text-caption text-muted-foreground mt-1">Sliding window</p>
                  </div>
                </div>
                <p className="text-body-sm text-muted-foreground">
                  Rate limits are per-organization. Every response includes these headers:
                </p>
                <div className="space-y-1">
                  {[
                    { header: 'X-RateLimit-Limit', desc: 'Maximum requests per window' },
                    { header: 'X-RateLimit-Remaining', desc: 'Remaining requests in current window' },
                    { header: 'X-RateLimit-Reset', desc: 'ISO timestamp when the window resets' },
                    { header: 'Retry-After', desc: 'Seconds to wait (only on 429 responses)' },
                  ].map(h => (
                    <div key={h.header} className="flex items-center gap-3 p-2 rounded bg-surface-2">
                      <code className="text-xs font-mono text-foreground min-w-[180px]">{h.header}</code>
                      <span className="text-caption text-muted-foreground">{h.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
