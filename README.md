# AAAS CRM — Documentation Technique

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-06B6D4?style=for-the-badge&logo=tailwindcss)
![Vercel](https://img.shields.io/badge/Vercel-CI%2FCD-000?style=for-the-badge&logo=vercel)

**Application CRM SaaS Full Stack · Projet Communication Digitale**  
Live → [aaas-crm.vercel.app](https://aaas-crm.vercel.app) · Code → [github.com/Alim-Samira/aaas-crm](https://github.com/Alim-Samira/aaas-crm)

</div>

---

## Table des matières

1. [Présentation du projet](#1-présentation-du-projet)
2. [Stack technique](#2-stack-technique)
3. [Architecture du système](#3-architecture-du-système)
4. [Structure des fichiers](#4-structure-des-fichiers)
5. [Diagrammes UML](#5-diagrammes-uml)
   - 5.1 [Diagramme de cas d'utilisation](#51-diagramme-de-cas-dutilisation)
   - 5.2 [Diagramme de classes (MCD)](#52-diagramme-de-classes-mcd)
   - 5.3 [Diagramme de séquence — Authentification](#53-diagramme-de-séquence--authentification--rbac)
   - 5.4 [Diagramme de séquence — Création & assignation de tâche](#54-diagramme-de-séquence--création--assignation-de-tâche)
   - 5.5 [Diagramme de séquence — Campagne email](#55-diagramme-de-séquence--campagne-email--tracking)
   - 5.6 [Diagramme d'activité — Pipeline Kanban](#56-diagramme-dactivité--pipeline-kanban)
   - 5.7 [Diagramme de déploiement](#57-diagramme-de-déploiement)
6. [Fonctionnalités par module](#6-fonctionnalités-par-module)
7. [Système RBAC — Rôles & Permissions](#7-système-rbac--rôles--permissions)
8. [Installation locale](#8-installation-locale)
9. [Configuration Supabase](#9-configuration-supabase)
10. [Variables d'environnement](#10-variables-denvironnement)
11. [Déploiement CI/CD](#11-déploiement-cicd)
12. [Licence](#12-licence)

---

## 1. Présentation du projet

**AAAS CRM** est une application web SaaS de Gestion de la Relation Client développée dans le cadre du cours de Communication Digitale. Elle centralise la gestion des leads, contacts, tâches et campagnes email dans une interface glassmorphism.

### Vue d'ensemble des fonctionnalités

| Module | Description | Nouveautés v2 |
|--------|-------------|---------------|
| 🔐 **Authentification** | Login · Signup · JWT · 4 rôles RBAC | Master Admin protégé |
| 🎯 **Pipeline Kanban** | 6 étapes · Drag-and-drop · Valeur · Assign à un user | ✅ Assignation utilisateur |
| 👤 **Contacts** | CRUD complet · Recherche · Filtres | — |
| 🏢 **Entreprises** | Annuaire · Association contacts | — |
| ✅ **Tâches** | Kanban · Priorité · Échéances · Assign + notifications | ✅ Notifications temps réel |
| 📊 **Dashboard** | KPIs · Recharts · Taux de conversion · CA | — |
| 📧 **Campagnes Email** | Brevo · Templates · Ciblage par rôle · Click tracking | ✅ Fix ciblage + tracking |
| ⚙️ **Paramètres** | Gestion users · Master Admin · Permissions · Sous-admins | ✅ Hiérarchie admin |
| 🔔 **Notifications** | Bell temps réel · Tâches assignées · Statut modifiable | ✅ Nouveau |

---

## 2. Stack technique

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                        │
│  Next.js 14 (App Router)  ·  TypeScript 5  ·  Tailwind CSS      │
│  Glassmorphism UI  ·  Recharts  ·  @hello-pangea/dnd            │
├─────────────────────────────────────────────────────────────────┤
│  BACKEND / BDD                                                   │
│  Supabase (PostgreSQL 15)  ·  Row Level Security (RLS)          │
│  Auth JWT  ·  Realtime subscriptions  ·  Edge Functions         │
├─────────────────────────────────────────────────────────────────┤
│  SERVICES EXTERNES                                               │
│  Brevo (email transactionnel + campagnes)                        │
├─────────────────────────────────────────────────────────────────┤
│  DEVOPS                                                          │
│  Vercel (hosting + CDN)  ·  GitHub (CI/CD auto-deploy)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Architecture du système

```
┌───────────────────────────────────────────────────────────────────────────┐
│                              NAVIGATEUR                                    │
│                     React · Next.js App Router · TypeScript                │
└─────────────────────────────┬─────────────────────────────────────────────┘
                              │ HTTPS
                              ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         VERCEL EDGE NETWORK                                │
│              CDN · SSR · API Routes · Auto-deploy via GitHub               │
└──────────┬────────────────────────────────────────┬────────────────────────┘
           │ Supabase JS SDK                         │ API Routes (Next.js)
           ▼                                         ▼
┌──────────────────────────┐             ┌──────────────────────────────────┐
│       SUPABASE           │             │        BREVO API                  │
│  PostgreSQL 15           │             │  POST /v3/smtp/email              │
│  Auth (JWT + Refresh)    │             │  Campagnes ciblées par rôle       │
│  Row Level Security      │             │  Tracking clics/ouvertures        │
│  Realtime Subscriptions  │             └──────────────────────────────────┘
│  Storage                 │
└──────────────────────────┘

Flux de données sécurisé :
  Client → RLS Policy → PostgreSQL  (lecture/écriture filtrée par user.id + role)
  Admin API → service_role key      (bypass RLS — création de comptes uniquement)
```

---

## 4. Structure des fichiers

```
crm-project/
├── app/                          # Next.js App Router
│   ├── auth/
│   │   ├── login/page.tsx        # Page de connexion
│   │   └── signup/page.tsx       # Page d'inscription + choix rôle
│   ├── dashboard/page.tsx        # KPIs, graphiques Recharts
│   ├── pipeline/page.tsx         # Kanban leads + assignation
│   ├── contacts/page.tsx         # CRUD contacts
│   ├── companies/page.tsx        # Répertoire entreprises
│   ├── tasks/page.tsx            # Kanban tâches + assignation + notifs
│   ├── settings/page.tsx         # Admin : users, campagnes, permissions
│   ├── api/
│   │   ├── admin/create-user/route.ts   # Création compte via service_role
│   │   ├── brevo/route.ts               # Email transactionnel
│   │   └── brevo/campaign/route.ts      # Campagnes + webhook tracking
│   └── layout.tsx                # Layout global + dynamic='force-dynamic'
├── components/
│   ├── Sidebar.tsx               # Nav + 🔔 cloche notifications temps réel
│   └── LoadingScreen.tsx         # Loader glassmorphism
├── lib/
│   ├── supabase.ts               # Client Supabase (browser)
│   ├── supabase-server.ts        # Client Supabase (server / API routes)
│   └── utils.ts                  # formatCurrency, etc.
├── types/
│   └── index.ts                  # Profile, Lead, Contact, AppRole…
└── supabase/
    ├── schema.sql                # Schéma initial
    └── patches/                  # SQL patches cumulatifs
```

---

## 5. Diagrammes UML

### 5.1 Diagramme de cas d'utilisation

```
╔══════════════════════════════════════════════════════════════════════════╗
║                           Système AAAS CRM                               ║
║                                                                          ║
║   ┌──────────────┐    ┌────────────────────────────────────────────┐    ║
║   │   Visiteur   │───▶│ S'authentifier (login / signup)            │    ║
║   └──────────────┘    └────────────────────────────────────────────┘    ║
║                                                                          ║
║   ┌──────────────┐    ┌────────────────────────────────────────────┐    ║
║   │  Utilisateur │───▶│ Voir les notifications assignées           │    ║
║   │  (tous rôles)│───▶│ Modifier le statut d'une tâche assignée    │    ║
║   └──────────────┘    └────────────────────────────────────────────┘    ║
║          │                                                               ║
║          ├ extends                                                        ║
║          ▼                                                               ║
║   ┌──────────────┐    ┌────────────────────────────────────────────┐    ║
║   │  Commercial  │───▶│ Gérer les leads (Kanban + assignation)     │    ║
║   │  / Standard  │───▶│ Gérer les contacts & entreprises           │    ║
║   │  / Partenaire│───▶│ Gérer ses propres tâches                   │    ║
║   └──────────────┘    │ Consulter le dashboard                     │    ║
║          │            └────────────────────────────────────────────┘    ║
║          ├ extends                                                        ║
║          ▼                                                               ║
║   ┌──────────────┐    ┌────────────────────────────────────────────┐    ║
║   │  Sous-Admin  │───▶│ Voir tous les utilisateurs (sauf master)   │    ║
║   │  (admin role)│───▶│ Modifier rôles : commercial/standard/part. │    ║
║   │              │───▶│ Envoyer des campagnes email ciblées        │    ║
║   │              │···▶│ Approuver demandes admin (si autorisé)     │    ║
║   └──────────────┘    └────────────────────────────────────────────┘    ║
║          │            ··· = conditionnel (permission "can_approve_admin")║
║          ├ extends                                                        ║
║          ▼                                                               ║
║   ┌──────────────┐    ┌────────────────────────────────────────────┐    ║
║   │ Master Admin │───▶│ Voir TOUS les utilisateurs (incl. admins)  │    ║
║   │(alim.samira) │───▶│ Modifier TOUS les rôles (sauf son propre)  │    ║
║   │              │───▶│ Accorder permission "Approuver admins"      │    ║
║   │              │───▶│ Configurer les permissions par module       │    ║
║   │              │───▶│ Approuver toutes les demandes d'accès      │    ║
║   │  (protégé)   │    └────────────────────────────────────────────┘    ║
║   └──────────────┘                                                       ║
╚══════════════════════════════════════════════════════════════════════════╝
```

---

### 5.2 Diagramme de classes (MCD)

```
┌─────────────────────┐          ┌──────────────────────┐
│       profiles      │          │       contacts        │
├─────────────────────┤          ├──────────────────────┤
│ + id: UUID (PK)     │◀────┐    │ + id: UUID (PK)       │
│ + email: TEXT       │     │    │ + first_name: TEXT    │
│ + full_name: TEXT   │     │    │ + last_name: TEXT     │
│ + role: AppRole     │     │    │ + email: TEXT         │
│ + avatar_url: TEXT  │     │    │ + phone: TEXT         │
│ + created_at: TS    │     │    │ + company_id: UUID ──────────┐
└──────────┬──────────┘     │    │ + created_by: UUID    │      │
           │                │    │ + created_at: TS      │      │
           │ 1..N           │    └──────────┬────────────┘      │
           ▼                │              1│                    │
┌─────────────────────┐     │              │N                   │
│        leads        │     │              ▼                    ▼
├─────────────────────┤     │    ┌──────────────────────┐  ┌────────────────┐
│ + id: UUID (PK)     │     │    │     interactions      │  │   companies    │
│ + title: TEXT       │     │    ├──────────────────────┤  ├────────────────┤
│ + value: NUMERIC    │     │    │ + id: UUID (PK)       │  │ + id: UUID(PK) │
│ + status: LeadStatus│     │    │ + lead_id: UUID ◀─────┤  │ + name: TEXT   │
│ + contact_id: UUID ─┼─────┼───▶│ + type: TEXT          │  │ + industry:TEXT│
│ + assigned_to: UUID─┼─────┘    │ + description: TEXT   │  │ + website:TEXT │
│ + assigned_by: UUID │          │ + date: DATE          │  │ + created_at:TS│
│ + assigned_at: TS   │          │ + created_at: TS      │  └────────────────┘
│ + notes: TEXT       │          └──────────────────────┘
│ + created_by: UUID  │
│ + created_at: TS    │          ┌──────────────────────┐
└─────────────────────┘          │    notifications      │
                                 ├──────────────────────┤
┌─────────────────────┐          │ + id: UUID (PK)       │
│        tasks        │          │ + user_id: UUID ◀─────┤── (profiles.id)
├─────────────────────┤          │ + type: TEXT          │
│ + id: UUID (PK)     │          │ + title: TEXT         │
│ + title: TEXT       │          │ + body: TEXT          │
│ + description: TEXT │          │ + entity_id: UUID     │
│ + status: TaskStatus│          │ + entity_type: TEXT   │
│ + priority: Priority│          │ + read: BOOLEAN       │
│ + due_date: DATE    │          │ + created_at: TS      │
│ + assigned_to: UUID─┼──────────┴──────────────────────┘
│ + assigned_by: UUID │
│ + assigned_at: TS   │          ┌──────────────────────┐
│ + created_by: UUID  │          │   email_campaigns     │
│ + created_at: TS    │          ├──────────────────────┤
└─────────────────────┘          │ + id: UUID (PK)       │
                                 │ + name: TEXT          │
┌─────────────────────┐          │ + subject: TEXT       │
│  module_permissions │          │ + body: TEXT          │
├─────────────────────┤          │ + status: TEXT        │
│ + id: UUID (PK)     │          │ + target_role: TEXT   │
│ + module: TEXT      │          │ + recipients: INT     │
│ + role: AppRole     │          │ + click_count: INT    │
│ + can_access: BOOL  │          │ + open_count: INT     │
│ UNIQUE(module,role) │          │ + sent_at: TS         │
└─────────────────────┘          │ + created_by: UUID   │
                                 │ + created_at: TS      │
┌─────────────────────┐          └──────────────────────┘
│  admin_permissions  │
├─────────────────────┤          ┌──────────────────────┐
│ + id: UUID (PK)     │          │   access_requests     │
│ + user_id: UUID     │          ├──────────────────────┤
│ + can_approve_admin │          │ + id: UUID (PK)       │
│ + granted_by: UUID  │          │ + user_id: UUID       │
│ UNIQUE(user_id)     │          │ + email: TEXT         │
└─────────────────────┘          │ + requested_role:TEXT │
                                 │ + status: TEXT        │
                                 │ + reviewed_by: UUID   │
                                 │ + created_at: TS      │
                                 └──────────────────────┘

AppRole  = 'admin' | 'user_standard' | 'commercial' | 'partner'
TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue'
LeadStatus = 'new' | 'in_progress' | 'converted' | 'lost'
Priority = 'low' | 'medium' | 'high'
```

---

### 5.3 Diagramme de séquence — Authentification & RBAC

```
  Utilisateur      Next.js / Auth Page        Supabase Auth         DB profiles
      │                    │                       │                     │
      │  POST signup       │                       │                     │
      │  (email, pwd, role)│                       │                     │
      │───────────────────▶│                       │                     │
      │                    │ supabase.auth.signUp()│                     │
      │                    │──────────────────────▶│                     │
      │                    │                       │ INSERT auth.users   │
      │                    │                       │────────────────────▶│
      │                    │                       │ TRIGGER: handle_new_user()
      │                    │                       │ → INSERT profiles   │
      │                    │                       │   role = 'commercial'│ (toujours)
      │                    │                       │ → IF role ∈ {admin} │
      │                    │                       │   INSERT access_requests
      │                    │                       │────────────────────▶│
      │                    │     JWT token         │                     │
      │                    │◀──────────────────────│                     │
      │  Redirect dashboard│                       │                     │
      │◀───────────────────│                       │                     │
      │                    │                       │                     │
      │  [Admin side]      │                       │                     │
      │                    │ SELECT access_requests│                     │
      │                    │  WHERE status='pending'│                    │
      │                    │──────────────────────────────────────────▶│
      │                    │◀──────────────────────────────────────────│
      │  ⚠️ Badge count    │                       │                     │
      │◀───────────────────│                       │                     │
      │  [Admin approves]  │                       │                     │
      │  Click "Approuver" │                       │                     │
      │───────────────────▶│ rpc('update_user_role')                    │
      │                    │──────────────────────────────────────────▶│
      │                    │  SECURITY DEFINER function                  │
      │                    │  → guards master admin email                │
      │                    │  → UPDATE profiles SET role = new_role     │
      │                    │◀──────────────────────────────────────────│
      │  Role updated ✅   │                       │                     │
      │◀───────────────────│                       │                     │
```

---

### 5.4 Diagramme de séquence — Création & assignation de tâche

```
  Admin/User       app/tasks/page.tsx          Supabase DB          Assigné
      │                    │                       │                    │
      │  Ouvre modal       │                       │                    │
      │  "Nouvelle tâche"  │                       │                    │
      │───────────────────▶│                       │                    │
      │                    │ SELECT profiles       │                    │
      │                    │ (pour liste assignees)│                    │
      │                    │──────────────────────▶│                    │
      │                    │◀──────────────────────│                    │
      │  Choisit assigné   │                       │                    │
      │  Soumet le formulaire                      │                    │
      │───────────────────▶│                       │                    │
      │                    │ INSERT tasks          │                    │
      │                    │ { assigned_to: userId }                    │
      │                    │──────────────────────▶│                    │
      │                    │                       │ TRIGGER:           │
      │                    │                       │ notify_task_assigned()
      │                    │                       │ → INSERT notifications
      │                    │                       │   { user_id: assigné.id,
      │                    │                       │     type: 'task_assigned',
      │                    │                       │     entity_id: task.id }
      │                    │                       │──────────────────▶│
      │  Tâche créée ✅    │                       │                    │
      │◀───────────────────│                       │                    │
      │                    │                       │  [Realtime push]   │
      │                    │                       │  Supabase channel  │
      │                    │                       │─────────────────────────▶
      │                    │                       │                    │ 🔔 Bell +1
      │                    │                       │                    │ Badge rouge
      │                    │                       │                    │
      │                    │                       │          [Assigné clique la cloche]
      │                    │                       │◀──────────────────│
      │                    │                       │ SELECT tasks WHERE id=entity_id
      │                    │                       │──────────────────▶│
      │                    │                       │◀──────────────────│
      │                    │                       │    Détails tâche + status picker
      │                    │                       │──────────────────▶│
      │                    │                       │                    │ UPDATE tasks
      │                    │                       │◀──────────────────│ SET status='done'
```

---

### 5.5 Diagramme de séquence — Campagne email & tracking

```
  Admin           app/settings       /api/brevo/campaign      Brevo API      Destinataires
    │                  │                     │                    │                │
    │  Compose email   │                     │                    │                │
    │  Choisit rôle    │                     │                    │                │
    │  "partner"       │                     │                    │                │
    │─────────────────▶│                     │                    │                │
    │                  │ POST campaignId     │                    │                │
    │                  │────────────────────▶│                    │                │
    │                  │                     │ SELECT profiles    │                │
    │                  │                     │ WHERE role='partner'               │
    │                  │                     │ (FIX: was contacts table before)   │
    │                  │                     │ → liste filtrée    │                │
    │                  │                     │                    │                │
    │                  │                     │ POUR chaque profil │                │
    │                  │                     │ → génère trackingUrl               │
    │                  │                     │ → pixel open       │                │
    │                  │                     │ POST /smtp/email   │                │
    │                  │                     │────────────────────▶│               │
    │                  │                     │                    │ Send email ───▶│
    │                  │                     │ UPDATE campaigns   │                │
    │                  │                     │ SET status='sent'  │                │
    │                  │ { sent: N } ✅      │                    │                │
    │◀─────────────────│                     │                    │                │
    │                  │                     │                    │    [User clique le lien]
    │                  │                     │◀───────────────────────────────────│
    │                  │                     │ GET ?webhook=1&event=click          │
    │                  │                     │ rpc('increment_campaign_clicks')   │
    │                  │                     │ click_count += 1   │                │
    │                  │                     │                    │                │
    │  [Admin refresh] │                     │                    │                │
    │  Voit % clics mis à jour dans l'app    │                    │                │
```

---

### 5.6 Diagramme d'activité — Pipeline Kanban

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  DÉMARRER                                                        │
  └──────────────────────────────┬──────────────────────────────────┘
                                 ▼
                    ┌────────────────────────┐
                    │  Créer un nouveau lead  │
                    │  (titre, valeur, contact│
                    │   assigné à un user)    │
                    └───────────┬────────────┘
                                │
                                ▼
                    ┌────────────────────────┐
                    │     NOUVEAU            │   ← status = 'new'
                    │  Lead entrant          │
                    └───────────┬────────────┘
                                │ drag-and-drop ou édition
                                ▼
                    ┌────────────────────────┐
                    │     EN COURS           │   ← status = 'in_progress'
                    │  Qualification         │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴────────────┐
                    ▼                        ▼
        ┌───────────────────┐    ┌──────────────────────┐
        │  Réunion concluante│    │  Pas d'intérêt       │
        └─────────┬─────────┘    └──────────┬───────────┘
                  ▼                         ▼
        ┌───────────────────┐    ┌──────────────────────┐
        │    CONVERTI       │    │       PERDU           │
        │  Deal gagné ✅    │    │  Archivé ❌           │
        │  CA += valeur     │    │                      │
        └───────────────────┘    └──────────────────────┘
                  │
                  ▼
        ┌───────────────────┐
        │ Dashboard mis à   │
        │ jour (KPIs)       │
        └───────────────────┘
```

---

### 5.7 Diagramme de déploiement

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DÉVELOPPEUR                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  VS Code  ·  git commit  ·  git push origin main                │   │
│  └──────────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │ push event (webhook)
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  GITHUB                                                                  │
│  repository: Alim-Samira/aaas-crm  ·  branch: main                     │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ Vercel GitHub App
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  VERCEL                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────────────────┐   │
│  │ next build │→ │ Type check │→ │ Deploy → aaas-crm.vercel.app     │   │
│  └────────────┘  └────────────┘  └─────────────────────────────────┘   │
│  Env vars: SUPABASE_URL · SUPABASE_ANON_KEY · SERVICE_ROLE_KEY          │
│            BREVO_API_KEY · BREVO_SENDER_EMAIL · NEXT_PUBLIC_APP_URL     │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │
                 ┌─────────────────┴────────────────┐
                 ▼                                   ▼
┌────────────────────────────┐     ┌────────────────────────────────────┐
│       SUPABASE             │     │          BREVO                      │
│  hbkamwcuuiscoworqbio      │     │  api.brevo.com                      │
│  ┌──────────────────────┐  │     │  ┌─────────────────────────────┐   │
│  │  PostgreSQL 15       │  │     │  │  SMTP transactionnel        │   │
│  │  Auth JWT            │  │     │  │  Campagnes ciblées par rôle │   │
│  │  RLS policies        │  │     │  │  Tracking clics/ouvertures  │   │
│  │  Realtime channels   │  │     │  └─────────────────────────────┘   │
│  └──────────────────────┘  │     └────────────────────────────────────┘
└────────────────────────────┘
```

---

## 6. Fonctionnalités par module

### 🔔 Notifications (nouveau)
- Cloche dans la Sidebar avec badge rouge du nombre de non-lues
- **Realtime** via Supabase channel + polling toutes les 30s
- Cliquer sur la cloche → tiroir latéral avec liste de notifications
- **Tâches assignées** : voir titre, description, priorité, échéance
- **Modifier le statut** directement depuis le tiroir (À faire / En cours / Terminée / En retard)
- Recherche dans les notifications, marquer lu/supprimer

### 🎯 Pipeline — Assignation de leads
- Dans le modal de création/édition d'un lead : champ **"Assigner à"**
- Admin voit tous les utilisateurs ; les non-admins voient uniquement eux-mêmes
- Sur assignation → notification automatique via trigger SQL

### ✅ Tâches — Assignation
- Même principe que les leads : champ **"Assigner à"** dans le modal
- Avatar de l'assigné visible sur chaque carte kanban
- Notification créée automatiquement via trigger `notify_task_assigned()`

### 📧 Campagnes email — Corrections
- **Fix ciblage** : les destinataires sont maintenant lus depuis `profiles WHERE role = ?` (avant : table `contacts` → tout le monde recevait)
- **Click tracking** : chaque email contient un lien avec `?webhook=1&event=click&campaignId=...` → le compteur `click_count` s'incrémente en base dès le clic
- **Open tracking** : pixel 1×1 transparent dans chaque email → `open_count` incrémenté

### ⚙️ Master Admin — Hiérarchie
- Email `alim.samira2002@gmail.com` = Master Admin protégé (trigger SQL empêche modification de son rôle)
- Master Admin voit tous les utilisateurs groupés par section (Master / Sous-admins / Utilisateurs)
- Peut activer **"Approuver admins"** pour chaque sous-admin (toggle persisté en DB)
- Sous-admins ne peuvent modifier que les rôles non-admin

---

## 7. Système RBAC — Rôles & Permissions

### Matrice des accès aux modules

| Module | Master Admin | Sous-Admin | Commercial | Standard | Partenaire |
|--------|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ❌ |
| Pipeline | ✅ | ✅ | ✅ | ✅ | ❌ |
| Contacts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Entreprises | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tâches | ✅ | ✅ | ✅ | ✅ | ❌ |
| Paramètres | ✅ | ✅ | ❌ | ❌ | ❌ |

> Les permissions sont configurables par le Master Admin dans Paramètres → Permissions.

### Hiérarchie des droits admin

```
👑 Master Admin (alim.samira2002@gmail.com)
   ├── Voir tous les utilisateurs ✅
   ├── Modifier tous les rôles (sauf le sien) ✅
   ├── Accorder "can_approve_admin" aux sous-admins ✅
   └── Protégé par trigger SQL (rôle inmodifiable) 🔒

📋 Sous-Admin (role='admin', pas master)
   ├── Voir utilisateurs sauf master ✅
   ├── Modifier : commercial / standard / partner uniquement ✅
   ├── Ne peut PAS modifier un autre admin ❌
   └── Approuver demandes admin : seulement si master a accordé la permission
```

---

## 8. Installation locale

```bash
# 1. Cloner le dépôt
git clone https://github.com/Alim-Samira/aaas-crm.git
cd aaas-crm

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# → Remplir avec vos clés Supabase et Brevo

# 4. Lancer en développement
npm run dev
# → http://localhost:3000
```

---

## 9. Configuration Supabase

### Exécuter les patches SQL dans l'ordre

Dans Supabase → SQL Editor, exécuter dans cet ordre :

```
1. patch_v1.7_DEFINITIF.sql         → Schéma de base + RLS
2. patch_ADMIN_DEFINITIF.sql        → Protection master admin
3. patch_CAMPAIGNS_TASKS.sql        → Campagnes + tâches
4. patch_master_admin.sql           → admin_permissions table
5. patch_notifications_and_fixes.sql → Notifications + fix tracking
```

### Fonction RPC requise

```sql
-- Doit exister avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.update_user_role(
  target_user_id UUID, new_role TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Guards: master admin protection, role validation
  UPDATE public.profiles SET role = new_role WHERE id = target_user_id;
END;
$$;
```

---

## 10. Variables d'environnement

Fichier `.env.local` (ne jamais committer) :

```env
# Supabase — obligatoire
NEXT_PUBLIC_SUPABASE_URL=https://hbkamwcuuiscoworqbio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...  # rôle: anon
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...      # rôle: service_role (API routes uniquement)

# Brevo — campagnes email
BREVO_API_KEY=xkeysib-...
BREVO_SENDER_EMAIL=votre@email.com         # doit être vérifié dans Brevo
BREVO_SENDER_NAME=AAAS CRM

# App URL — pour les webhooks tracking
NEXT_PUBLIC_APP_URL=https://aaas-crm.vercel.app
```

---

## 11. Déploiement CI/CD

```bash
# Déploiement automatique à chaque push sur main
git add .
git commit -m "feat: description de la fonctionnalité"
git push origin main
# → Vercel détecte le push, lance next build, déploie en production
# → URL stable : https://aaas-crm.vercel.app
```

> ⚠️ Les URLs en `https://aaas-crm-xxx-aaas.vercel.app` sont des **previews** (branches/PRs).  
> L'URL de production est toujours `https://aaas-crm.vercel.app`.

---

## Auteur

**Alim Samira** — Communication Digitale · MIAGE  
Stack: Next.js 14 · Supabase · Brevo · Tailwind CSS · Vercel · TypeScript

GitHub → [github.com/Alim-Samira](https://github.com/Alim-Samira)  
Email → alim.samira2002@gmail.com  
Portfolio → [alim-samira.github.io/PortFolio](https://alim-samira.github.io/PortFolio/)

---

## 12. Licence

```
© 2026 Alim Samira — Tous droits réservés

Ce projet est une œuvre originale réalisée dans le cadre d'un cursus académique.

INTERDICTIONS — Sans autorisation écrite préalable de l'auteur :
  ✗ Reproduction totale ou partielle du code, des designs ou de la documentation
  ✗ Distribution, publication ou mise en ligne de toute partie de ce projet
  ✗ Utilisation commerciale ou non-commerciale de tout élément de ce projet
  ✗ Modification ou création d'œuvres dérivées

AUTORISATIONS — Avec attribution explicite à l'auteur :
  ✓ Consultation à des fins d'apprentissage personnel (lecture uniquement)
  ✓ Citation courte avec mention obligatoire de la source et de l'auteur

Pour toute demande de permission :
  → alim.samira2002@gmail.com
  → https://github.com/Alim-Samira

Ce projet ne relève PAS de la licence MIT malgré toute mention contraire ailleurs.
L'auteur se réserve le droit de poursuivre toute violation des droits d'auteur.
```