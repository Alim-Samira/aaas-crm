# AAAS CRM — Documentation Complète

> **Projet académique** · Communication Digitale · Stack: Next.js 14 + Supabase + Brevo + Vercel

---

## Table des matières

1. [Présentation du projet](#1-présentation)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Workflow de vente AAAS](#4-workflow-de-vente-aaas)
5. [Diagrammes UML](#5-diagrammes-uml)
6. [Installation locale](#6-installation-locale)
7. [Configuration Supabase](#7-configuration-supabase)
8. [Déploiement Vercel + GitHub CI/CD](#8-déploiement-vercel--github-cicd)
9. [Gestion des rôles et permissions](#9-gestion-des-rôles-et-permissions)
10. [Variables d'environnement](#10-variables-denvironnement)

---

## 1. Présentation

**AAAS CRM** est une application web SaaS de gestion de la relation client développée dans le cadre d'un projet de formation en Communication Digitale.

### Fonctionnalités principales

| Module | Description |
|--------|-------------|
| 🔐 Authentification | Login / Signup / Rôles (Admin, CEO, Commercial, Partenaire) |
| 🎯 Pipeline | Kanban drag-and-drop — 6 étapes de vente personnalisées |
| 👤 Contacts | CRUD complet, historique des interactions |
| 🏢 Entreprises | Répertoire des entreprises partenaires |
| DONE Tâches | Gestion des tâches avec priorité et statut |
| 📊 Dashboard | KPIs, graphiques de conversion, revenus |
| 📧 Email | Automatisation Brevo (email de bienvenue sur nouveau lead) |
| ⚙️ Paramètres | Admin : gestion des rôles, permissions par module, demandes d'accès |

---

## 2. Stack technique

```
Frontend       Next.js 14 (App Router) + TypeScript
Styling        Tailwind CSS (glassmorphism — backdrop-blur, bg-white/10)
Base de données Supabase (PostgreSQL + Auth + RLS)
Emailing       Brevo API (transactionnel + campagnes)
Hébergement    Vercel (déploiement automatique)
CI/CD          GitHub Actions via Vercel GitHub App
```

---

## 3. Structure du projet

```
aaas-crm/
├── app/
│   ├── layout.tsx                 # Shell global : sidebar + fond glassmorphic
│   ├── page.tsx                   # Redirect → /dashboard
│   ├── dashboard/
│   │   └── page.tsx               # KPIs, graphiques Recharts, lead_stats view
│   ├── pipeline/
│   │   └── page.tsx               # Kanban 6 étapes AAAS (drag-and-drop)
│   ├── contacts/
│   │   └── page.tsx               # CRUD contacts + recherche + filtres
│   ├── companies/
│   │   └── page.tsx               # CRUD entreprises + favicon API
│   ├── tasks/
│   │   └── page.tsx               # Kanban tâches : todo / in_progress / done
│   ├── settings/
│   │   └── page.tsx               # Profil + Admin : users, rôles, permissions
│   └── auth/
│       ├── login/page.tsx         # Connexion
│       └── signup/page.tsx        # Inscription avec sélection de rôle
│
├── api/
│   └── brevo/
│       └── route.ts               # POST → envoie email Brevo sur nouveau lead
│
├── components/
│   ├── LoadingScreen.tsx          # Loader AAAS animé (monogramme + barre)
│   ├── Sidebar.tsx                # Navigation latérale responsive
│   └── ui/
│       └── GlassCard.tsx          # Carte glassmorphique réutilisable
│
├── lib/
│   ├── supabase.ts                # Client Supabase (singleton)
│   ├── brevo.ts                   # Utilitaire envoi email Brevo
│   └── utils.ts                   # formatCurrency, cn(), etc.
│
├── types/
│   └── index.ts                   # Types TypeScript : Profile, Lead, Contact…
│
├── supabase/
│   ├── schema.sql                 # Schéma initial (tables, RLS, triggers)
│   ├── patch_v1.4_fixed.sql       # Patch rôles, access_requests, pipeline_stages
│   └── seed.sql                   # Données de test (optionnel)
│
├── public/
│   └── logo.png
│
├── .env.local                     # Variables d'env (NE PAS committer)
├── .env.example                   # Template des variables
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Workflow de vente AAAS

Le pipeline est configuré avec **6 étapes** correspondant au cycle de vente de l'entreprise :

```
┌─────────────┐   ┌──────────────┐   ┌─────────────┐   ┌─────────────┐   ┌──────────┐   ┌──────────┐
│ Prospection │──▶│ Qualification│──▶│ Proposition │──▶│ Négociation │──▶│  Gagné ✓ │   │ Perdu ✗  │
│   (new)     │   │ (qualified)  │   │ (proposal)  │   │(negotiation)│   │(converted│   │  (lost)  │
└─────────────┘   └──────────────┘   └─────────────┘   └─────────────┘   └──────────┘   └──────────┘
   Cyan/Bleu          Ambre             Violet            Orange           Émeraude          Rouge
```

### Règles métier
- Un lead peut être glissé librement entre toutes les étapes
- Le statut `converted` comptabilise le CA dans les KPIs
- Le statut `lost` retire le lead du pipeline actif
- Les étapes sont configurables par un admin dans `pipeline_stages`

---

## 5. Diagrammes UML

### 5.1 Diagramme de cas d'utilisation

```
                        ┌─────────────────────────────────────────┐
                        │              Système AAAS CRM            │
                        │                                          │
  ┌──────────┐          │  ┌─────────────────────────────────┐    │
  │          │──────────┼─▶│ S'authentifier (login/signup)   │    │
  │  Visiteur│          │  └─────────────────────────────────┘    │
  └──────────┘          │                                          │
                        │  ┌─────────────────────────────────┐    │
  ┌──────────┐          │  │ Gérer les leads (CRUD + kanban) │    │
  │Commercial│──────────┼─▶│ Gérer les contacts              │◀───┤
  └──────────┘          │  │ Gérer les tâches                │    │
        │               │  │ Consulter le dashboard          │    │
        │               │  └─────────────────────────────────┘    │
        │extends        │                                          │
        ▼               │  ┌─────────────────────────────────┐    │
  ┌──────────┐          │  │ Gérer les entreprises           │    │
  │   CEO    │──────────┼─▶│ Voir tous les rapports          │◀───┤
  └──────────┘          │  │ Accès analytics avancés         │    │
        │               │  └─────────────────────────────────┘    │
        │extends        │                                          │
        ▼               │  ┌─────────────────────────────────┐    │
  ┌──────────┐          │  │ Gérer les utilisateurs          │    │
  │  Admin   │──────────┼─▶│ Modifier les rôles              │    │
  └──────────┘          │  │ Approuver les demandes d'accès  │    │
                        │  │ Configurer les permissions      │    │
                        │  │ Gérer le pipeline (étapes)      │    │
                        │  └─────────────────────────────────┘    │
                        └─────────────────────────────────────────┘
```

### 5.2 Diagramme de classes (MCD simplifié)

```
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│    profiles     │        │     contacts     │        │    companies    │
├─────────────────┤        ├──────────────────┤        ├─────────────────┤
│ id: UUID (PK)   │        │ id: UUID (PK)    │        │ id: UUID (PK)   │
│ email: TEXT     │        │ first_name: TEXT │        │ name: TEXT      │
│ full_name: TEXT │        │ last_name: TEXT  │        │ industry: TEXT  │
│ role: TEXT      │        │ email: TEXT      │        │ website: TEXT   │
│ avatar_url: TEXT│        │ phone: TEXT      │        │ created_by: UUID│
│ created_at: TS  │        │ notes: TEXT      │        │ created_at: TS  │
└────────┬────────┘        │ company_id: UUID─┼───────▶└─────────────────┘
         │                 │ created_by: UUID │
         │ 1               │ created_at: TS   │
         │                 └────────┬─────────┘
         │                          │ 1
         │ N                        │ N
         ▼                          ▼
┌─────────────────┐        ┌──────────────────┐        ┌─────────────────┐
│      leads      │        │  interactions    │        │      tasks      │
├─────────────────┤        ├──────────────────┤        ├─────────────────┤
│ id: UUID (PK)   │        │ id: UUID (PK)    │        │ id: UUID (PK)   │
│ title: TEXT     │        │ lead_id: UUID ───┼───────▶│ title: TEXT     │
│ value: NUMERIC  │        │ type: TEXT       │        │ description: TXT│
│ status: TEXT    │        │ description: TXT │        │ status: TEXT    │
│ stage: TEXT ────┼───────▶│ date: DATE       │        │ priority: TEXT  │
│ contact_id: UUID│        │ created_at: TS   │        │ due_date: DATE  │
│ assigned_to:UUID│        └──────────────────┘        │ assigned_to:UUID│
│ created_at: TS  │                                     │ created_by:UUID │
└─────────────────┘        ┌──────────────────┐        │ created_at: TS  │
                           │ pipeline_stages  │        └─────────────────┘
┌──────────────────┐       ├──────────────────┤
│ access_requests  │       │ key: TEXT (PK)   │        ┌─────────────────┐
├──────────────────┤       │ label: TEXT      │        │module_permissions│
│ id: UUID (PK)    │       │ color: TEXT      │        ├─────────────────┤
│ user_id: UUID    │       │ sort_order: INT  │        │ module: TEXT    │
│ email: TEXT      │       │ is_active: BOOL  │        │ role: TEXT      │
│ requested_role   │       └──────────────────┘        │ can_access: BOOL│
│ status: TEXT     │                                    └─────────────────┘
│ justification    │
│ reviewed_by: UUID│
└──────────────────┘
```

### 5.3 Diagramme de séquence — Création d'un lead

```
  Commercial       Frontend          Supabase           Brevo API
      │                │                 │                   │
      │  Fill form      │                 │                   │
      │────────────────▶│                 │                   │
      │                 │ INSERT leads    │                   │
      │                 │────────────────▶│                   │
      │                 │                 │ Check RLS policy  │
      │                 │                 │──────────────────▶│(internal)
      │                 │                 │ Return lead data  │
      │                 │◀────────────────│                   │
      │                 │ POST /api/brevo │                   │
      │                 │────────────────────────────────────▶│
      │                 │                 │                   │ Send welcome
      │                 │                 │                   │ email
      │                 │                 │                   │◀──────────
      │ Lead in Kanban  │                 │                   │
      │◀────────────────│                 │                   │
```

### 5.4 Diagramme de séquence — Approbation d'un rôle

```
  Nouvel utilisateur    Frontend          Supabase          Admin
         │                  │                 │               │
         │  Signup (CEO)     │                 │               │
         │─────────────────▶│                 │               │
         │                  │ auth.signUp()   │               │
         │                  │────────────────▶│               │
         │                  │ INSERT profiles │               │
         │                  │  role='commercial'              │
         │                  │────────────────▶│               │
         │                  │ INSERT access_requests          │
         │                  │  requested_role='ceo'           │
         │                  │────────────────▶│               │
         │ "Demande envoyée" │                 │               │
         │◀─────────────────│                 │               │
         │                  │                 │  Badge ⚠️(1)  │
         │                  │                 │──────────────▶│
         │                  │                 │               │ Click Approuver
         │                  │                 │◀──────────────│
         │                  │ rpc('update_user_role')        │
         │                  │────────────────▶│               │
         │                  │ UPDATE profiles │               │
         │                  │  role='ceo'     │               │
         │                  │────────────────▶│               │
         │  Rôle CEO actif  │                 │               │
         │◀─────────────────│                 │               │
```

---

## 6. Installation locale

```bash
# 1. Cloner le repo
git clone https://github.com/VOTRE_USERNAME/aaas-crm.git
cd aaas-crm

# 2. Installer les dépendances
npm install

# 3. Copier les variables d'environnement
cp .env.example .env.local
# Remplir NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, BREVO_API_KEY

# 4. Lancer en développement
npm run dev
# → http://localhost:3000
```

---

## 7. Configuration Supabase

### Étape 1 — Créer le projet Supabase
1. Aller sur [supabase.com](https://supabase.com) → New project
2. Choisir une région proche (eu-west-1 recommandé)
3. Copier `Project URL` et `anon public key` dans `.env.local`

### Étape 2 — Exécuter les migrations SQL
Dans **Supabase → SQL Editor** :

```sql
-- 1. Schema initial
-- Copier-coller le contenu de supabase/schema.sql

-- 2. Patch rôles + pipeline
-- Copier-coller le contenu de supabase/patch_v1.4_fixed.sql
```

### Étape 3 — Configurer l'authentification
- Supabase Dashboard → Authentication → URL Configuration
- **Site URL** : `https://votre-app.vercel.app`
- **Redirect URLs** : `https://votre-app.vercel.app/auth/callback`

### Étape 4 — Vérifier votre rôle admin
```sql
-- Vérifier que votre compte est bien admin
SELECT id, email, role FROM profiles WHERE email = 'votre@email.com';
-- Doit retourner role = 'admin'
```

---

## 8. Déploiement Vercel + GitHub CI/CD

### Étape 1 — Préparer le repository GitHub

```bash
# Dans votre projet local
git init
git add .
git commit -m "Initial commit — AAAS CRM"

# Créer un repo sur github.com, puis :
git remote add origin https://github.com/Alim-Samira/aaas-crm.git
git branch -M main
git push -u origin main
```

### Étape 2 — Connecter Vercel à GitHub

1. Aller sur [vercel.com](https://vercel.com) → **New Project**
2. Cliquer **Import Git Repository** → Sélectionner `aaas-crm`
3. Framework Preset : **Next.js** (détecté automatiquement)
4. Cliquer **Deploy** (premier déploiement sans variables = erreur attendue)

### Étape 3 — Ajouter les variables d'environnement dans Vercel

Dans **Vercel → Project → Settings → Environment Variables** :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Production, Preview, Development |
| `BREVO_API_KEY` | `xkeysib-...` | Production, Preview |
| `NEXTAUTH_SECRET` | Chaîne aléatoire 32 chars | Production |

### Étape 4 — Redéployer

```bash
# Soit depuis Vercel Dashboard → Deployments → Redeploy
# Soit en faisant un commit :
git commit --allow-empty -m "trigger redeploy"
git push
```

### Étape 5 — CI/CD automatique (déjà actif !)

Une fois Vercel connecté à GitHub, **chaque `git push` sur `main`** déclenche automatiquement :

```
git push origin main
        │
        ▼
  GitHub webhook
        │
        ▼
  Vercel Build
  ┌─────────────┐
  │ npm install │
  │ npm build   │
  │ Next.js opt │
  └─────────────┘
        │
        ▼
  Deploy to production
  https://aaas-crm.vercel.app
```

### Étape 6 — Preview deployments (branches)

```bash
# Créer une branche feature
git checkout -b feature/nouvelle-fonctionnalite
git push origin feature/nouvelle-fonctionnalite
# → Vercel crée automatiquement un URL de preview unique
# → Tester avant de merger dans main
```

### Structure des branches recommandée

```
main          → Production (aaas-crm.vercel.app)
├── develop   → Staging (dev préview Vercel)
│   ├── feature/pipeline-custom
│   ├── feature/email-templates
│   └── fix/role-management
```

---

## 9. Gestion des rôles et permissions

### Matrice des accès

| Module | Admin | CEO | Commercial | Partenaire |
|--------|:-----:|:---:|:----------:|:----------:|
| Dashboard | DONE | DONE | DONE | ❌ |
| Pipeline | DONE | DONE | DONE | ❌ |
| Contacts | DONE | DONE | DONE | DONE |
| Entreprises | DONE | DONE | DONE | DONE |
| Tâches | DONE | DONE | DONE | ❌ |
| Paramètres | DONE | ❌ | ❌ | ❌ |

### Processus d'inscription pour rôles élevés

```
Utilisateur choisit CEO ou Admin
          │
          ▼
  Compte créé avec role='commercial' (accès limité)
          │
          ▼
  access_request créée (status='pending')
          │
          ▼
  Admin voit badge ⚠️ dans l'onglet "Demandes d'accès"
          │
        ┌─┴──────────┐
        ▼             ▼
   Approuver        Refuser
        │             │
        ▼             ▼
  rpc('update_user_role')  request.status = 'rejected'
  → role = 'ceo' / 'admin'
```

---

## 10. Variables d'environnement

Créer un fichier `.env.local` à la racine :

```env
# Supabase (obligatoire)
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Brevo (pour l'emailing automatique)
BREVO_API_KEY=xkeysib-...

# Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=une-chaine-aleatoire-de-32-caracteres-minimum
```

> ⚠️ Ne jamais committer `.env.local`. Vérifier que `.gitignore` contient `.env.local`.

---

## Screenshots attendus

```
/screenshots
├── 01-login.png              # Page de connexion glassmorphique
├── 02-signup-role.png        # Sélection du rôle à l'inscription
├── 03-dashboard.png          # Dashboard avec KPIs et graphiques
├── 04-pipeline-kanban.png    # Pipeline 6 étapes AAAS
├── 05-contacts.png           # Liste des contacts avec recherche
├── 06-companies.png          # Répertoire entreprises avec avatars
├── 07-tasks.png              # Kanban des tâches
├── 08-settings-profile.png   # Profil utilisateur
├── 09-settings-requests.png  # Demandes d'accès (admin)
├── 10-settings-users.png     # Gestion des utilisateurs (admin)
└── 11-settings-perms.png     # Matrice des permissions (admin)
```

---

## Auteur

**Alim Samira** — Communication Digitale  
Stack: Next.js 14 · Supabase · Brevo · Tailwind CSS · Vercel

---

*Projet réalisé dans le cadre du cours de développement web full-stack — Architecture SaaS Cloud*

## 📄 License

This project is created for educational purposes and is protected by copyright.
No part of this publication may be reproduced, distributed, or used without prior permission from the original author. 
For permission requests, please contact the author.

GitHub: https://github.com/Alim-Samira
Mail: alim.samira2002@gmail.com

MIT — Remember to follow the above licensing terms.