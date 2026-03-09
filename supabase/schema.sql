-- ============================================================
-- CRM Full SaaS - Supabase PostgreSQL Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends Supabase Auth users)
-- ─────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'commercial' CHECK (role IN ('admin', 'commercial')),
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'commercial')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────
-- COMPANIES
-- ─────────────────────────────────────────────
CREATE TABLE public.companies (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  industry    TEXT,
  website     TEXT,
  phone       TEXT,
  address     TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE public.contacts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  company_id  UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  notes       TEXT,
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- LEADS
-- ─────────────────────────────────────────────
CREATE TABLE public.leads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id  UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'in_progress', 'converted', 'lost')),
  value       NUMERIC(12,2) DEFAULT 0,
  assigned_to UUID REFERENCES public.profiles(id),
  source      TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- INTERACTIONS
-- ─────────────────────────────────────────────
CREATE TABLE public.interactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id     UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note')),
  description TEXT NOT NULL,
  date        TIMESTAMPTZ DEFAULT NOW(),
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- TASKS
-- ─────────────────────────────────────────────
CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  due_date    TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'overdue')),
  lead_id     UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks       ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- profiles: users see their own; admins see all
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.is_admin());
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- companies: authenticated users can CRUD
CREATE POLICY "companies_all" ON public.companies
  FOR ALL USING (auth.uid() IS NOT NULL);

-- contacts: authenticated users can CRUD
CREATE POLICY "contacts_all" ON public.contacts
  FOR ALL USING (auth.uid() IS NOT NULL);

-- leads: commercials see only their assigned leads; admins see all
CREATE POLICY "leads_select" ON public.leads
  FOR SELECT USING (
    assigned_to = auth.uid() OR public.is_admin()
  );
CREATE POLICY "leads_insert" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "leads_update" ON public.leads
  FOR UPDATE USING (assigned_to = auth.uid() OR public.is_admin());
CREATE POLICY "leads_delete" ON public.leads
  FOR DELETE USING (public.is_admin());

-- interactions & tasks: authenticated users
CREATE POLICY "interactions_all" ON public.interactions
  FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "tasks_all" ON public.tasks
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- ANALYTICS VIEW
-- ─────────────────────────────────────────────
CREATE OR REPLACE VIEW public.lead_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'new')         AS new_leads,
  COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_leads,
  COUNT(*) FILTER (WHERE status = 'converted')   AS converted_leads,
  COUNT(*) FILTER (WHERE status = 'lost')        AS lost_leads,
  COUNT(*)                                        AS total_leads,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE status = 'converted')
    / NULLIF(COUNT(*), 0), 2
  )                                               AS conversion_rate,
  COALESCE(SUM(value) FILTER (WHERE status = 'converted'), 0) AS total_revenue,
  COALESCE(SUM(value), 0)                         AS pipeline_value
FROM public.leads;
