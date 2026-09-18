import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DollarSign,
  PlusCircle,
  Search,
  Edit2,
  Building2,
  CheckCircle2,
  Tag,
  Shield,
  Save,
  RotateCcw,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import {
  getDbClientPricing,
  saveClientPricingRule,
  deleteClientPricingRule,
} from '@/services/clientPricingDb';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import type { ClientPricingRule, UserProfile } from '@/types';

export const ClientPricingManagementPage: React.FC = () => {
  const [rules, setRules] = useState<ClientPricingRule[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingRule, setEditingRule] = useState<ClientPricingRule | null>(null);
  const [formClientId, setFormClientId] = useState<string>('');
  const [formClientName, setFormClientName] = useState<string>('');
  const [formCompanyName, setFormCompanyName] = useState<string>('');
  const [formFlatRate, setFormFlatRate] = useState<number>(8.0);
  const [formCustomNote, setFormCustomNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);

    // 1. Load rules from Supabase (with cache fallback)
    const { rules: dbRules } = await getDbClientPricing();
    setRules(dbRules);

    // 2. Load clients from profiles
    const { isConfigured } = getActiveSupabaseConfig();
    const client = getSupabaseClient();
    if (isConfigured) {
      try {
        const { data } = await client
          .from('profiles')
          .select('*')
          .eq('role', 'client')
          .order('full_name');
        if (data && data.length > 0) {
          setClients(data as UserProfile[]);
        }
      } catch {
        // fallback
      }
    }

    setIsLoading(false);
  }, []);

  // Realtime subscription & initial load
  useEffect(() => {
    loadData();

    const config = getActiveSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      const channel = client
        .channel('realtime:public:client_pricing_rules')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'client_pricing_rules' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newR: ClientPricingRule = {
                id: payload.new.id,
                client_id: payload.new.client_id || undefined,
                client_name: payload.new.client_name || '',
                company_name: payload.new.company_name || payload.new.client_name || '',
                flat_rate: Number(payload.new.flat_rate) || 8.0,
                custom_note: payload.new.custom_note || '',
                is_active: payload.new.is_active !== false,
                updated_at: payload.new.updated_at || payload.new.created_at || new Date().toISOString(),
              };
              setRules((prev) => [newR, ...prev.filter((r) => r.id !== newR.id)]);
              showToast(`⚡ Nouveau tarif pour "${newR.client_name}" synchronisé en direct !`);
            } else if (payload.eventType === 'UPDATE') {
              const updatedR: ClientPricingRule = {
                id: payload.new.id,
                client_id: payload.new.client_id || undefined,
                client_name: payload.new.client_name || '',
                company_name: payload.new.company_name || payload.new.client_name || '',
                flat_rate: Number(payload.new.flat_rate) || 8.0,
                custom_note: payload.new.custom_note || '',
                is_active: payload.new.is_active !== false,
                updated_at: payload.new.updated_at || payload.new.created_at || new Date().toISOString(),
              };
              setRules((prev) =>
                prev.map((r) => (r.id === updatedR.id ? updatedR : r))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setRules((prev) => prev.filter((r) => r.id !== deletedId));
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setEditingRule(null);
    setFormClientId('');
    setFormClientName('');
    setFormCompanyName('');
    setFormFlatRate(8.0);
    setFormCustomNote('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rule: ClientPricingRule) => {
    setEditingRule(rule);
    setFormClientId(rule.client_id || '');
    setFormClientName(rule.client_name);
    setFormCompanyName(rule.company_name);
    setFormFlatRate(rule.flat_rate);
    setFormCustomNote(rule.custom_note || '');
    setIsModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientName.trim()) {
      alert('Veuillez saisir le nom du client ou de la boutique.');
      return;
    }

    setIsSubmitting(true);

    const { rule: saved, error } = await saveClientPricingRule({
      id: editingRule?.id,
      client_id: formClientId || undefined,
      client_name: formClientName.trim(),
      company_name: formCompanyName.trim() || formClientName.trim(),
      flat_rate: Number(formFlatRate),
      custom_note: formCustomNote.trim(),
      is_active: true,
    });

    // Update state immediately
    setRules((prev) => {
      const existing = prev.findIndex((r) => r.id === saved.id || r.client_name.toLowerCase() === saved.client_name.toLowerCase());
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = saved;
        return next;
      }
      return [saved, ...prev];
    });

    setIsSubmitting(false);
    setIsModalOpen(false);

    if (error) {
      showToast(`⚠️ Tarif enregistré localement (${error}).`);
    } else {
      showToast(`✅ Tarif enregistré dans Supabase pour "${saved.client_name}" → ${saved.flat_rate.toFixed(3)} DT (toute Tunisie)`);
    }
  };

  const handleDeleteRule = async (rule: ClientPricingRule) => {
    if (window.confirm(`Réinitialiser la tarification de "${rule.client_name}" au tarif standard (8.000 DT) ?`)) {
      await deleteClientPricingRule(rule.id);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      showToast(`Tarif standard rétabli pour ${rule.client_name}`);
    }
  };

  const filteredRules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return rules.filter(
      (r) =>
        !q ||
        r.client_name.toLowerCase().includes(q) ||
        r.company_name.toLowerCase().includes(q) ||
        r.custom_note?.toLowerCase().includes(q)
    );
  }, [rules, searchQuery]);

  // Statistics
  const customCount = rules.filter((r) => r.flat_rate !== 8.0).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-[#1B3D87] text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-semibold animate-in slide-in-from-top-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Tarification Personnalisée par Client
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {rules.length} Règles (Live DB)
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Configurez et synchronisez en temps réel sur Supabase les tarifs négociés pour chaque client expéditeur.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>

          <Button
            onClick={handleOpenCreateModal}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
          >
            + Définir un Tarif Client
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-[#1B3D87]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Tarif Par Défaut ZIHAN</p>
              <p className="text-xl font-black text-[#1B3D87] mt-0.5">8.000 DT</p>
              <p className="text-[10px] text-muted-foreground">Tarif unique — toute la Tunisie</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-[#1B3D87]">
              <Tag className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-purple-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Tarifs Négociés Actifs</p>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-0.5">{customCount} clients</p>
              <p className="text-[10px] text-muted-foreground">Accords commerciaux spécifiques</p>
            </div>
            <div className="p-2.5 bg-purple-50 dark:bg-purple-950/60 rounded-xl text-purple-700 dark:text-purple-300">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Synchronisation Supabase</p>
              <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> Temps Réel Multi-Appareils
              </p>
              <p className="text-[10px] text-muted-foreground">Visible instantanément sur tous les comptes</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <Shield className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        {/* Search */}
        <div className="p-4 bg-card border-b border-border/60">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par client, boutique, convention..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="p-3 px-4">Client / Expéditeur</th>
                  <th className="p-3">Raison Sociale</th>
                  <th className="p-3">Tarif Unique (toute Tunisie)</th>
                  <th className="p-3">Remarques & Convention</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {isLoading ? 'Chargement des tarifs depuis Supabase...' : 'Aucune règle tarifaire trouvée.'}
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#F7F9FC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 px-4 font-bold text-foreground flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-[#1B3D87] shrink-0" />
                        <span>{rule.client_name}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {rule.company_name}
                      </td>
                      <td className="p-3">
                        <span className="font-mono font-black text-lg text-[#1B3D87] dark:text-blue-400">
                          {rule.flat_rate.toFixed(3)} DT
                        </span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {rule.custom_note || <span className="italic text-[11px]">—</span>}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(rule)}
                            leftIcon={<Edit2 className="h-3 w-3" />}
                            className="h-7 text-xs font-bold text-[#1B3D87] border-blue-200 bg-blue-50/50 hover:bg-blue-100"
                          >
                            Modifier
                          </Button>
                          <button
                            onClick={() => handleDeleteRule(rule)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 rounded"
                            title="Supprimer ce tarif"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? `Modifier le Tarif de ${editingRule.client_name}` : 'Définir un Tarif Client Négocié'}
        description="Ce tarif sera automatiquement enregistré dans Supabase et appliqué lors de la création de tout colis pour ce client."
      >
        <form onSubmit={handleSaveRule} className="space-y-4 py-2">
          {/* Client Selection / Name */}
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">
              Nom du Client / Boutique *
            </label>
            {clients.length > 0 && !editingRule ? (
              <div className="space-y-2">
                <select
                  value={formClientId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setFormClientId(selId);
                    const selected = clients.find((c) => c.id === selId);
                    if (selected) {
                      setFormClientName(selected.company_name || selected.full_name);
                      setFormCompanyName(selected.company_name || selected.full_name);
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-semibold"
                >
                  <option value="">-- Sélectionner un compte client existant --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name ? `${c.company_name} (${c.full_name})` : c.full_name} {c.phone ? `- ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground">Ou saisissez manuellement le nom ci-dessous :</p>
                <Input
                  placeholder="Ex: Boutique Express Mode"
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  required
                />
              </div>
            ) : (
              <Input
                placeholder="Ex: Boutique Express Mode"
                value={formClientName}
                onChange={(e) => setFormClientName(e.target.value)}
                required
              />
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">
              Raison Sociale (Optionnel)
            </label>
            <Input
              placeholder="Ex: Boutique Express Mode SARL"
              value={formCompanyName}
              onChange={(e) => setFormCompanyName(e.target.value)}
            />
          </div>

          {/* Pricing Field */}
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900">
            <label className="text-xs font-black text-[#1B3D87] dark:text-blue-300 mb-1 block">
              Tarif de Livraison (DT) — Toute la Tunisie *
            </label>
            <Input
              type="number"
              step="0.5"
              min="1"
              value={formFlatRate}
              onChange={(e) => setFormFlatRate(parseFloat(e.target.value) || 0)}
              required
              className="font-mono font-bold text-[#1B3D87] text-base"
            />
            <span className="text-[10px] text-muted-foreground">Tarif unique appliqué sur tous les colis de ce client, quelle que soit la destination. Défaut ZIHAN : 8.000 DT</span>
          </div>

          {/* Custom Note */}
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">
              Remarque / Motif de négociation
            </label>
            <Input
              placeholder="Ex: Accord spécial volume, articles fragiles..."
              value={formCustomNote}
              onChange={(e) => setFormCustomNote(e.target.value)}
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Save className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              Enregistrer dans Supabase
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
