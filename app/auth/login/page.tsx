// app/auth/login/page.tsx
// FIX 1 : login centré (suppression du padding top qui décalait)
// FIX 2 : bouton disabled pendant la requête → un seul clic suffit
// FIX 3 : window.location.href au lieu de router.push → session propagée
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Zap, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

export default function LoginPage() {
  const supabase = getSupabaseClient();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError('');

    const { error: err } = await supabase.auth.signInWithPassword({ email, password });

    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : err.message
      );
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  }

  return (
    //  FIX CENTRAGE : min-h-screen + flex + items-center + justify-center
    // Pas de padding top, pas de margin top → parfaitement centré verticalement
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-accent-purple
                          flex items-center justify-center shadow-2xl shadow-brand-500/40">
            <Zap className="w-7 h-7 text-white" strokeWidth={2.5} />
          </div>
        </div>

        <div className="glass-card">
          <h1 className="font-display text-2xl font-bold text-white text-center mb-1">
            Connexion
          </h1>
          <p className="text-slate-400 text-sm text-center mb-7">
            Accédez à votre espace CRM
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label-glass">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  className="input-glass pl-10"
                  type="email"
                  autoComplete="email"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="label-glass">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  className="input-glass pl-10 pr-10"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20
                             rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            {/*  disabled={loading} = impossible de cliquer 2x */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Connexion…</>
                : 'Se connecter'
              }
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 mt-5">
            Pas encore de compte ?{' '}
            <Link href="/auth/signup" className="text-brand-400 hover:text-brand-300 font-semibold">
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}