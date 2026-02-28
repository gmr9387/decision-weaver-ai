import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, FileText, Scale, FlaskConical, BarChart3,
  Settings, Zap, ChevronLeft, ChevronRight, LogOut, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cases', label: 'Cases', icon: FileText },
  { path: '/rules', label: 'Rules Studio', icon: Scale },
  { path: '/simulation', label: 'Simulation Lab', icon: FlaskConical },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  return (
    <aside className={cn(
      "flex flex-col border-r border-border bg-surface-1 transition-all duration-300",
      collapsed ? "w-16" : "w-60"
    )}>
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-body-sm font-semibold text-foreground">InferenceCore</span>
            <span className="text-caption text-muted-foreground">AI Engine</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {navItems.map(item => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-body-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              )}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border">
        {user && profile && (
          <div className={cn(
            "flex items-center gap-3 px-4 py-3",
            collapsed && "justify-center px-0"
          )}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || ''}
                className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-border"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0 ring-1 ring-border">
                <User className="w-4 h-4 text-primary" />
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-body-sm font-medium text-foreground truncate">
                  {profile.display_name || 'User'}
                </span>
                <span className="text-caption text-muted-foreground truncate">
                  {user.email}
                </span>
              </div>
            )}
          </div>
        )}
        {user && (
          <button
            onClick={signOut}
            className={cn(
              "flex items-center gap-3 w-full px-5 py-3 text-body-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border-t border-border",
              collapsed && "justify-center px-0"
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full py-3 border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
