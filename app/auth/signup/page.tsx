// app/auth/signup/page.tsx
// app/auth/signup/page.tsx — v8
// RULES:
//   commercial / partner / user_standard → compte créé directement, accès immédiat
//   admin ONLY → crée compte + access_request en attente (approbation requise)
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Briefcase, Handshake, User, Shield,
  ChevronRight, ChevronLeft, Eye, EyeOff,
  AlertCircle, CheckCircle, Clock, Loader2
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import type { AppRole } from '@/types';

const ROLES: {
  id: AppRole;
  icon: React.ElementType;
  label: string;
  description: string;
  requiresApproval: boolean; // ← ONLY admin = true now
  gradient: string;
  border: string;
  iconBg: string;
}[] = [
  {
    id: 'commercial',
    icon: Briefcase,
    label: 'Commercial',
    description: 'Gestion des leads, contacts et pipeline de vente',
    requiresApproval: false,          //  accès direct
    gradient: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'partner',
    icon: Handshake,
    label: 'Partenaire',
    description: 'Accès aux contacts et entreprises partenaires',
    requiresApproval: false,          //  accès direct
    gradient: 'from-teal-500/10 to-teal-600/5',
    border: 'border-teal-500/30',
    iconBg: 'bg-teal-500/20 text-teal-400',
  },
  {
    id: 'user_standard',
    icon: User,
    label: 'Utilisateur Standard',
    description: 'Vue générale de l\'application',
    requiresApproval: false,          //  accès direct (plus besoin d'approbation)
    gradient: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'admin',
    icon: Shield,
    label: 'Administrateur',
    description: 'Accès total — gestion des utilisateurs et permissions',
    requiresApproval: true,           //  seul rôle qui nécessite approbation
    gradient: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20 text-purple-400',
  },
];

