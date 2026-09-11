# 🚚 ZIHAN SUPER DELIVERY EXPRESS — Plateforme SaaS de Gestion Logistique & Dernier Kilomètre

<div align="center">

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 18](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

**Solution technologique complète, réactive et sécurisée dédiée aux opérations de livraison express, dispatching intelligent, gestion des expéditions e-commerce et suivi de tournées en Tunisie.**

[🌐 Découvrir l'Application](#-structure-et-portails-utilisateurs) • [🏗️ Architecture & Stack](#-architecture-technique--stack) • [🔐 Sécurité & RLS](#-sécurité-authentification--rls) • [📦 Fonctionnalités Clés](#-fonctionnalités-majeures) • [🚀 Déploiement](#-installation--démarrage)

</div>

---

## 🏢 À Propos de ZIHAN Super Delivery Express

**ZIHAN SUPER DELIVERY EXPRESS SARL** est une entreprise de transport et logistique de premier plan en Tunisie, spécialisée dans la livraison express B2B/B2C, l'encaissement contre remboursement (Cash On Delivery - COD) et la distribution rapide sur le Grand Tunis et l'ensemble du territoire national.

- **📍 Adresse officielle** : Rue des anémones - Nouvelle Médina, Ben Arous, Tunisie
- **📞 Téléphones** : `+216 27 394 418` / `+216 27 394 137`
- **💬 WhatsApp Support** : `+216 27 394 418`
- **✉️ Email officiel** : `samiayed1965@gmail.com`
- **🌐 Portail Web** : `www.zihan.tn`

---

## 🌟 Points Forts & Valeur Ajoutée du Projet

Cette application web moderne a été conçue selon les standards de développement **SaaS d'entreprise** :

1. **Architecture Modulaire Multi-Rôles** : 3 portails étanches et sur-mesure pour les **Administrateurs**, les **Clients Expéditeurs (Boutiques e-commerce)** et les **Livreurs Chauffeurs**.
2. **Synchronisation Temps Réel (WebSockets Supabase)** : Mises à jour instantanées des statuts de colis, des assignations de livreurs, des compteurs financiers et des notifications push sans rechargement de page.
3. **Moteur de Tarification Personnalisée par Boutique** : Système de tarification forfaitaire négociée imposée par l'administrateur pour chaque client sur toute la Tunisie (avec fallback automatique).
4. **Tournée Mobile Chauffeur Optimisée** : Interface ergonomique pour smartphone avec intégration directe des appels téléphoniques et discussions WhatsApp en 1 clic vers les destinataires.
5. **Génération PDF Instantanée & Traçabilité QR Code** : Édition automatisée de bons de livraison certifiés, factures officielles et manifestes de ramassage avec code-barres et QR Code de suivi public.
6. **Résilience et Tolérance aux Pannes** : Fonctionnement hybride base Supabase Cloud + cache local intelligent permettant la continuité d'activité même en cas de coupure réseau.

---

## 🏛️ Architecture Technique & Stack

```mermaid
graph TD
    A[Client Web / Mobile Responsive] -->|HTTPS / REST & WebSockets| B[React 18 + Vite Frontend]
    B -->|Supabase Client SDK| C[(Supabase Cloud PostgreSQL)]
    B -->|API REST JWT| D[Backend Node.js / Express]
    D -->|Service Role Key| C
    C -->|Realtime CDC| B
    B -->|PDF Generation| E[@react-pdf / html2canvas / jsPDF]
```

### 💻 Frontend
- **Framework & Bundler** : React 18, TypeScript, Vite 6
- **Design System & Styling** : Tailwind CSS v3, Radix UI primitives, shadcn/ui, Lucide Icons
- **Routage & Sécurité** : React Router DOM v6 avec gardes d'accès déclaratifs (`ProtectedRoute`)
- **Gestion d'État & Contexte** : React Context API (`AuthContext`, `ThemeProvider`)
- **Data & Temps Réel** : Client Supabase JS v2 (`postgres_changes` subscriptions)
- **Documents & Export** : `jspdf`, `html2canvas`, `@react-pdf/renderer` pour les bons de livraison et factures

### ⚙️ Backend & API
- **Serveur & Runtime** : Node.js, Express.js, TypeScript
- **Validation des Schémas** : Zod (validation stricte des entrées API)
- **Sécurité HTTP** : Helmet, CORS configuré, limitation de débit (Rate Limiting)
- **Monitoring & Logs** : Morgan, gestion centralisée des exceptions

### 🗄️ Base de Données & Services Cloud
- **SGBD** : PostgreSQL hébergé sur Supabase
- **Authentification** : Supabase Auth (JWT sécurisés, gestion des sessions, réinitialisation mot de passe)
- **Temps Réel** : Supabase Realtime Engine (Change Data Capture)
- **Stockage & RLS** : Politiques de sécurité au niveau des lignes (*Row Level Security*)

---

## 👥 Portails & Expérience Utilisateur

### 1. 🛡️ Portail Administrateur (`/admin`)
* **Tableau de Bord Exécutif** : KPIs d'activité (colis totaux, livrés, en attente, retours, volume financier COD collecté, frais de livraison cumulés) avec filtres temporels (*Aujourd'hui, 7 jours, 30 jours, Tout*).
* **Gestion des Colis & Dispatching** :
  - Liste interactive des expéditions avec statuts en direct.
  - Modal d'**Assignation Immédiate** d'un chauffeur par sélection intelligente.
  - Validation / Refus des demandes de ramassage des clients.
  - Impression groupée des étiquettes et manifestes.
* **Grille Tarifaire Sur-Mesure (`/admin/pricing`)** :
  - Définition d'un tarif unique par boutique/client (ex: 8.000 DT, 10.000 DT, etc.) appliqué à l'échelle nationale.
  - Activation/Désactivation des conventions tarifaires en direct.
* **Gestion des Utilisateurs (`/admin/users`)** :
  - Création, activation, suspension et modification des comptes administrateurs, livreurs et clients.
  - Assignation des zones géographiques et des véhicules aux chauffeurs.
* **Analytiques & Leaderboard (`/admin/analytics`)** :
  - Graphiques d'activité sur 7 jours.
  - Classement en temps réel des meilleurs livreurs par taux de réussite.
  - Répartition par gouvernorat et par typologie de colis.

---

### 2. 📦 Portail Client Expéditeur (`/client`)
* **Tableau de Bord Marchand** : Synthèse des ventes, suivi des fonds collectés (Cash on Delivery) et taux de livraison.
* **Assistant de Création de Colis (Wizard en 5 étapes)** :
  - Calcul dynamique et automatique des frais selon la tarification personnalisée accordée par l'admin.
  - Saisie intuitive du destinataire avec suggestions de gouvernorats tunisiens.
  - Déclaration de la valeur de la marchandise et options de fragilité.
* **Mes Expéditions (`/client/shipments`)** :
  - Suivi détaillé avec timeline visuelle pour chaque colis.
  - Téléchargement et impression instantanée du **Bon de Livraison Officiel ZIHAN** avec QR Code.
* **Facturation & Reversements (`/client/invoices`)** :
  - Récapitulatif des montants encaissés par ZIHAN à reverser au marchand.

---

### 3. 🚚 Portail Livreur / Chauffeur (`/driver`)
* **Dashboard Chauffeur** :
  - Compteur des livraisons du jour, colis restants, colis livrés et total d'argent liquide (espèces) collecté en main propre.
* **Tournée Active en Direct (`/driver/tour`)** :
  - Vue mobile fluide organisée par priorité de livraison.
  - Bouton d'**Appel direct** (`tel:+216...`) et bouton **WhatsApp direct** pré-rempli avec le numéro du colis et le montant à payer.
  - Mise à jour instantanée du statut : *Livré*, *Client Absent*, *Reporté*, *Mauvaise Adresse*, *Refusé/Retour*.
  - Saisie de notes de terrain (ex: "Rappel demandé à 17h", "Changement d'adresse").
* **Historique des Livraisons (`/driver/history`)** :
  - Journal complet des courses effectuées et récapitulatif de clôture de caisse quotidienne.

---

### 4. 🔍 Espace Public de Suivi (`/tracking` & `/`)
* **Suivi Instantané sans Connexion** : Saisie du numéro de tracking (ex: `ZH-2026-XXXX`) pour afficher l'historique complet, le statut actuel, le transporteur et les délais estimés.
* **Landing Page Professionnelle** : Présentation institutionnelle de ZIHAN, simulateur de tarif, coordonnées complètes, carte et formulaires de contact.

---

### 5. 👤 Module Universel "Mon Profil" (`/profile`)
* Accessible par l'ensemble des 3 rôles (**Admin**, **Livreur**, **Client**).
* **Mise à jour en temps réel** dans Supabase PostgreSQL :
  - Modification du nom complet, téléphone de contact.
  - Mise à jour de la zone et du véhicule (Livreurs).
  - Mise à jour de la raison sociale / boutique (Clients).
* **Sécurité du compte** : Changement sécurisé du mot de passe avec indicateur de force.

---

## 🔐 Sécurité, Authentification & RLS

La plateforme intègre les meilleures pratiques de sécurité logicielle :

1. **Row Level Security (RLS) PostgreSQL** :
   - Chaque table (`profiles`, `parcels`, `notifications`) est protégée par des politiques RLS strictes au niveau du moteur SQL.
   - Les clients ne peuvent lire et écrire que leurs propres expéditions.
   - Les livreurs n'accèdent qu'aux colis assignés et validés par l'administration.
   - Les administrateurs disposent des droits d'arbitrage global sans récursion infinie grâce à la fonction `public.get_my_role()`.
2. **Protection CSRF & CORS** : Restreint aux origines autorisées avec en-têtes de sécurité configurés via Helmet.
3. **Mots de Passe & Chiffrement** : Hachage bcrypt / PBKDF2 géré nativement par Supabase Auth, avec transmission chiffrée SSL/TLS.
4. **Validation Zod** : Chaque charge utile reçue côté backend et formulaires frontend est validée pour empêcher toute injection.

---

## 📁 Arborescence du Projet

```text
zihan_sami/
├── backend/                        # Serveur API Node.js / Express
│   ├── src/
│   │   ├── config/                 # Paramètres environnement & Supabase admin
│   │   ├── controllers/            # Contrôleurs métier (colis, utilisateurs, stats)
│   │   ├── middleware/             # Sécurité, validation JWT, gestion d'erreurs
│   │   ├── routes/                 # Définition des endpoints REST (/api/...)
│   │   ├── services/               # Logique d'accès base de données
│   │   ├── types/                  # Schémas TypeScript backend
│   │   ├── validators/             # Schémas de validation Zod
│   │   ├── app.ts                  # Configuration des middlewares Express
│   │   └── server.ts               # Point d'entrée HTTP
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                       # Application Single Page React 18 + Vite
│   ├── public/                     # Favicon, assets statiques
│   ├── src/
│   │   ├── assets/                 # Logos officiels ZIHAN et images
│   │   ├── components/
│   │   │   ├── auth/               # ProtectedRoute & formulaires de login
│   │   │   ├── branding/           # Logos vectoriels & identité visuelle
│   │   │   ├── layout/             # Sidebar rétractable, Topbar, MainLayout
│   │   │   ├── notifications/      # NotificationBell & toasts réactifs
│   │   │   ├── parcels/            # Wizard création colis, modal d'assignation
│   │   │   ├── pdf/                # Templates Bons de livraison & Factures
│   │   │   └── ui/                 # Composants Design System (Button, Modal, Card...)
│   │   ├── contexts/               # AuthContext (sessions, profils, realtime)
│   │   ├── pages/
│   │   │   ├── admin/              # Dashboard, Colis, Utilisateurs, Tarifs, Analytics
│   │   │   ├── client/             # Dashboard, Expéditions, Création, Factures
│   │   │   ├── driver/             # Dashboard, Tournée live, Historique
│   │   │   ├── profile/            # Page Mon Profil universelle
│   │   │   └── public/             # Landing Page & Suivi public
│   │   ├── routes/                 # Configuration des routes (AppRouter, paths)
│   │   ├── services/               # parcelsDb, clientPricingDb, usersDb, supabase
│   │   ├── types/                  # Modèles de données TypeScript
│   │   ├── App.tsx                 # Providers racines
│   │   ├── index.css               # Thèmes CSS et variables graphiques
│   │   └── main.tsx                # Bootstrap React
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── supabase/                       # Scripts SQL & Migrations
│   ├── create_parcels_table.sql    # Schéma table colis & triggers
│   ├── create_notifications_table.sql # Notifications temps réel
│   ├── fix_rls_recursion.sql       # Politiques RLS sans récursion
│   └── seed.sql                    # Données d'initialisation
│
├── package.json                    # Scripts d'orchestration monorepo
└── README.md                       # Documentation technique globale
```

---

## 🚀 Installation & Démarrage

### 1. Prérequis
- **Node.js** v18.0.0 ou supérieur
- **npm** v9.0.0 ou supérieur
- Un compte / projet **Supabase** (PostgreSQL)

### 2. Cloner le projet et installer les dépendances
À la racine du projet :
```bash
npm run install:all
```
*Ou manuellement dans chaque dossier :*
```bash
cd frontend && npm install
cd ../backend && npm install
```

### 3. Variables d'Environnement

Créez un fichier `.env` dans `frontend/` :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_cle_anon_publique
VITE_API_BASE_URL=http://localhost:5000/api
```

Créez un fichier `.env` dans `backend/` :
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_secrete
FRONTEND_URL=http://localhost:5173
```

### 4. Lancer l'application en développement

```bash
# Lancement simultané Frontend + Backend depuis la racine :
npm run dev

# Ou séparément :
npm run dev:frontend    # Accessible sur http://localhost:5173
npm run dev:backend     # Accessible sur http://localhost:5000
```

### 5. Compte Super Admin Officiel

| Rôle | Email | Mot de passe | Accès / Portail |
|---|---|---|---|
| **Super Admin** | `samiayed1965@gmail.com` | `Sami1234` | `/admin` (Supervision globale) |

---

## 🧪 Tests, Linting & Build de Production

Le projet applique une rigueur stricte de typage et de qualité de code (**zéro avertissement ESLint toléré**) :

```bash
# Vérification du code TypeScript et ESLint
npm run lint:all

# Compilation optimisée pour la production
npm run build:all
```

---

## 📄 Licence & Droits

Développé exclusivement pour **ZIHAN SUPER DELIVERY EXPRESS SARL**. Tous droits réservés © 2026.  
Conception technique réalisée avec passion pour digitaliser et accélérer la logistique tunisienne. 🇹🇳
