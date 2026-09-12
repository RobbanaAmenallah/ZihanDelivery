import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  PlusCircle,
  Search,
  RefreshCw,
  FileText,
  Truck,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  Trash2,
  UserCog,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import {
  type Parcel,
  type CreateParcelPayload,
  type ParcelStatus,
  type UserProfile,
} from '@/types';
import {
  getDbParcels,
  createDbParcel,
  updateDbParcel,
  deleteDbParcel,
  calculateDeliveryFee,
  parcelToDeliveryNoteData,
  ALL_TUNISIAN_GOVERNORATES,
  GRAND_TUNIS_GOVERNORATES,
} from '@/services/parcelsDb';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';

export const ParcelsManagementPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [governorateFilter, setGovernorateFilter] = useState<string>('all');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Drivers
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [isLoadingDrivers, setIsLoadingDrivers] = useState<boolean>(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [selectedParcelForDoc, setSelectedParcelForDoc] = useState<DeliveryNoteData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [parcelToAssign, setParcelToAssign] = useState<Parcel | null>(null);
  const [selectedDriverName, setSelectedDriverName] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState<boolean>(false);

  // Form state for new parcel creation
  const [createForm, setCreateForm] = useState<CreateParcelPayload>({
    sender_name: '',
    sender_phone: '',
    sender_address: '',
    recipient_name: '',
    recipient_phone: '',
    recipient_secondary_phone: '',
    recipient_governorate: 'Ben Arous',
    recipient_delegation: 'Nouvelle Médina',
    recipient_address: '',
    recipient_postal_code: '2063',
    description: 'Article Mode & Habillement',
    quantity: 1,
    weight: 1.0,
    is_fragile: false,
    goods_amount: 50.0,
    notes: '',
    driver_name: '',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // ── Load Drivers from Supabase or Demo fallback ─────────────────────────────
  const loadDrivers = useCallback(async () => {
    setIsLoadingDrivers(true);
    const client = getSupabaseClient();
    const config = getActiveSupabaseConfig();

    if (config.isConfigured) {
      try {
        const { data } = await client
          .from('profiles')
          .select('*')
          .eq('role', 'driver')
          .eq('is_active', true)
          .order('full_name');

        if (data && data.length > 0) {
          setDrivers(data as UserProfile[]);
          setIsLoadingDrivers(false);
          return;
        }
      } catch {
        // fall through to demo
      }
    }

    // Demo fallback
    setDrivers([
      { id: 'demo-d1', full_name: 'Karim Mansouri', phone: '+216 55 100 200', role: 'driver', zone: 'Grand Tunis — Ben Arous', vehicle: 'Citroën Berlingo (194 TUN 8840)', company_name: '', is_active: true, created_at: '', created_by: null, email: 'livreur@zihan.tn' },
      { id: 'demo-d2', full_name: 'Sami Ben Ali', phone: '+216 55 300 400', role: 'driver', zone: 'Grand Tunis — Ariana', vehicle: 'Renault Kangoo (312 TUN 1122)', company_name: '', is_active: true, created_at: '', created_by: null, email: 'livreur2@zihan.tn' },
      { id: 'demo-d3', full_name: 'Ahmed Trabelsi', phone: '+216 55 500 600', role: 'driver', zone: 'Sousse / Monastir', vehicle: 'Peugeot Partner (504 SOU 5533)', company_name: '', is_active: true, created_at: '', created_by: null, email: 'livreur3@zihan.tn' },
    ]);
    setIsLoadingDrivers(false);
  }, []);

  // ── Open Assignment Modal ──────────────────────────────────────────────────
  const handleOpenAssignModal = async (parcel: Parcel) => {
    setParcelToAssign(parcel);
    setSelectedDriverName(parcel.driver_name || '');
    setIsAssignModalOpen(true);
    await loadDrivers();
  };

  // ── Confirm Assignment: Accept + Assign driver ─────────────────────────────
  const handleConfirmAssign = async () => {
    if (!parcelToAssign) return;
    setIsAssigning(true);

    await updateDbParcel(parcelToAssign.id, {
      driver_name: selectedDriverName || undefined,
      status: selectedDriverName ? 'assigned' : 'accepted',
    });

    setParcels((prev) =>
      prev.map((p) =>
        p.id === parcelToAssign.id
          ? { ...p, driver_name: selectedDriverName, status: selectedDriverName ? 'assigned' : 'accepted' }
          : p
      )
    );

    setIsAssigning(false);
    setIsAssignModalOpen(false);
    setParcelToAssign(null);

    showToast(
      selectedDriverName
        ? `✅ Colis ${parcelToAssign.tracking_number} assigné à ${selectedDriverName} !`
        : `✅ Colis ${parcelToAssign.tracking_number} accepté (sans livreur pour l'instant).`
    );
  };

  // ── 1. Fetch Parcels from DB ────────────────────────────────────────────────
  const loadParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: fetched } = await getDbParcels();
    setParcels(fetched);
    setIsLoading(false);
  }, []);

  // ── 2. Realtime Subscription ────────────────────────────────────────────────
  useEffect(() => {
    loadParcels();

    const config = getActiveSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      const channel = client
        .channel('realtime:public:parcels')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'parcels' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newP = payload.new as Parcel;
              setParcels((prev) => [newP, ...prev.filter((p) => p.id !== newP.id)]);
              showToast(`📦 Nouveau colis ${newP.tracking_number} synchronisé !`);
            } else if (payload.eventType === 'UPDATE') {
              const updatedP = payload.new as Parcel;
              setParcels((prev) =>
                prev.map((p) => (p.id === updatedP.id ? { ...p, ...updatedP } : p))
              );
            } else if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id;
              setParcels((prev) => prev.filter((p) => p.id !== deletedId));
            }
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    }
  }, [loadParcels]);

  // ── 3. Calculated Pricing for Create Form ────────────────────────────────────
  const formDeliveryFee = calculateDeliveryFee(createForm.recipient_governorate, createForm.sender_name);
  const formTotalAmount = Number(createForm.goods_amount || 0) + formDeliveryFee;
  const isGrandTunis = GRAND_TUNIS_GOVERNORATES.includes(createForm.recipient_governorate);

  // ── 4. Create Parcel Handler ────────────────────────────────────────────────
  const handleCreateParcel = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!createForm.recipient_name || !createForm.recipient_phone || !createForm.recipient_address) {
      setFormError('Veuillez remplir tous les champs obligatoires du destinataire (*)');
      return;
    }

    setIsSubmitting(true);
    const { parcel: created, error } = await createDbParcel(createForm);
    setIsSubmitting(false);

    if (error) {
      setFormError(error);
      return;
    }

    setParcels((prev) => [created, ...prev.filter((p) => p.id !== created.id)]);
    setIsCreateModalOpen(false);
    showToast(`✅ Colis ${created.tracking_number} enregistré avec succès !`);

    // Reset Form
    setCreateForm({
      sender_name: '',
      sender_phone: '',
      sender_address: '',
      recipient_name: '',
      recipient_phone: '',
      recipient_secondary_phone: '',
      recipient_governorate: 'Ben Arous',
      recipient_delegation: '',
      recipient_address: '',
      recipient_postal_code: '',
      description: 'Article Mode & Habillement',
      quantity: 1,
      weight: 1.0,
      is_fragile: false,
      goods_amount: 50.0,
      notes: '',
      driver_name: '',
    });

    // Propose immediate preview
    setSelectedParcelForDoc(parcelToDeliveryNoteData(created));
    setIsDocModalOpen(true);
  };

  // ── 5. Status Quick Change ──────────────────────────────────────────────────
  const handleStatusChange = async (parcelId: string, newStatus: ParcelStatus) => {
    await updateDbParcel(parcelId, { status: newStatus });
    setParcels((prev) =>
      prev.map((p) => (p.id === parcelId ? { ...p, status: newStatus } : p))
    );
    showToast(`Statut mis à jour : ${newStatus}`);
  };

  // ── 6. Delete Parcel ────────────────────────────────────────────────────────
  const handleDeleteParcel = async (parcelId: string, trackingNumber: string) => {
    if (window.confirm(`Supprimer définitivement le colis ${trackingNumber} ?`)) {
      await deleteDbParcel(parcelId);
      setParcels((prev) => prev.filter((p) => p.id !== parcelId));
      showToast(`Colis ${trackingNumber} supprimé.`);
    }
  };

  // ── 7. Open Document Preview ────────────────────────────────────────────────
  const handleOpenDeliveryNote = (parcel: Parcel) => {
    const docData = parcelToDeliveryNoteData(parcel);
    setSelectedParcelForDoc(docData);
    setIsDocModalOpen(true);
  };

  // ── 8. Filtered Parcels ─────────────────────────────────────────────────────
  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        p.tracking_number.toLowerCase().includes(query) ||
        p.recipient_name.toLowerCase().includes(query) ||
        p.recipient_phone.includes(query) ||
        p.recipient_address.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && p.status === 'pending') ||
        (statusFilter === 'in_transit' && ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)) ||
        (statusFilter === 'delivered' && p.status === 'delivered') ||
        (statusFilter === 'issues' && ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused'].includes(p.status));

      const matchesGov =
        governorateFilter === 'all' ||
        p.recipient_governorate.toLowerCase() === governorateFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesGov;
    });
  }, [parcels, searchQuery, statusFilter, governorateFilter]);

  // Stats Calculations
  const stats = useMemo(() => {
    const total = parcels.length;
    const pending = parcels.filter((p) => p.status === 'pending').length;
    const inTransit = parcels.filter((p) =>
      ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)
    ).length;
    const delivered = parcels.filter((p) => p.status === 'delivered').length;
    const totalCollected = parcels
      .filter((p) => p.status === 'delivered')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    return { total, pending, inTransit, delivered, totalCollected };
  }, [parcels]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Banner */}
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
              Gestion des Colis &amp; Expéditions
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              {parcels.length} Colis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Suivi centralisé, impression de bons de commande A4 et dispatching en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadParcels}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
          >
            + Nouveau Colis / Bon
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-[#1B3D87] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Colis</p>
              <p className="text-2xl font-black text-[#162033] dark:text-white">{stats.total}</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-[#1B3D87]">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">En Acheminement</p>
              <p className="text-2xl font-black text-amber-600">{stats.inTransit}</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Livrés avec Succès</p>
              <p className="text-2xl font-black text-emerald-600">{stats.delivered}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#EA4E52] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Encaissé (COD)</p>
              <p className="text-2xl font-black text-[#162033] dark:text-white">
                {stats.totalCollected.toFixed(3)} <span className="text-xs font-bold text-muted-foreground">DT</span>
              </p>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 rounded-xl text-[#EA4E52]">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3.5 rounded-xl border border-border/80 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° Suivi (ZH...), Destinataire, Tél, Adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background h-9 text-sm"
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'all' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'pending' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setStatusFilter('in_transit')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'in_transit' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'delivered' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Livrés
            </button>
            <button
              onClick={() => setStatusFilter('issues')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                statusFilter === 'issues' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Alertes
            </button>
          </div>

          {/* Governorate Dropdown */}
          <select
            value={governorateFilter}
            onChange={(e) => setGovernorateFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-[#1B3D87]"
          >
            <option value="all">📍 Tous Gouvernorats</option>
            <optgroup label="Grand Tunis">
              {GRAND_TUNIS_GOVERNORATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </optgroup>
            <optgroup label="Hors Grand Tunis">
              {ALL_TUNISIAN_GOVERNORATES.filter((g) => !GRAND_TUNIS_GOVERNORATES.includes(g)).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Parcels Table */}
      <Card className="overflow-hidden shadow-sm border-border/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-muted/40 border-b border-border/80 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="py-3 px-4">N° Suivi</th>
                <th className="py-3 px-4">Destinataire &amp; Adresse</th>
                <th className="py-3 px-4">Contenu Colis</th>
                <th className="py-3 px-4">Tarification (DT)</th>
                <th className="py-3 px-4">Livreur Assigné</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Bon &amp; Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredParcels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Package className="h-10 w-10 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm font-semibold">Aucun colis trouvé</p>
                    <p className="text-xs">Créez votre premier colis avec le bouton ci-dessus.</p>
                  </td>
                </tr>
              ) : (
                filteredParcels.map((parcel) => {
                  const isGT = GRAND_TUNIS_GOVERNORATES.includes(parcel.recipient_governorate);

                  return (
                    <tr
                      key={parcel.id}
                      className={`hover:bg-muted/30 transition-colors group ${
                        parcel.status === 'pending' ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''
                      }`}
                    >
                      {/* Tracking # */}
                      <td className="py-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                        <div className="flex items-center gap-1.5">
                          <span>{parcel.tracking_number}</span>
                          {parcel.is_fragile && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.2 rounded font-sans font-bold">
                              Fragile
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-sans text-muted-foreground font-normal">
                          {new Date(parcel.created_at).toLocaleDateString('fr-FR')}
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#162033] dark:text-white">
                          {parcel.recipient_name}
                        </div>
                        <div className="text-muted-foreground font-mono text-[11px]">
                          {parcel.recipient_phone}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <span
                            className={`font-semibold ${
                              isGT ? 'text-blue-700 dark:text-blue-300' : 'text-purple-700 dark:text-purple-300'
                            }`}
                          >
                            {parcel.recipient_governorate}
                          </span>
                          {parcel.recipient_delegation && ` • ${parcel.recipient_delegation}`}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-[180px] truncate">
                        <div className="font-semibold text-foreground truncate">
                          {parcel.description}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Qté: {parcel.quantity} • {parcel.weight} kg
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#162033] dark:text-white">
                          {parcel.total_amount.toFixed(3)} DT
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Art: {parcel.goods_amount.toFixed(2)} + Port: {parcel.delivery_fee.toFixed(2)} DT
                        </div>
                      </td>

                      {/* Driver Assignment */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {parcel.driver_name ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground text-xs">
                              <Truck className="h-3.5 w-3.5 text-[#1B3D87] shrink-0" />
                              {parcel.driver_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Non assigné</span>
                          )}
                          <div>
                            <button
                              onClick={() => handleOpenAssignModal(parcel)}
                              className="flex items-center gap-1 text-[10px] font-bold text-[#1B3D87] hover:text-[#1D5AA5] bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors"
                              title="Accepter et assigner un livreur"
                            >
                              <UserCog className="h-3 w-3" />
                              {parcel.status === 'pending' ? 'Accepter & Assigner' : 'Changer livreur'}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <select
                          value={parcel.status}
                          onChange={(e) => handleStatusChange(parcel.id, e.target.value as ParcelStatus)}
                          className="bg-transparent text-xs font-semibold cursor-pointer border-0 p-0 focus:ring-0"
                        >
                          <option value="pending">🟡 En attente</option>
                          <option value="accepted">🔵 Accepté Hub</option>
                          <option value="assigned">🚀 Assigné livreur</option>
                          <option value="in_transit">🚚 En cours de livraison</option>
                          <option value="delivered">🟢 Livré avec succès</option>
                          <option value="customer_absent">🟠 Client absent</option>
                          <option value="wrong_address">🔴 Adresse incorrecte</option>
                          <option value="refused">⛔ Refusé</option>
                          <option value="returned">↩️ Retourné</option>
                        </select>
                        <div className="mt-1">
                          <StatusBadge status={parcel.status} size="sm" />
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDeliveryNote(parcel)}
                            leftIcon={<FileText className="h-3.5 w-3.5 text-[#1B3D87]" />}
                            className="bg-blue-50/50 hover:bg-blue-100/70 border-blue-200 text-[#1B3D87] font-bold text-xs h-7 px-2.5"
                          >
                            Bon (PDF)
                          </Button>

                          <button
                            onClick={() => handleDeleteParcel(parcel.id, parcel.tracking_number)}
                            className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors"
                            title="Supprimer le colis"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── ASSIGN DRIVER MODAL ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => { setIsAssignModalOpen(false); setParcelToAssign(null); }}
        title={
          <div className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[#1B3D87]" />
            <span>Accepter &amp; Assigner un Livreur</span>
          </div>
        }
        description={
          parcelToAssign
            ? `Colis ${parcelToAssign.tracking_number} → ${parcelToAssign.recipient_name} (${parcelToAssign.recipient_governorate})`
            : ''
        }
      >
        <div className="space-y-4 py-2">
          {/* Parcel Info Summary */}
          {parcelToAssign && (
            <div className="bg-[#F7F9FC] dark:bg-slate-800 p-3 rounded-lg border border-border/60 text-xs space-y-1">
              <p className="font-bold text-[#162033] dark:text-white text-sm">{parcelToAssign.recipient_name}</p>
              <p className="text-muted-foreground">📍 {parcelToAssign.recipient_address}, {parcelToAssign.recipient_delegation} — {parcelToAssign.recipient_governorate}</p>
              <p className="text-muted-foreground">📦 {parcelToAssign.description} | 💰 {parcelToAssign.total_amount.toFixed(3)} DT à encaisser</p>
            </div>
          )}

          {/* Driver Selection */}
          <div>
            <label className="text-xs font-black text-[#1B3D87] uppercase tracking-wide mb-2 block">
              Choisir un Livreur
            </label>

            {isLoadingDrivers ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Chargement des livreurs...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {/* No driver option */}
                <button
                  onClick={() => setSelectedDriverName('')}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                    selectedDriverName === ''
                      ? 'border-[#1B3D87] bg-blue-50 dark:bg-blue-950/30'
                      : 'border-border hover:border-[#1B3D87]/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedDriverName === '' ? 'border-[#1B3D87]' : 'border-muted-foreground'}`}>
                      {selectedDriverName === '' && <div className="h-1.5 w-1.5 rounded-full bg-[#1B3D87]" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Accepter sans livreur</p>
                      <p className="text-[11px] text-muted-foreground">Le colis sera marqué "Accepté" en attente d'assignation</p>
                    </div>
                  </div>
                </button>

                {/* Driver cards */}
                {drivers.map((driver) => (
                  <button
                    key={driver.id}
                    onClick={() => setSelectedDriverName(driver.full_name)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                      selectedDriverName === driver.full_name
                        ? 'border-[#1B3D87] bg-blue-50 dark:bg-blue-950/30'
                        : 'border-border hover:border-[#1B3D87]/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-3.5 w-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedDriverName === driver.full_name ? 'border-[#1B3D87]' : 'border-muted-foreground'}`}>
                        {selectedDriverName === driver.full_name && <div className="h-1.5 w-1.5 rounded-full bg-[#1B3D87]" />}
                      </div>
                      <div className="h-8 w-8 rounded-full bg-[#1B3D87] text-white flex items-center justify-center font-black text-sm shrink-0">
                        {driver.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground text-sm">{driver.full_name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">📍 {driver.zone || 'Zone non définie'}</p>
                        {driver.vehicle && (
                          <p className="text-[11px] text-muted-foreground truncate">🚚 {driver.vehicle}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[11px] font-mono text-muted-foreground">{driver.phone}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setIsAssignModalOpen(false); setParcelToAssign(null); }}
            >
              Annuler
            </Button>
            <Button
              variant="default"
              size="sm"
              isLoading={isAssigning}
              onClick={handleConfirmAssign}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              {selectedDriverName ? `✅ Confirmer : ${selectedDriverName}` : '✅ Accepter sans livreur'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── CREATE PARCEL MODAL ──────────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="lg"
        title={
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-[#1B3D87]" />
            <span>Nouveau Colis &amp; Bon de Commande ZIHAN</span>
          </div>
        }
        description="Calcul instantané du tarif (Grand Tunis 7 DT / Hors Grand Tunis 10 DT) et génération du Bon officiel."
      >
        <form onSubmit={handleCreateParcel} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Section Expéditeur */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/60">
            <p className="text-xs font-black uppercase tracking-wider text-[#1B3D87] mb-2">
              1. Expéditeur (Client ZIHAN)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                label="Nom de la Boutique / Expéditeur *"
                value={createForm.sender_name}
                onChange={(e) => setCreateForm({ ...createForm, sender_name: e.target.value })}
                required
              />
              <Input
                label="Téléphone Expéditeur *"
                value={createForm.sender_phone}
                onChange={(e) => setCreateForm({ ...createForm, sender_phone: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Section Destinataire */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/60">
            <p className="text-xs font-black uppercase tracking-wider text-[#1B3D87] mb-2">
              2. Destinataire
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
              <Input
                label="Nom &amp; Prénom Destinataire *"
                placeholder="Ex: Mohamed Ben Ali"
                value={createForm.recipient_name}
                onChange={(e) => setCreateForm({ ...createForm, recipient_name: e.target.value })}
                required
              />
              <Input
                label="Téléphone Principal *"
                placeholder="+216 22 000 000"
                value={createForm.recipient_phone}
                onChange={(e) => setCreateForm({ ...createForm, recipient_phone: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Gouvernorat *</label>
                <select
                  value={createForm.recipient_governorate}
                  onChange={(e) => setCreateForm({ ...createForm, recipient_governorate: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-semibold"
                >
                  <optgroup label="Grand Tunis">
                    {GRAND_TUNIS_GOVERNORATES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Hors Grand Tunis">
                    {ALL_TUNISIAN_GOVERNORATES.filter((g) => !GRAND_TUNIS_GOVERNORATES.includes(g)).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <Input
                label="Ville / Délégation"
                placeholder="Ex: Nouvelle Médina"
                value={createForm.recipient_delegation || ''}
                onChange={(e) => setCreateForm({ ...createForm, recipient_delegation: e.target.value })}
              />

              <Input
                label="Code Postal"
                placeholder="Ex: 2063"
                value={createForm.recipient_postal_code || ''}
                onChange={(e) => setCreateForm({ ...createForm, recipient_postal_code: e.target.value })}
              />
            </div>

            <Input
              label="Adresse de Livraison Exacte *"
              placeholder="Ex: Résidence Ennasr, Bloc B, Apt 14, Rue..."
              value={createForm.recipient_address}
              onChange={(e) => setCreateForm({ ...createForm, recipient_address: e.target.value })}
              required
            />
          </div>

          {/* Section Colis & Tarification */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-border/60">
            <p className="text-xs font-black uppercase tracking-wider text-[#1B3D87] mb-2">
              3. Marchandise &amp; Tarification ZIHAN
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div className="sm:col-span-2">
                <Input
                  label="Désignation des Articles *"
                  placeholder="Ex: Chaussures Sport ZIHAN Runner Pro"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Montant Marchandise (COD DT) *"
                type="number"
                step="0.5"
                min="0"
                value={createForm.goods_amount}
                onChange={(e) => setCreateForm({ ...createForm, goods_amount: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <Input
                label="Quantité"
                type="number"
                min="1"
                value={createForm.quantity}
                onChange={(e) => setCreateForm({ ...createForm, quantity: parseInt(e.target.value, 10) || 1 })}
              />

              <Input
                label="Poids Estimé (kg)"
                type="number"
                step="0.1"
                min="0.1"
                value={createForm.weight}
                onChange={(e) => setCreateForm({ ...createForm, weight: parseFloat(e.target.value) || 1.0 })}
              />

              <div>
                <label className="text-xs font-bold text-foreground mb-1 block">Livreur (optionnel)</label>
                <select
                  value={createForm.driver_name || ''}
                  onChange={(e) => setCreateForm({ ...createForm, driver_name: e.target.value })}
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-xs font-semibold"
                >
                  <option value="">-- Assigner plus tard --</option>
                  <option value="Karim Mansouri">Karim Mansouri (Grand Tunis)</option>
                  <option value="Sami Ben Ali">Sami Ben Ali (Grand Tunis)</option>
                  <option value="Ahmed Trabelsi">Ahmed Trabelsi (Sahel / Sousse)</option>
                </select>
              </div>
            </div>

            {/* Price Preview Banner */}
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-[#1B3D87] dark:text-blue-300">
                  {isGrandTunis ? 'Zone Grand Tunis (Tarif Fixe 7.000 DT)' : 'Zone Hors Grand Tunis (Tarif Fixe 10.000 DT)'}
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Montant article : {Number(createForm.goods_amount || 0).toFixed(2)} DT + Livraison : {formDeliveryFee.toFixed(2)} DT
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Total à Encaisser</span>
                <p className="text-lg font-black text-[#1B3D87] dark:text-blue-300">
                  {formTotalAmount.toFixed(3)} DT
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isSubmitting}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              Créer &amp; Générer Bon de Commande (PDF)
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DOCUMENT VIEWER & PDF DOWNLOAD MODAL ────────────────────────────── */}
      {selectedParcelForDoc && (
        <DocumentViewerModal
          isOpen={isDocModalOpen}
          onClose={() => {
            setIsDocModalOpen(false);
            setSelectedParcelForDoc(null);
          }}
          deliveryNoteData={selectedParcelForDoc}
          initialType="delivery_note"
        />
      )}
    </div>
  );
};