export default function SignupPage() {
  const supabase = getSupabaseClient();

  const [step,          setStep]          = useState<1 | 2>(1);
  const [selectedRole,  setSelectedRole]  = useState<AppRole | null>(null);
  const [fullName,      setFullName]      = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [justification, setJustification] = useState('');
  const [showPwd,       setShowPwd]       = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [success,       setSuccess]       = useState(false);

  const roleData      = ROLES.find(r => r.id === selectedRole);
  const needsApproval = roleData?.requiresApproval ?? false; // true only for admin

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim())    return setError('Nom requis.');
    if (!email.trim())       return setError('Email requis.');
    if (password.length < 6) return setError('Mot de passe : minimum 6 caractères.');
    if (needsApproval && !justification.trim())
      return setError('Justification requise pour le rôle Administrateur.');

    setLoading(true); setError('');

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name:     fullName,
          role:          selectedRole,
          justification: needsApproval ? justification : undefined,
        },
      },
    });

    setLoading(false);
    if (signUpErr) return setError(signUpErr.message);
    if (data.user)  setSuccess(true);
  }

  // ── Écran de succès ──────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 50%), #030712' }}>
        <div className="w-full max-w-md text-center">
          {needsApproval ? (
            /* Admin: en attente d'approbation */
            <>
              <div className="w-20 h-20 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-amber-400" />
              </div>
              <h2 className="text-3xl font-black text-white italic mb-3">Demande envoyée</h2>
              <p className="text-white/50 mb-6">
                Votre compte <strong className="text-white">{email}</strong> a été créé avec un accès limité.<br />
                Un administrateur va examiner votre demande de rôle{' '}
                <strong className="text-amber-400">Administrateur</strong>.
              </p>
              <p className="text-sm text-white/30 mb-8">Vous serez notifié·e une fois approuvé·e.</p>
            </>
          ) : (
            /* Tous les autres rôles: accès immédiat */
            <>
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white italic mb-3">Compte créé !</h2>
              <p className="text-white/50 mb-2">
                Bienvenue sur <strong className="text-white">AAAS CRM</strong>.
              </p>
              <p className="text-white/40 text-sm mb-8">
                Rôle attribué : <strong className="text-white">{roleData?.label}</strong>
              </p>
            </>
          )}
          <Link href="/auth/login"
            className="inline-flex items-center gap-2 bg-white text-black font-bold px-8 py-4 rounded-2xl hover:bg-white/90 transition-all hover:scale-105">
            Se connecter <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.1) 0%, transparent 50%), #030712' }}>

      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/20 mb-4 backdrop-blur-xl">
            <span className="text-xl font-black text-white italic">A</span>
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter">AAAS CRM</h1>
          <p className="text-white/30 mt-1 text-sm">Créer un compte</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${step === s ? 'bg-white text-black' : step > s ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white/30'}`}>
                {step > s ? '✓' : s}
              </div>
              {s < 2 && <div className={`w-16 h-0.5 transition-all ${step > s ? 'bg-emerald-500' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* ── Étape 1 : Choix du rôle ── */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-white text-center mb-2">Quel est votre rôle ?</h2>
            <p className="text-white/30 text-center text-sm mb-6">Choisissez le rôle correspondant à votre fonction</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {ROLES.map(role => {
                const Icon      = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button key={role.id} onClick={() => { setSelectedRole(role.id); setError(''); }}
                    className={`relative p-5 rounded-2xl border text-left transition-all duration-200
                      ${isSelected
                        ? `bg-gradient-to-br ${role.gradient} ${role.border} scale-[1.02] shadow-xl`
                        : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 hover:scale-[1.01]'}`}>

                    {/* Badge approbation uniquement pour Admin */}
                    {role.requiresApproval && (
                      <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        Approbation
                      </span>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all
                      ${isSelected ? role.iconBg : 'bg-white/10 text-white/50'}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <p className={`font-bold text-sm mb-1 ${isSelected ? 'text-white' : 'text-white/70'}`}>
                      {role.label}
                    </p>
                    <p className={`text-xs leading-snug ${isSelected ? 'text-white/60' : 'text-white/30'}`}>
                      {role.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
              </div>
            )}

            <button onClick={() => { if (!selectedRole) return setError('Veuillez choisir un rôle.'); setError(''); setStep(2); }}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-white/90 hover:scale-[1.01] transition-all text-sm disabled:opacity-40"
              disabled={!selectedRole}>
              Continuer <ChevronRight className="w-4 h-4" />
            </button>

            <p className="text-center text-white/30 text-sm mt-4">
              Déjà un compte ?{' '}
              <Link href="/auth/login" className="text-white hover:underline font-bold">Se connecter</Link>
            </p>
          </div>
        )}

        {/* ── Étape 2 : Informations du compte ── */}
        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)}
              className="flex items-center gap-1 text-white/30 hover:text-white text-sm mb-6 transition-colors">
              <ChevronLeft className="w-4 h-4" /> Retour au choix du rôle
            </button>

            {/* Récapitulatif du rôle choisi */}
            {roleData && (
              <div className={`flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br ${roleData.gradient} border ${roleData.border} mb-6`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${roleData.iconBg}`}>
                  <roleData.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{roleData.label}</p>
                  <p className="text-xs text-white/40">{roleData.description}</p>
                </div>
                {needsApproval
                  ? <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Approbation requise
                    </span>
                  : <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Accès immédiat
                    </span>
                }
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Nom complet *</label>
                  <input className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                    placeholder="Jean Dupont" value={fullName} onChange={e => setFullName(e.target.value)} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Email *</label>
                  <input type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                    placeholder="jean@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>

              <div className="relative">
                <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">Mot de passe *</label>
                <input type={showPwd ? 'text' : 'password'}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all"
                  placeholder="Minimum 6 caractères" value={password} onChange={e => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-4 bottom-3 text-white/30 hover:text-white transition-colors">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Justification uniquement si Admin */}
              {needsApproval && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-white/30 mb-2">
                    Justification *
                    <span className="ml-2 normal-case text-amber-400/70">Pourquoi demandez-vous le rôle Admin ?</span>
                  </label>
                  <textarea
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 outline-none focus:border-white/30 transition-all resize-none"
                    rows={3}
                    placeholder="Expliquez pourquoi vous avez besoin d'un accès Administrateur…"
                    value={justification}
                    onChange={e => setJustification(e.target.value)}
                  />
                  <p className="text-xs text-white/25 mt-1">Votre demande sera examinée par l'administrateur existant.</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-4 rounded-2xl hover:bg-white/90 transition-all hover:scale-[1.01] disabled:opacity-60 text-sm">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Création du compte…</>
                  : needsApproval
                    ? <><Clock className="w-4 h-4" /> Soumettre la demande</>
                    : <><CheckCircle className="w-4 h-4" /> Créer mon compte</>}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}