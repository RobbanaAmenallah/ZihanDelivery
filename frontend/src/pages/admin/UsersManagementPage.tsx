import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserPlus,
  Users,
  Truck,
  Package,
  Search,
  RefreshCw,
  Mail,
  Phone,
  MapPin,
  Building2,
  Car,
  Shield,
  AlertCircle,
  Edit2,
  Trash2,
  Eye,
  Download,
  Lock,
  UserCheck,
  UserX,
  Sparkles,
  Database,
  Radio,
  CheckCircle,
  Settings,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Select } from '@/components/ui/select';
import { StatCard } from '@/components/ui/stat-card';
import { type UserProfile, type UserRole, type CreateUserPayload, type UpdateUserPayload } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import {
  getDbUsers,
  createDbUser,
  updateDbUser,
  deleteDbUser,
  type DbStatus,
} from '@/services/usersDb';
import {
  getActiveSupabaseConfig,
  saveSupabaseConfig,
  getSupabaseClient,
} from '@/services/supabase';

const TUNISIAN_ZONES = [
  'Grand Tunis — Ben Arous / Nouvelle Médina',
  'Grand Tunis — Tunis Ville',
  'Grand Tunis — Ariana / Ennasr',
  'Grand Tunis — Manouba',
  'Nabeul / Hammamet',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Le Kef',
  'Siliana',
  'Sousse / Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Médenine / Djerba',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kébili',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const RoleBadge: React.FC<{ role: UserRole; isActive: boolean }> = ({ role, isActive }) => {
  const colors: Record<UserRole, string> = {
    admin: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
    driver: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
    client: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
  };
  const labels: Record<UserRole, string> = {
    admin: '🛡️ Administrateur',
    driver: '🚚 Livreur',
    client: '📦 Client',
  };
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${colors[role] ?? ''}`}>
        {labels[role] ?? role}
      </span>
      {!isActive && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200">
          Inactif
        </span>
      )}
    </div>
  );
};

// ─── Main CRUD Component ──────────────────────────────────────────────────────

export const UsersManagementPage: React.FC = () => {
  const { session } = useAuth();

  // State
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'all' | 'drivers' | 'clients' | 'admins'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Database Connection Status State
  const [dbStatus, setDbStatus] = useState<DbStatus>(() => {
    const config = getActiveSupabaseConfig();
    return {
      isConnected: config.isConfigured,
      isRealtimeActive: false,
      provider: config.isConfigured ? 'supabase' : 'local_fallback',
      lastSync: null,
      totalRows: 0,
      supabaseUrl: config.url,
      errorMessage: null,
    };
  });

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Supabase Config Form State
  const [configUrl, setConfigUrl] = useState<string>(() => getActiveSupabaseConfig().url);
  const [configKey, setConfigKey] = useState<string>(() => getActiveSupabaseConfig().key);

  // Toast State
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Forms state
  const [createForm, setCreateForm] = useState<CreateUserPayload>({
    email: '',
    password: 'Password123!',
    full_name: '',
    phone: '',
    role: 'driver',
    company_name: '',
    zone: TUNISIAN_ZONES[0],
    vehicle: '',
  });

  const [editForm, setEditForm] = useState<UpdateUserPayload>({
    full_name: '',
    phone: '',
    company_name: '',
    zone: '',
    vehicle: '',
    is_active: true,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Show Toast Helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── 1. Fetch Users from Database & Sync ─────────────────────────────────────
  const loadUsersFromDb = useCallback(async () => {
    setIsLoading(true);
    const { users: fetchedUsers, source, error } = await getDbUsers();
    setUsers(fetchedUsers);
    setIsLoading(false);

    const config = getActiveSupabaseConfig();
    setDbStatus((prev) => ({
      ...prev,
      isConnected: config.isConfigured && !error,
      provider: source === 'supabase' ? 'supabase' : 'local_fallback',
      lastSync: new Date(),
      totalRows: fetchedUsers.length,
      errorMessage: error,
      supabaseUrl: config.url,
    }));
  }, []);

  // ── 2. Realtime PostgreSQL Subscription ─────────────────────────────────────
  useEffect(() => {
    loadUsersFromDb();

    const config = getActiveSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      const channel = client
        .channel('realtime:public:profiles')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          (payload) => {
            console.log('[Supabase Realtime] Changement DB détecté:', payload);

            if (payload.eventType === 'INSERT') {
              const newRow = payload.new as UserProfile;
              setUsers((prev) => {
                if (prev.some((u) => u.id === newRow.id)) return prev;
                return [newRow, ...prev];
              });
              showToast(`⚡ Base Supabase : Nouvel utilisateur "${newRow.full_name}" synchronisé en direct.`);
            } else if (payload.eventType === 'UPDATE') {
              const updatedRow = payload.new as UserProfile;
              setUsers((prev) =>
                prev.map((u) => (u.id === updatedRow.id ? { ...u, ...updatedRow } : u))
              );
              showToast(`⚡ Base Supabase : Profil "${updatedRow.full_name}" actualisé en direct.`);
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setUsers((prev) => prev.filter((u) => u.id !== deletedId));
              showToast(`⚡ Base Supabase : Utilisateur supprimé en direct.`);
            }

            setDbStatus((prev) => ({ ...prev, lastSync: new Date() }));
          }
        )
        .subscribe((status) => {
          setDbStatus((prev) => ({
            ...prev,
            isRealtimeActive: status === 'SUBSCRIBED',
          }));
        });

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [loadUsersFromDb]);

  // ── SAVE Supabase Configuration ─────────────────────────────────────────────
  const handleSaveDbConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!configUrl.trim() || !configKey.trim()) {
      setFormError('L\'URL Supabase et la clé ANON sont obligatoires.');
      return;
    }

    saveSupabaseConfig(configUrl, configKey);
    setIsConfigModalOpen(false);
    showToast('🔗 Configuration Supabase enregistrée ! Reconnexion en cours…');
    loadUsersFromDb();
  };

  // ── CREATE User Handler (Direct DB + Auth) ──────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createForm.email || !createForm.password || !createForm.full_name || !createForm.phone) {
      setFormError('Veuillez remplir tous les champs obligatoires (*)');
      return;
    }

    setIsSubmitting(true);

    const { user: createdUser, error: dbError } = await createDbUser(
      createForm,
      session?.access_token
    );

    setIsSubmitting(false);

    if (dbError) {
      setFormError(dbError);
      return;
    }

    // Add to state immediately
    setUsers((prev) => [createdUser, ...prev.filter((u) => u.id !== createdUser.id)]);
    setIsCreateModalOpen(false);
    showToast(`✅ Utilisateur "${createdUser.full_name}" enregistré dans la base de données !`);

    // Reset Form
    setCreateForm({
      email: '',
      password: 'Password123!',
      full_name: '',
      phone: '',
      role: 'driver',
      company_name: '',
      zone: TUNISIAN_ZONES[0],
      vehicle: '',
    });

    setDbStatus((prev) => ({ ...prev, lastSync: new Date(), totalRows: prev.totalRows + 1 }));
  };

  // ── OPEN Edit Modal ─────────────────────────────────────────────────────────
  const handleOpenEdit = (user: UserProfile) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name,
      phone: user.phone,
      company_name: user.company_name,
      zone: user.zone,
      vehicle: user.vehicle,
      is_active: user.is_active,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // ── UPDATE User Handler ─────────────────────────────────────────────────────
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);

    if (!editForm.full_name || !editForm.phone) {
      setFormError('Le nom et le téléphone sont requis.');
      return;
    }

    setIsSubmitting(true);

    const { error } = await updateDbUser(selectedUser.id, editForm, session?.access_token);

    setIsSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    // Update in local state
    setUsers((prev) =>
      prev.map((u) =>
        u.id === selectedUser.id
          ? {
              ...u,
              ...editForm,
              full_name: editForm.full_name || u.full_name,
              phone: editForm.phone || u.phone,
            }
          : u
      )
    );

    setIsEditModalOpen(false);
    showToast(`✅ Profil "${editForm.full_name}" modifié avec succès dans la base de données !`);
    setDbStatus((prev) => ({ ...prev, lastSync: new Date() }));
  };

  // ── DELETE User Handler ─────────────────────────────────────────────────────
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    const { error } = await deleteDbUser(selectedUser.id, session?.access_token);

    setIsSubmitting(false);

    if (error) {
      showToast(`❌ ${error}`);
      return;
    }

    // Remove from state
    setUsers((prev) => prev.filter((u) => u.id !== selectedUser.id));
    setIsDeleteModalOpen(false);
    showToast(`🗑️ Utilisateur "${selectedUser.full_name}" supprimé de la base.`);
    setDbStatus((prev) => ({ ...prev, lastSync: new Date(), totalRows: Math.max(0, prev.totalRows - 1) }));
  };

  // ── TOGGLE Active Status ────────────────────────────────────────────────────
  const handleToggleActive = async (user: UserProfile) => {
    const updatedStatus = !user.is_active;

    await updateDbUser(user.id, { is_active: updatedStatus }, session?.access_token);

    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: updatedStatus } : u))
    );

    showToast(
      updatedStatus
        ? `✅ Compte de ${user.full_name} réactivé en base.`
        : `⚠️ Compte de ${user.full_name} suspendu en base.`
    );
    setDbStatus((prev) => ({ ...prev, lastSync: new Date() }));
  };

  // ── EXPORT CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = ['Nom Complet', 'Email', 'Téléphone', 'Rôle', 'Zone', 'Véhicule / Entreprise', 'Statut'];
    const rows = filteredUsers.map((u) => [
      `"${u.full_name}"`,
      `"${u.email ?? ''}"`,
      `"${u.phone}"`,
      `"${u.role}"`,
      `"${u.zone || ''}"`,
      `"${u.vehicle || u.company_name || ''}"`,
      `"${u.is_active ? 'Actif' : 'Inactif'}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `utilisateurs_zihan_db_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('📥 Fichier CSV exporté avec succès depuis la base de données.');
  };

  // ── FILTERED USERS COMPUTATION ──────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      // Tab filter
      if (activeTab === 'drivers' && u.role !== 'driver') return false;
      if (activeTab === 'clients' && u.role !== 'client') return false;
      if (activeTab === 'admins' && u.role !== 'admin') return false;

      // Status filter
      if (statusFilter === 'active' && !u.is_active) return false;
      if (statusFilter === 'inactive' && u.is_active) return false;

      // Search query
      if (q) {
        const matchName = u.full_name.toLowerCase().includes(q);
        const matchEmail = (u.email ?? '').toLowerCase().includes(q);
        const matchPhone = u.phone.includes(q);
        const matchZone = (u.zone ?? '').toLowerCase().includes(q);
        const matchCompany = (u.company_name ?? '').toLowerCase().includes(q);
        return matchName || matchEmail || matchPhone || matchZone || matchCompany;
      }
      return true;
    });
  }, [users, activeTab, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: users.length,
      drivers: users.filter((u) => u.role === 'driver').length,
      clients: users.filter((u) => u.role === 'client').length,
      admins: users.filter((u) => u.role === 'admin').length,
      active: users.filter((u) => u.is_active).length,
    };
  }, [users]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 dark:bg-purple-950/40 px-3 py-0.5 text-xs font-bold text-purple-800 dark:text-purple-300 mb-1">
            <Shield className="h-3.5 w-3.5" />
            <span>Gestion des Accès & Base de Données</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
            Gestion & Synchronisation des Utilisateurs
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Affichage et gestion en direct synchronisés avec la table Supabase (<code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">public.profiles</code>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsConfigModalOpen(true);
            }}
            leftIcon={<Settings className="h-4 w-4" />}
          >
            Connecter Supabase
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Exporter CSV
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsersFromDb()}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Synchroniser DB
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setFormError(null);
              setIsCreateModalOpen(true);
            }}
            leftIcon={<UserPlus className="h-4 w-4" />}
          >
            Nouvel Utilisateur
          </Button>
        </div>
      </div>

      {/* ── Live Database Sync Status Bar ──────────────────────────────────── */}
      <div
        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl border text-xs shadow-xs transition-all ${
          dbStatus.provider === 'supabase' && !dbStatus.errorMessage
            ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/80 dark:bg-emerald-950/30'
            : 'border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/30'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-3 w-3">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                dbStatus.provider === 'supabase' && !dbStatus.errorMessage ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span
              className={`relative inline-flex h-3 w-3 rounded-full ${
                dbStatus.provider === 'supabase' && !dbStatus.errorMessage ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <Database
              className={`h-4 w-4 ${
                dbStatus.provider === 'supabase' && !dbStatus.errorMessage ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
              }`}
            />
            <span
              className={`font-black ${
                dbStatus.provider === 'supabase' && !dbStatus.errorMessage
                  ? 'text-emerald-900 dark:text-emerald-200'
                  : 'text-amber-900 dark:text-amber-200'
              }`}
            >
              {dbStatus.provider === 'supabase' && !dbStatus.errorMessage
                ? `Base de Données Supabase : Connectée en Direct`
                : `Base Supabase non connectée (Mode Cache Local)`}
            </span>
            <span className="hidden md:inline-block text-muted-foreground">•</span>
            <span className="font-mono text-[11px] text-foreground">
              Table <span className="font-bold">public.profiles</span> ({stats.total} profils)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-semibold flex-wrap">
          {dbStatus.provider === 'supabase' && (
            <span className="flex items-center gap-1 text-emerald-800 dark:text-emerald-300">
              <Radio className="h-3 w-3 text-emerald-600 animate-pulse" />
              <span>Temps Réel Actif</span>
            </span>
          )}
          {dbStatus.provider !== 'supabase' && (
            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="text-amber-800 dark:text-amber-300 underline font-bold hover:text-amber-950 flex items-center gap-1"
            >
              <LinkIcon className="h-3 w-3" />
              <span>Entrer vos clés Supabase</span>
            </button>
          )}
          {dbStatus.lastSync && (
            <span className="text-muted-foreground">
              Sync : {dbStatus.lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* Error notification if DB query had an issue */}
      {dbStatus.errorMessage && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div className="space-y-1">
            <p className="font-bold">{dbStatus.errorMessage}</p>
            <p className="text-[11px] text-amber-800 dark:text-amber-300">
              Assurez-vous d'avoir exécuté le script SQL dans votre SQL Editor Supabase et d'avoir configuré vos clés de projet.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <StatCard
          title="Total en Base"
          value={stats.total.toString()}
          icon={<Users className="h-5 w-5" />}
          iconBgColor="bg-[#EEF3F9] dark:bg-slate-800"
          iconColor="text-[#1B3D87] dark:text-blue-400"
        />
        <StatCard
          title="Livreurs Actifs"
          value={stats.drivers.toString()}
          icon={<Truck className="h-5 w-5" />}
          iconBgColor="bg-sky-50 dark:bg-sky-950/40"
          iconColor="text-sky-600 dark:text-sky-400"
        />
        <StatCard
          title="Clients Inscrits"
          value={stats.clients.toString()}
          icon={<Package className="h-5 w-5" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/40"
          iconColor="text-emerald-600 dark:text-emerald-400"
        />
        <StatCard
          title="Comptes Autorisés"
          value={`${stats.active} / ${stats.total}`}
          icon={<UserCheck className="h-5 w-5" />}
          iconBgColor="bg-purple-50 dark:bg-purple-950/40"
          iconColor="text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* ── Filters & Controls Bar ─────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-3 rounded-2xl border border-border shadow-xs">
        {/* Tabs switcher */}
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'all' as const, label: 'Tous', count: stats.total, icon: Users },
            { id: 'drivers' as const, label: 'Livreurs', count: stats.drivers, icon: Truck },
            { id: 'clients' as const, label: 'Clients', count: stats.clients, icon: Package },
            { id: 'admins' as const, label: 'Admins', count: stats.admins, icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#1B3D87] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-[#EEF3F9] dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-[#EEF3F9] dark:bg-slate-800 text-[#1B3D87] dark:text-blue-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Status select */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Nom, email, téléphone, zone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B3D87]/40"
            />
          </div>

          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="h-9 text-xs w-32"
            options={[
              { value: 'all', label: 'Tous états' },
              { value: 'active', label: 'Actifs' },
              { value: 'inactive', label: 'Inactifs' },
            ]}
          />
        </div>
      </div>

      {/* ── Table Card ─────────────────────────────────────────────────────── */}
      <Card className="border-border shadow-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-black flex items-center gap-2">
                <span>
                  {activeTab === 'drivers'
                    ? '🚚 Liste des Chauffeurs & Livreurs ZIHAN'
                    : activeTab === 'clients'
                    ? '📦 Liste des Boutiques & Expéditeurs Clients'
                    : activeTab === 'admins'
                    ? '🛡️ Liste des Administrateurs & Superviseurs'
                    : '📋 Répertoire Global des Utilisateurs'}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Supabase Cloud live
                </span>
              </CardTitle>
              <CardDescription>
                {filteredUsers.length} profil{filteredUsers.length > 1 ? 's' : ''} chargé{filteredUsers.length > 1 ? 's' : ''} depuis la base de données
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <Users className="h-7 w-7 opacity-40" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">Aucun profil correspondant en base</p>
                <p className="text-xs text-muted-foreground">
                  Modifiez vos critères de recherche ou ajoutez un nouveau compte.
                </p>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsCreateModalOpen(true)}
                leftIcon={<UserPlus className="h-4 w-4" />}
              >
                Créer un compte
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border text-[10px] font-black uppercase text-[#667085] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Utilisateur / Identité</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-3">Rôle & Statut</th>
                    <th className="py-3 px-3">Secteur / Informations</th>
                    <th className="py-3 px-4 text-right">Actions Directes DB</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => {
                    const initials = u.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase();

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-[#F7F9FC] dark:hover:bg-slate-800/50 transition-colors ${
                          !u.is_active ? 'opacity-60 bg-muted/10' : ''
                        }`}
                      >
                        {/* Identité */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-black text-xs text-white shadow-xs ${
                                u.role === 'admin'
                                  ? 'bg-[#1B3D87]'
                                  : u.role === 'driver'
                                  ? 'bg-sky-600'
                                  : 'bg-emerald-600'
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="space-y-0.5">
                              <p
                                className="font-bold text-foreground hover:underline cursor-pointer flex items-center gap-1.5"
                                onClick={() => { setSelectedUser(u); setIsDetailModalOpen(true); }}
                              >
                                <span>{u.full_name}</span>
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {u.email ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-3">
                          <p className="font-bold text-foreground">{u.phone}</p>
                        </td>

                        {/* Rôle & Statut */}
                        <td className="py-3 px-3">
                          <RoleBadge role={u.role} isActive={u.is_active} />
                        </td>

                        {/* Détails spécifiques */}
                        <td className="py-3 px-3 text-muted-foreground">
                          {u.role === 'driver' && (
                            <div className="space-y-0.5">
                              {u.zone && (
                                <p className="flex items-center gap-1 text-[11px] text-[#1B3D87] dark:text-blue-400 font-semibold truncate max-w-xs">
                                  <MapPin className="h-3 w-3 text-[#EA4E52] shrink-0" />
                                  <span>{u.zone}</span>
                                </p>
                              )}
                              {u.vehicle && (
                                <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-xs">
                                  <Car className="h-3 w-3 shrink-0" />
                                  <span>{u.vehicle}</span>
                                </p>
                              )}
                            </div>
                          )}

                          {u.role === 'client' && (
                            <div className="space-y-0.5">
                              {u.company_name && (
                                <p className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                                  <Building2 className="h-3 w-3 text-[#1B3D87] shrink-0" />
                                  <span>{u.company_name}</span>
                                </p>
                              )}
                              {u.zone && <p className="text-[10px] text-muted-foreground">{u.zone}</p>}
                            </div>
                          )}

                          {u.role === 'admin' && (
                            <p className="text-[11px] font-bold text-purple-700 dark:text-purple-400">
                              HQ Direction & Dispatch
                            </p>
                          )}
                        </td>

                        {/* Actions CRUD complètes */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Voir fiche */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 text-muted-foreground hover:text-[#1B3D87]"
                              title="Voir fiche complète"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDetailModalOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            {/* Modifier (Update) */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                              title="Modifier dans la base"
                              onClick={() => handleOpenEdit(u)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            {/* Activer / Suspendre */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className={`h-8 w-8 ${
                                u.is_active
                                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'
                              }`}
                              title={u.is_active ? 'Suspendre dans la base' : 'Activer dans la base'}
                              onClick={() => handleToggleActive(u)}
                            >
                              {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>

                            {/* Supprimer (Delete) */}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-8 w-8 text-muted-foreground hover:text-[#EA4E52] hover:bg-rose-50"
                              title="Supprimer définitivement de la base"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── MODAL: SUPABASE CONFIGURATION ───────────────────────────────────── */}
      <Modal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-[#1B3D87]" />
            <span>Connexion à votre Projet Supabase Cloud</span>
          </div>
        }
        description="Renseignez l'URL et la clé ANON publique de votre projet Supabase pour synchroniser la base PostgreSQL en direct."
      >
        <form onSubmit={handleSaveDbConfig} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-[#EA4E52]/40 bg-[#FEECEC] p-3 text-xs text-[#EA4E52]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          <Input
            label="Project URL Supabase *"
            placeholder="https://votre-projet.supabase.co"
            value={configUrl}
            onChange={(e) => setConfigUrl(e.target.value)}
            leftIcon={<LinkIcon className="h-4 w-4" />}
          />

          <Input
            label="API Key (Anon / Public) *"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={configKey}
            onChange={(e) => setConfigKey(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
          />

          <div className="rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground space-y-1">
            <p className="font-bold text-foreground">💡 Où trouver ces clés ?</p>
            <p>
              Sur <strong>supabase.com</strong> &gt; Votre Projet &gt; <strong>Project Settings</strong> (⚙️) &gt; <strong>API</strong> &gt; Copiez <em>Project URL</em> et la clé <em>anon public</em>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="default" size="sm" leftIcon={<CheckCircle className="h-4 w-4" />}>
              Enregistrer & Synchroniser
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 1: CREATE USER (C) ────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#1B3D87]" />
            <span>Ajouter un Nouvel Utilisateur (Supabase)</span>
          </div>
        }
        description="Enregistrement direct dans la table public.profiles et le service d'authentification."
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-[#EA4E52]/40 bg-[#FEECEC] p-3 text-xs text-[#EA4E52]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          {/* Role selector buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Rôle & Accès *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'driver' as const, label: '🚚 Livreur', desc: 'Tournées & App mobile' },
                { id: 'client' as const, label: '📦 Client', desc: 'Expéditeur & Bons' },
                { id: 'admin' as const, label: '🛡️ Admin', desc: 'Supervision & Dispatch' },
              ].map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setCreateForm((prev) => ({ ...prev, role: r.id }))}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    createForm.role === r.id
                      ? 'border-[#1B3D87] bg-[#EEF3F9] dark:bg-blue-950/50 text-[#1B3D87] dark:text-blue-300 font-bold ring-2 ring-[#1B3D87]/20'
                      : 'border-border bg-card text-muted-foreground hover:border-[#1B3D87]/50'
                  }`}
                >
                  <p className="text-xs font-black">{r.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{r.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nom & Prénom *"
              placeholder="Ex: Mohamed Trabelsi"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              leftIcon={<Users className="h-4 w-4" />}
            />

            <Input
              label="Numéro de Téléphone *"
              placeholder="Ex: +216 22 123 456"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4" />}
            />
          </div>

          <Input
            label="Adresse Email de Connexion *"
            type="email"
            placeholder="Ex: mohamed.t@zihan.tn"
            value={createForm.email}
            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
            leftIcon={<Mail className="h-4 w-4" />}
          />

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Mot de passe provisoire *"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                leftIcon={<Lock className="h-4 w-4" />}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 shrink-0 text-xs font-bold"
              onClick={() => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
                const pwd = Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
                setCreateForm((prev) => ({ ...prev, password: pwd }));
              }}
            >
              Générer
            </Button>
          </div>

          {/* Rôle spécifique */}
          {createForm.role === 'driver' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Select
                label="Zone d'intervention principale *"
                value={createForm.zone}
                onChange={(e) => setCreateForm({ ...createForm, zone: e.target.value })}
                options={TUNISIAN_ZONES.map((z) => ({ value: z, label: z }))}
              />
              <Input
                label="Véhicule (Marque, modèle, matricule)"
                placeholder="Ex: Citroën Berlingo (194 TUN 8840)"
                value={createForm.vehicle ?? ''}
                onChange={(e) => setCreateForm({ ...createForm, vehicle: e.target.value })}
                leftIcon={<Car className="h-4 w-4" />}
              />
            </div>
          )}

          {createForm.role === 'client' && (
            <div className="space-y-3 pt-2 border-t border-border">
              <Input
                label="Raison Sociale / Nom Boutique *"
                placeholder="Ex: Boutique Mode Express"
                value={createForm.company_name ?? ''}
                onChange={(e) => setCreateForm({ ...createForm, company_name: e.target.value })}
                leftIcon={<Building2 className="h-4 w-4" />}
              />
              <Select
                label="Gouvernorat de Prise en Charge"
                value={createForm.zone}
                onChange={(e) => setCreateForm({ ...createForm, zone: e.target.value })}
                options={TUNISIAN_ZONES.map((z) => ({ value: z, label: z }))}
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<UserPlus className="h-4 w-4" />}
            >
              Enregistrer en Base
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: EDIT USER (U) ──────────────────────────────────────────── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-blue-600" />
            <span>Modifier le profil : {selectedUser?.full_name}</span>
          </div>
        }
        description="Mise à jour directe de l'enregistrement Supabase."
      >
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-[#EA4E52]/40 bg-[#FEECEC] p-3 text-xs text-[#EA4E52]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Nom & Prénom *"
              value={editForm.full_name ?? ''}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              leftIcon={<Users className="h-4 w-4" />}
            />

            <Input
              label="Téléphone *"
              value={editForm.phone ?? ''}
              onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              leftIcon={<Phone className="h-4 w-4" />}
            />
          </div>

          {selectedUser?.role === 'driver' && (
            <>
              <Select
                label="Zone d'intervention"
                value={editForm.zone ?? ''}
                onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                options={TUNISIAN_ZONES.map((z) => ({ value: z, label: z }))}
              />
              <Input
                label="Véhicule de tournée"
                value={editForm.vehicle ?? ''}
                onChange={(e) => setEditForm({ ...editForm, vehicle: e.target.value })}
                leftIcon={<Car className="h-4 w-4" />}
              />
            </>
          )}

          {selectedUser?.role === 'client' && (
            <Input
              label="Raison Sociale / Boutique"
              value={editForm.company_name ?? ''}
              onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
              leftIcon={<Building2 className="h-4 w-4" />}
            />
          )}

          {/* Toggle Actif */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="font-bold text-xs text-foreground">Autorisation de connexion</p>
              <p className="text-[10px] text-muted-foreground">
                {editForm.is_active ? 'Compte actif et autorisé' : 'Compte suspendu'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="h-5 w-5 rounded text-[#1B3D87] focus:ring-[#1B3D87] cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="default" size="sm" isLoading={isSubmitting}>
              Enregistrer en Base
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 3: VIEW USER DETAILS (R) ──────────────────────────────────── */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-[#1B3D87]" />
            <span>Fiche Utilisateur Supabase</span>
          </div>
        }
      >
        {selectedUser && (
          <div className="space-y-5 py-2">
            {/* User Header */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#EEF3F9] dark:bg-slate-800 border border-[#DCE3EC] dark:border-slate-700">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1B3D87] text-white font-black text-xl shadow-sm">
                {selectedUser.full_name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-base text-foreground">{selectedUser.full_name}</h3>
                <p className="text-xs text-muted-foreground font-mono">{selectedUser.email}</p>
                <RoleBadge role={selectedUser.role} isActive={selectedUser.is_active} />
              </div>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">ID Unique (UUID)</span>
                <p className="font-mono text-[10px] text-muted-foreground truncate">{selectedUser.id}</p>
              </div>

              <div className="p-3 rounded-xl border border-border space-y-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Téléphone</span>
                <p className="font-bold text-foreground">{selectedUser.phone || 'Non renseigné'}</p>
              </div>

              <div className="p-3 rounded-xl border border-border space-y-1 col-span-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Date d'Enregistrement</span>
                <p className="font-bold text-foreground">
                  {new Date(selectedUser.created_at).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {selectedUser.role === 'driver' && (
                <>
                  <div className="p-3 rounded-xl border border-border space-y-1 col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Zone de Tournée</span>
                    <p className="font-bold text-[#1B3D87] dark:text-blue-400">{selectedUser.zone || 'Non assignée'}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-border space-y-1 col-span-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Véhicule Assigné</span>
                    <p className="font-bold text-foreground">{selectedUser.vehicle || 'Non renseigné'}</p>
                  </div>
                </>
              )}

              {selectedUser.role === 'client' && (
                <div className="p-3 rounded-xl border border-border space-y-1 col-span-2">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Boutique / Entreprise</span>
                  <p className="font-bold text-foreground">{selectedUser.company_name || 'Particulier'}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                <CheckCircle className="h-4 w-4" />
                <span>Synchronisé en base</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEdit(selectedUser);
                  }}
                  leftIcon={<Edit2 className="h-4 w-4" />}
                >
                  Modifier
                </Button>
                <Button variant="default" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Fermer
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── MODAL 4: DELETE CONFIRMATION (D) ─────────────────────────────────── */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        size="sm"
        title="Suppression de la Base de Données"
      >
        <div className="space-y-4 py-2 text-center">
          <div className="h-14 w-14 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 mx-auto flex items-center justify-center">
            <Trash2 className="h-7 w-7" />
          </div>

          <div className="space-y-1">
            <p className="font-black text-base text-foreground">
              Supprimer "{selectedUser?.full_name}" de la base ?
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              La ligne correspondante dans la table <code className="font-mono text-rose-600 font-bold">profiles</code> et le compte d'authentification seront supprimés définitivement.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="accent"
              size="sm"
              isLoading={isSubmitting}
              onClick={handleDeleteUser}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Oui, Supprimer
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Toast Notification Banner ───────────────────────────────────────── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl bg-[#162033] text-white text-xs font-bold px-5 py-3 shadow-2xl animate-in slide-in-from-bottom-4 duration-200 border border-white/10 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
};
