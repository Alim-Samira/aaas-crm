// types/index.ts  — v7  (CEO → user_standard)
// ROLE CHANGES:
//   'ceo'  → 'user_standard'  (Utilisateur Standard)
//   admin / commercial / partner  → unchanged

export type AppRole = 'admin' | 'user_standard' | 'commercial' | 'partner';

// Legacy alias — keep for migration compatibility
export type Role = AppRole;

export type LeadStatus = 'new' | 'in_progress' | 'converted' | 'lost';
export type PipelineStage =
  | 'new'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'converted'
  | 'lost';
export type InteractionType = 'email' | 'call' | 'meeting' | 'note';
export type TaskStatus = 'pending' | 'todo' | 'in_progress' | 'done' | 'overdue';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  avatar_url: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  company?: Company;
}

export interface Lead {
  id: string;
  contact_id: string | null;
  title: string;
  status: LeadStatus;
  stage?: PipelineStage;
  value: number;
  assigned_to: string | null;
  source: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  contact?: Contact;
  assigned_profile?: Profile;
}

export interface Interaction {
  id: string;
  lead_id: string;
  type: InteractionType;
  description: string;
  date: string;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority?: 'low' | 'medium' | 'high';
  lead_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LeadStats {
  new_leads: number;
  in_progress_leads: number;
  converted_leads: number;
  lost_leads: number;
  total_leads: number;
  conversion_rate: number;
  total_revenue: number;
  pipeline_value: number;
}

export interface AccessRequest {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  requested_role: 'admin' | 'user_standard';
  status: 'pending' | 'approved' | 'rejected';
  justification: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface ModulePermission {
  id: string;
  module: string;
  role: AppRole;
  can_access: boolean;
}

export interface PipelineStageConfig {
  key: string;
  label: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export type KanbanColumn = {
  id: LeadStatus;
  label: string;
  color: string;
  leads: Lead[];
};

// ── Role display config ──────────────────────────────────────────
export const ROLE_CONFIG: Record<AppRole, {
  label: string;
  labelFr: string;
  description: string;
  badge: string;
  requiresApproval: boolean;
}> = {
  admin: {
    label: 'Admin',
    labelFr: 'Administrateur',
    description: 'Accès total — gestion des utilisateurs et permissions',
    badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    requiresApproval: true,
  },
  user_standard: {
    label: 'User Standard',
    labelFr: 'Utilisateur Standard',
    description: 'Vue utilisateur',
    badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    requiresApproval: true,
  },
  commercial: {
    label: 'Commercial',
    labelFr: 'Commercial',
    description: 'Gestion des leads, contacts et pipeline de vente',
    badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    requiresApproval: false,
  },
  partner: {
    label: 'Partenaire',
    labelFr: 'Partenaire',
    description: 'Accès aux contacts et entreprises partenaires',
    badge: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
    requiresApproval: false,
  },
};