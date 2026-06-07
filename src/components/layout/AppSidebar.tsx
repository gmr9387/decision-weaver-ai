import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  Scale,
  FlaskConical,
  BarChart3,
  Settings,
  Zap,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  BookOpen,
  History,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';

type Profile = {
  display_name: string | null;
  avatar_url: string | null;
};

type Role = 'admin' | 'manager' | 'analyst' | 'viewer';

type NavItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  minRole?: Role;
};

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  analyst: 1,
  manager: 2,
  admin: 3,
};

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/cases', label: 'Cases', icon: FileText },
  { path: '/rules', label: 'Rules Studio', icon: Scale, minRole: 'analyst' },
  { path: '/simulation', label: 'Simulation Lab', icon: FlaskConical, minRole: 'analyst' },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, minRole: 'manager' },
  { path: '/operations', label: 'Operations', icon: History, minRole: 'analyst' },
  { path: '/api-docs', label: 'API Docs', icon: BookOpen, minRole: 'analyst' },
  { path: '/settings', label: 'Settings', icon: Settings, minRole: 'admin' },
];

function normalizeRole(value: unknown): Role {
  if (value === 'admin' || value === 'manager' || value === 'analyst' || value === 'viewer') {
    return value;
  }

  return 'viewer';
}

function canAccess(userRole: Role, required?: Role): boolean {
  if (!required) return true;
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export function AppSidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { signOut, user } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<Role>('viewer');

  useEffect(() => {
    let active = true;

    async function loadProfileAndRole() {
      if (!user) {
        setProfile(null);
        setRole('viewer');
        return;
      }

      const [{ data: profileData }, { data: roleData }] = await Promise.all([
        supabase
          .from('profiles')
          .select('display_name, avatar_url')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (!active) return;

      setProfile(profileData ?? null);
      setRole(normalizeRole(roleData?.role));
    }

    loadProfileAndRole();

    return () => {
      active = false;
    };
  }, [user]);

  const visibleNavItems = useMemo(
    () => navItems.filter((item) => canAccess(role, item.minRole)),
    [role],
  );

  return (
    <aside
      className={cn(
        'flex flex-col border-r border-border bg-surface-1 transition-all duration-300',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
          <Zap className="w-4 h-4 text-primary" />
        </div>

        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-body-sm font-semibold text-foreground">Weaver</span>
            <span className="text-caption text-muted-foreground">Decision Intelligence</span>
          </div>
        )}
      </div>

      <nav className="flex-1 py-3 px-2 space-y-1">
        {visibleNavItems.map((item) => {
          const active =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-body-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border">
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              collapsed && 'justify-center px-0',
            )}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || user.email || 'User'}
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
                  {profile?.display_name || 'User'}
                </span>
                <span className="text-caption text-muted-foreground truncate">
                  {user.email}
                </span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {role}
                </span>
              </div>
            )}
          </div>
        )}

        {user && (
          <button
            onClick={signOut}
            className={cn(
              'flex items-center gap-3 w-full px-5 py-3 text-body-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors border-t border-border',
              collapsed && 'justify-center px-0',
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
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}