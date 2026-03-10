'use client';
// components/Sidebar.tsx
// Fixes:
//   1. Triple-click → single <Link> wraps entire item (no child span interception)
//   2. RBAC: reads module_permissions from Supabase, hides forbidden menus per role
//   3. Realtime: re-fetches permissions when auth state changes

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, GitMerge, Users, Building2,
  CheckSquare, Settings, LogOut, ChevronRight,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

// ─── All possible nav items ─────────────────────────────────────
const ALL_NAV = [
  { href: '/dashboard',  label: 'Dashboard',   icon: LayoutDashboard, module: 'dashboard'  },
  { href: '/pipeline',   label: 'Pipeline',    icon: GitMerge,        module: 'pipeline'   },
  { href: '/contacts',   label: 'Contacts',    icon: Users,           module: 'contacts'   },
  { href: '/companies',  label: 'Entreprises', icon: Building2,       module: 'companies'  },
  { href: '/tasks',      label: 'Tâches',      icon: CheckSquare,     module: 'tasks'      },
  { href: '/campaigns', icon: Mail, label: 'Campagnes' },
  { href: '/settings',   label: 'Paramètres',  icon: Settings,        module: 'settings'   },
] as const;

type ModuleKey = typeof ALL_NAV[number]['module'];

export default function Sidebar() {
  const pathname  = usePathname();
  const supabase  = getSupabaseClient();

  const [role,      setRole]      = useState<string | null>(null);
  const [allowed,   setAllowed]   = useState<Set<string>>(new Set());
  const [userEmail, setUserEmail] = useState<string>('');
  const [ready,     setReady]     = useState(false);

  // ── Load role + permissions ──────────────────────────────────
  useEffect(() => {
    async function loadPerms() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReady(true); return; }
      setUserEmail(user.email ?? '');

      // Get role from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = profile?.role ?? 'commercial';
      setRole(userRole);

      if (userRole === 'admin') {
        // Admin always sees everything
        setAllowed(new Set(ALL_NAV.map(n => n.module)));
      } else {
        // Read module_permissions for this role
        const { data: perms } = await supabase
          .from('module_permissions')
          .select('module, can_access')
          .eq('role', userRole);

        if (perms && perms.length > 0) {
          const accessSet = new Set<string>(
            perms.filter(p => p.can_access).map(p => p.module as string)
          );
          setAllowed(accessSet);
        } else {
          // Fallback if no permissions configured yet: commercial sees most things
          setAllowed(new Set(['dashboard', 'pipeline', 'contacts', 'companies', 'tasks']));
        }
      }
      setReady(true);
    }

    loadPerms();

    // Re-load on auth state change (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadPerms();
    });
    return () => subscription.unsubscribe();
  }, []);

  const visibleNav = ALL_NAV.filter(item => allowed.has(item.module));

  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  }

  // Don't render sidebar on auth pages
  if (pathname?.startsWith('/auth')) return null;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col z-40"
      style={{
        background: 'rgba(8,13,26,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}>

      {/* ── Logo ─────────────────────────────── */}
      <div className="px-6 py-7 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black italic text-lg leading-none">A</span>
        </div>
        <div>
          <p className="text-white font-black italic tracking-tight text-lg leading-none">AAAS</p>
          <p className="text-white/30 text-xs mt-0.5">CRM SaaS</p>
        </div>
      </div>

      {/* ── Nav items ────────────────────────── */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {!ready ? (
          // Skeleton while loading permissions
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 rounded-2xl bg-white/5 animate-pulse mx-1" />
          ))
        ) : visibleNav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname?.startsWith(href + '/');
          return (
            // Triple-click fix: single <Link> wraps EVERYTHING, no child spans intercepting
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-4 py-2.5 rounded-2xl
                transition-all duration-200 group select-none
                ${active
                  ? 'bg-indigo-600/20 text-indigo-400'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'}
              `}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-colors ${
                  active ? 'text-indigo-400' : 'text-white/30 group-hover:text-white/60'
                }`}
              />
              <span className="text-sm font-medium flex-1">{label}</span>
              {active && (
                <ChevronRight className="w-3 h-3 text-indigo-400/60 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── User + Sign out ──────────────────── */}
      <div className="px-4 py-5 border-t border-white/5 space-y-2">
        {role && (
          <div className="px-3 py-2">
            <p className="text-xs text-white/30 truncate">{userEmail}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400/70 mt-0.5">
              {role === 'admin' ? 'Administrateur'
                : role === 'commercial' ? 'Commercial'
                : role === 'user_standard' ? 'Utilisateur Standard'
                : role === 'partner' ? 'Partenaire'
                : role}
            </p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl
            text-white/30 hover:text-rose-400 hover:bg-rose-500/10
            transition-all duration-200 text-sm font-medium"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}