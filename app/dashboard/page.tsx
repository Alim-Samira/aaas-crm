// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────
// Analytics Dashboard – KPIs + Charts (glassmorphic)
// ─────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import {
  TrendingUp, Users, Target, DollarSign, Activity,
  ArrowUpRight, ArrowDownRight, Layers
} from 'lucide-react';
import GlassCard from '@/components/ui/GlassCard';
import { getSupabaseClient } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';
import type { LeadStats } from '@/types';

const PIE_COLORS = ['#06b6d4', '#f59e0b', '#10b981', '#f43f5e'];

const MOCK_MONTHLY = [
  { month: 'Jan', revenue: 12000, leads: 18 },
  { month: 'Fév', revenue: 19500, leads: 25 },
  { month: 'Mar', revenue: 15000, leads: 22 },
  { month: 'Avr', revenue: 27000, leads: 34 },
  { month: 'Mai', revenue: 23000, leads: 29 },
  { month: 'Jun', revenue: 31000, leads: 41 },
];

function KpiCard({
  title, value, sub, icon: Icon, trend, color
}: {
  title: string; value: string; sub: string;
  icon: React.ElementType; trend?: number; color: string;
}) {
  const positive = trend !== undefined && trend >= 0;
  return (
    <GlassCard className={`border-l-2 ${color}`} padding="md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
          <p className="text-2xl font-display font-bold text-white mt-1">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('border-', 'bg-').replace('/50','/15')}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${positive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {positive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
          {Math.abs(trend)}% vs mois précédent
        </div>
      )}
    </GlassCard>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass px-4 py-3 text-sm shadow-xl">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const [stats, setStats] = useState<LeadStats | null>(null);
  const supabase = getSupabaseClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('lead_stats').select('*').single();
      if (data) setStats(data as LeadStats);
    }
    load();
  }, []);

  const pieData = stats ? [
    { name: 'Nouveau',   value: stats.new_leads },
    { name: 'En cours',  value: stats.in_progress_leads },
    { name: 'Converti',  value: stats.converted_leads },
    { name: 'Perdu',     value: stats.lost_leads },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in animate-fill-both">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Vue d'ensemble de votre activité commerciale</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          title="Pipeline total"
          value={formatCurrency(stats?.pipeline_value ?? 0)}
          sub={`${stats?.total_leads ?? 0} leads actifs`}
          icon={Layers}
          trend={12}
          color="border-brand-500/50"
        />
        <KpiCard
          title="Chiffre d'affaires"
          value={formatCurrency(stats?.total_revenue ?? 0)}
          sub="Leads convertis"
          icon={DollarSign}
          trend={8}
          color="border-emerald-500/50"
        />
        <KpiCard
          title="Taux de conversion"
          value={`${stats?.conversion_rate ?? 0}%`}
          sub="Prospects → Clients"
          icon={Target}
          trend={-2}
          color="border-amber-500/50"
        />
        <KpiCard
          title="Leads totaux"
          value={String(stats?.total_leads ?? 0)}
          sub={`${stats?.new_leads ?? 0} nouveaux ce mois`}
          icon={Users}
          trend={15}
          color="border-cyan-500/50"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <GlassCard className="xl:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-semibold text-white text-base">Évolution du CA</h2>
              <p className="text-xs text-slate-400 mt-0.5">6 derniers mois</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
              <TrendingUp className="w-3.5 h-3.5" /> +18% ce trimestre
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MOCK_MONTHLY}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false}
                     tickFormatter={(v) => `${(v/1000).toFixed(0)}k€`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue" name="CA (€)"
                    stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Pipeline pie */}
        <GlassCard>
          <h2 className="font-semibold text-white text-base mb-1">Répartition pipeline</h2>
          <p className="text-xs text-slate-400 mb-5">Par statut</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                   paddingAngle={4} dataKey="value" nameKey="name">
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i]} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-slate-400">{d.name}</span>
                </div>
                <span className="font-semibold text-white">{d.value}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Leads per month bar */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-6">
          <Activity className="w-4 h-4 text-brand-400" />
          <h2 className="font-semibold text-white text-base">Volume de leads mensuels</h2>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MOCK_MONTHLY} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.06)" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="leads" name="Leads" fill="#8b5cf6" radius={[6,6,0,0]}>
              {MOCK_MONTHLY.map((_, i) => (
                <Cell key={i} fill={i === MOCK_MONTHLY.length - 1 ? '#6366f1' : '#8b5cf6'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
