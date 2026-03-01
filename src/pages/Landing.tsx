import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Zap, Shield, Brain, RotateCcw, FlaskConical, ListChecks,
  FileSearch, GitBranch, ArrowRight, ChevronRight
} from 'lucide-react';
import heroBg from '@/assets/hero-bg.jpg';

const features = [
  { icon: Brain, title: 'Explainable Inference', desc: 'Every decision comes with a full trace of which rules fired, what evidence was used, and why.' },
  { icon: Shield, title: 'Confidence Scoring', desc: 'Structured confidence model based on evidence quality, rule strength, and data completeness.' },
  { icon: GitBranch, title: 'Rules + Heuristics', desc: 'Deterministic rules, weighted signals, derived facts, and routing logic in one engine.' },
  { icon: RotateCcw, title: 'Replayable Decisions', desc: 'Reproduce any prior decision. Same input snapshot + rule version = same result.' },
  { icon: FlaskConical, title: 'Simulation Lab', desc: 'Test what-if scenarios by changing facts and comparing outcomes in real time.' },
  { icon: ListChecks, title: 'Recommended Actions', desc: 'Structured next-best-actions with urgency, ownership, and expected impact.' },
  { icon: FileSearch, title: 'Audit-Grade Traceability', desc: 'Complete decision traces for compliance, governance, and regulatory review.' },
  { icon: Zap, title: 'Queue Optimization', desc: 'Intelligent routing sends cases to the right queue, person, or workflow automatically.' },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 glass glass-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-body-md font-semibold text-foreground">InferenceCore AI</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-body-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Product</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="hero-outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button variant="hero" size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <div className="absolute inset-0 opacity-30">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        <div className="relative max-w-5xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-caption mb-8">
              <Zap className="w-3 h-3" /> Decision Intelligence Platform
            </div>
            <h1 className="text-display-xl text-foreground mb-6">
              Explainable intelligence for<br />
              <span className="text-gradient-hero">decisions that matter.</span>
            </h1>
            <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto mb-10">
              Turn raw operational data into traceable, confident, action-ready decisions.
              Staged inference. Structured confidence. Full audit trails.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button variant="hero" size="lg" className="gap-2">
                  Explore Product <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <Link to="/simulation">
                <Button variant="hero-outline" size="lg">View Simulation</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-border bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: '94%', label: 'Auto-Resolution Rate' },
            { value: '0.8s', label: 'Avg Decision Time' },
            { value: '12x', label: 'Throughput Improvement' },
            { value: '100%', label: 'Decision Traceability' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="text-center"
            >
              <div className="text-display-md text-gradient-primary mb-1">{stat.value}</div>
              <div className="text-body-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-display-md text-foreground mb-4">Built for serious decisions</h2>
            <p className="text-body-md text-muted-foreground max-w-xl mx-auto">
              Not a chatbot. Not a dashboard. A structured inference engine with full explainability.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((feat, i) => (
              <motion.div
                key={feat.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="group rounded-xl border border-border bg-gradient-card p-6 hover:border-primary/30 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feat.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-body-md font-semibold text-foreground mb-2">{feat.title}</h3>
                <p className="text-body-sm text-muted-foreground">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-surface-1 border-y border-border">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-display-md text-foreground mb-4">Five-layer inference architecture</h2>
            <p className="text-body-md text-muted-foreground">From raw input to actionable, explainable decisions.</p>
          </div>
          <div className="space-y-4">
            {[
              { step: '01', title: 'Intake + Normalization', desc: 'Raw payloads become structured, canonical fact sets with metadata and quality signals.' },
              { step: '02', title: 'Rules + Heuristics Engine', desc: 'Deterministic rules and weighted signals evaluate facts fast — the fast lane for most cases.' },
              { step: '03', title: 'Optional AI Reasoning', desc: 'LLM-assisted analysis activates only for complex, ambiguous, or contradictory cases.' },
              { step: '04', title: 'Decision Synthesis', desc: 'Combine all signals into a final decision with structured confidence and severity.' },
              { step: '05', title: 'Trace + Replay', desc: 'Persist every input, fact, rule, and output for full reproducibility and audit.' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex items-start gap-5 p-5 rounded-xl border border-border bg-gradient-card hover:border-primary/20 transition-colors"
              >
                <div className="text-overline text-primary font-mono mt-1">{item.step}</div>
                <div>
                  <h3 className="text-body-md font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-body-sm text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto mt-1 shrink-0" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-display-md text-foreground mb-4">Ready to make decisions defensible?</h2>
          <p className="text-body-md text-muted-foreground mb-8">
            See InferenceCore AI in action with your own data and workflows.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button variant="hero" size="lg">Book a Demo</Button>
            <Link to="/dashboard">
              <Button variant="hero-outline" size="lg">Explore Platform</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-caption text-muted-foreground">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span>InferenceCore AI</span>
          </div>
          <span>© 2026 InferenceCore AI. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
