import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Zap, LogIn } from 'lucide-react';

interface AuthGateContextType {
  /** Wrap any action — returns true if authenticated, shows dialog if not */
  requireAuth: (actionLabel?: string) => boolean;
}

const AuthGateContext = createContext<AuthGateContextType>({ requireAuth: () => false });

export function AuthGateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [actionLabel, setActionLabel] = useState('');

  const requireAuth = useCallback((label?: string) => {
    if (user) return true;
    setActionLabel(label || 'perform this action');
    setOpen(true);
    return false;
  }, [user]);

  return (
    <AuthGateContext.Provider value={{ requireAuth }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm bg-card border-border text-center">
          <DialogHeader className="items-center">
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-2">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <DialogTitle className="text-foreground">Sign in required</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a free account or sign in to {actionLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button variant="hero" className="gap-2" onClick={() => { setOpen(false); navigate('/auth'); }}>
              <LogIn className="w-4 h-4" /> Sign In / Sign Up
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Continue Browsing
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AuthGateContext.Provider>
  );
}

export const useAuthGate = () => useContext(AuthGateContext);
