import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Zap, ArrowRight, Mail, Lock, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { Navigate } from 'react-router-dom';

export default function Auth() {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' });
    } else {
      navigate('/dashboard');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent a verification link to confirm your account.' });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Check your email', description: 'We sent a password reset link.' });
      setIsForgotPassword(false);
    }
  };

  if (isForgotPassword) {
    return (
      <AuthShell>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <h2 className="text-display-sm text-foreground mb-2">Reset password</h2>
          <p className="text-body-sm text-muted-foreground mb-6">Enter your email to receive a reset link.</p>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-body-sm text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9 bg-surface-2" placeholder="you@company.com" />
              </div>
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <button type="button" onClick={() => setIsForgotPassword(false)} className="text-body-sm text-primary hover:underline w-full text-center">
              Back to login
            </button>
          </form>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <h2 className="text-display-sm text-foreground mb-2">
          {isSignUp ? 'Get started' : 'Welcome back'}
        </h2>
        <p className="text-body-sm text-muted-foreground mb-6">
          {isSignUp ? 'Create your InferenceCore account.' : 'Sign in to your InferenceCore account.'}
        </p>

        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name" className="text-body-sm text-muted-foreground">Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" required value={displayName} onChange={e => setDisplayName(e.target.value)} className="pl-9 bg-surface-2" placeholder="Your name" />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-body-sm text-muted-foreground">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="pl-9 bg-surface-2" placeholder="you@company.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-body-sm text-muted-foreground">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="pl-9 bg-surface-2" placeholder="••••••••" />
            </div>
          </div>

          {!isSignUp && (
            <button type="button" onClick={() => setIsForgotPassword(true)} className="text-caption text-primary hover:underline">
              Forgot password?
            </button>
          )}

          <Button type="submit" variant="hero" className="w-full gap-2" disabled={submitting}>
            {submitting ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </Button>
        </form>

        <p className="text-body-sm text-muted-foreground text-center mt-6">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button onClick={() => setIsSignUp(!isSignUp)} className="text-primary hover:underline font-medium">
            {isSignUp ? 'Sign in' : 'Get started'}
          </button>
        </p>
      </motion.div>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-card border-r border-border items-center justify-center p-12">
        <div className="max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span className="text-body-lg font-semibold text-foreground">InferenceCore AI</span>
          </div>
          <h1 className="text-display-md text-foreground mb-4">
            Explainable intelligence for{' '}
            <span className="text-gradient-hero">decisions that matter.</span>
          </h1>
          <p className="text-body-md text-muted-foreground">
            Structured inference. Full audit trails. Confidence you can trust.
          </p>
        </div>
      </div>
      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="lg:hidden flex items-center gap-2 absolute top-6 left-6">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-body-md font-semibold text-foreground">InferenceCore AI</span>
        </div>
        {children}
      </div>
    </div>
  );
}
