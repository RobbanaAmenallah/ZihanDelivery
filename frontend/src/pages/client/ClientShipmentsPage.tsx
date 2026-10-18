import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Search,
  RefreshCw,
  FileText,
  Printer,
  Download,
  RotateCcw,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SettlementBadge } from '@/components/ui/SettlementBadge';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { DateRangeFilter, applyDateFilter } from '@/components/admin/DateRangeFilter';
import type { QuickFilter, DateRange } from '@/components/admin/DateRangeFilter';
import { type Parcel, type UpdateParcelPayload } from '@/types';
import {
  getDbParcels,
  parcelToDeliveryNoteData,
  isParcelForClient,
  updateDbParcel,
  calculateDeliveryFee,
  ALL_TUNISIAN_GOVERNORATES,
  GRAND_TUNIS_GOVERNORATES,
} from '@/services/parcelsDb';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/routes/paths';

const RETURN_STATUSES = ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused'];

export const ClientShipmentsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlStatus = searchParams.get('status');

  const { profile, user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || 'all');
  const [dateFilter, setDateFilter] = useState<QuickFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [selectedParcelForDoc, setSelectedParcelForDoc] = useState<DeliveryNoteData | null>(null);

  // Edit Parcel Modal State (Clients can edit only 'pending' parcels)
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingParcel, setEditingParcel] = useState<Parcel | null>(null);
  const [editForm, setEditForm] = useState({
    recipient_name: '',
    recipient_phone: '',
    recipient_secondary_phone: '',
    recipient_governorate: 'Tunis',
    recipient_address: '',
    description: '',
    quantity: 1,
    weight: 1.0,
    is_fragile: false,
    goods_amount: 0,
    notes: '',
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };


  // Synchronize statusFilter if URL query param changes
  useEffect(() => {
    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);

  const loadParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: fetched } = await getDbParcels();
    const clientParcels = fetched.filter((p) => isParcelForClient(p, profile, user?.id));
    setParcels(clientParcels);
    setIsLoading(false);
  }, [profile, user]);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  const handleOpenDoc = (parcel: Parcel) => {
    setSelectedParcelForDoc(parcelToDeliveryNoteData(parcel));
    setIsDocModalOpen(true);
  };

  // ── Open Edit Modal (Strictly for 'pending' parcels) ─────────────────────────
  const handleOpenEditModal = (parcel: Parcel) => {
    if (parcel.status !== 'pending') {
      showToast('⚠️ Seuls les colis en attente de prise en charge peuvent être modifiés.');
      return;
    }
    setEditingParcel(parcel);
    setEditForm({
      recipient_name: parcel.recipient_name || '',
      recipient_phone: parcel.recipient_phone || '',
      recipient_secondary_phone: parcel.recipient_secondary_phone || '',
      recipient_governorate: parcel.recipient_governorate || 'Tunis',
      recipient_address: parcel.recipient_address || '',
      description: parcel.description || '',
      quantity: parcel.quantity || 1,
      weight: parcel.weight || 1.0,
      is_fragile: Boolean(parcel.is_fragile),
      goods_amount: parcel.goods_amount || 0,
      notes: parcel.notes || '',
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  // ── Submit Edit Form ────────────────────────────────────────────────────────
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingParcel) return;
    if (editingParcel.status !== 'pending') {
      setEditError('Modification impossible : ce colis n\'est plus en attente.');
      return;
    }

    if (!editForm.recipient_name.trim() || !editForm.recipient_phone.trim() || !editForm.recipient_address.trim()) {
      setEditError('Veuillez renseigner le nom, le numéro de téléphone et l\'adresse du destinataire.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);

    try {
      const senderName = editingParcel.sender_name || profile?.company_name || profile?.full_name || '';
      const deliveryFee = calculateDeliveryFee(editForm.recipient_governorate, senderName);
      const goodsAmount = Number(editForm.goods_amount || 0);
      const totalAmount = goodsAmount + deliveryFee;

      const payload: UpdateParcelPayload = {
        recipient_name: editForm.recipient_name,
        recipient_phone: editForm.recipient_phone,
        recipient_secondary_phone: editForm.recipient_secondary_phone,
        recipient_governorate: editForm.recipient_governorate,
        recipient_address: editForm.recipient_address,
        description: editForm.description,
        quantity: Number(editForm.quantity || 1),
        weight: Number(editForm.weight || 1.0),
        is_fragile: Boolean(editForm.is_fragile),
        goods_amount: goodsAmount,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        notes: editForm.notes,
      };

      await updateDbParcel(editingParcel.id, payload);

      setParcels((prev) =>
        prev.map((p) =>
          p.id === editingParcel.id
            ? { ...p, ...payload }
            : p
        )
      );

      setIsEditModalOpen(false);
      setEditingParcel(null);
      showToast(`✅ Colis ${editingParcel.tracking_number} modifié avec succès !`);
    } catch (err) {
      console.error('Erreur modification colis client:', err);
      setEditError('Une erreur est survenue lors de l\'enregistrement des modifications.');
    } finally {
      setIsUpdating(false);
    }
  };

  // ── Export CSV Client ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {

    const headers = [
      'N° Suivi', 'Date', 'Destinataire', 'Téléphone',
      'Gouvernorat', 'Délégation', 'Adresse', 'Contenu',
      'Qté', 'Valeur Marchandise (DT)', 'Total COD (DT)',
      'Statut', 'Règlement',
    ];
    const rows = filteredParcels.map((p) => [
      `"${p.tracking_number}"`,
      `"${new Date(p.created_at).toLocaleDateString('fr-FR')}"`,
      `"${p.recipient_name}"`,
      `"${p.recipient_phone}"`,
      `"${p.recipient_governorate}"`,
      `"${p.recipient_delegation || ''}"`,
      `"${p.recipient_address}"`,
      `"${p.description}"`,
      p.quantity,
      (p.goods_amount || 0).toFixed(3),
      p.total_amount.toFixed(3),
      `"${p.status}"`,
      `"${p.is_settled ? 'Réglé' : 'Non réglé'}"`,
    ]);

    const BOM = '\uFEFF';
    const csvContent = BOM + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `mes_colis_zihan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Filtered Parcels ──────────────────────────────────────────────────────────
  const filteredParcels = useMemo(() => {
    // Apply date filter first
    const dateFiltered = applyDateFilter(parcels, dateFilter, dateRange);

    return dateFiltered.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.tracking_number.toLowerCase().includes(q) ||
        p.recipient_name.toLowerCase().includes(q) ||
        p.recipient_phone.includes(q) ||
        p.recipient_address.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && p.status === 'pending') ||
        (statusFilter === 'in_transit' && ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)) ||
        (statusFilter === 'delivered' && p.status === 'delivered') ||
        (statusFilter === 'returns' && RETURN_STATUSES.includes(p.status));

      return matchSearch && matchStatus;
    });
  }, [parcels, searchQuery, statusFilter, dateFilter, dateRange]);

  // Count by status
  const counts = useMemo(() => ({
    all: parcels.length,
    pending: parcels.filter((p) => p.status === 'pending').length,
    inTransit: parcels.filter((p) => ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)).length,
    delivered: parcels.filter((p) => p.status === 'delivered').length,
    returns: parcels.filter((p) => RETURN_STATUSES.includes(p.status)).length,
  }), [parcels]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Mes Expéditions &amp; Colis
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {parcels.length} Colis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Historique complet, suivi en temps réel et impression de bons de commande A4 (PDF).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={loadParcels}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>

          {filteredParcels.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              leftIcon={<Download className="h-4 w-4" />}
              className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
            >
              Exporter CSV
            </Button>
          )}

          {parcels.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDoc(parcels[0])}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Dernier Bon (PDF)
            </Button>
          )}

          <Link to={ROUTES.CLIENT_CREATE}>
            <Button
              size="sm"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              + Nouveau Bon
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 bg-card border-b border-border/60 flex flex-col gap-3">
          {/* Row 1: Search + Date filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° Suivi (ZH...), Destinataire, Tél, Ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            {/* Date range filter */}
            <DateRangeFilter
              activeFilter={dateFilter}
              dateRange={dateRange}
              onChange={(filter, range) => {
                setDateFilter(filter);
                setDateRange(range);
              }}
            />
          </div>

          {/* Row 2: Status tabs */}
          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold self-start">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'all' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Tous ({counts.all})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'pending' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              En attente ({counts.pending})
            </button>
            <button
              onClick={() => setStatusFilter('in_transit')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'in_transit' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              En cours ({counts.inTransit})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'delivered' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Livrés ({counts.delivered})
            </button>
            <button
              onClick={() => setStatusFilter('returns')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md transition-all ${
                statusFilter === 'returns'
                  ? 'bg-rose-100 text-rose-700 font-bold shadow-xs dark:bg-rose-950/60 dark:text-rose-300'
                  : 'text-muted-foreground'
              }`}
            >
              <RotateCcw className="h-3 w-3" />
              Retours ({counts.returns})
            </button>
          </div>
        </div>

        {/* Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="p-3 px-4">N° Suivi</th>
                  <th className="p-3">Destinataire</th>
                  <th className="p-3">Gouvernorat &amp; Ville</th>
                  <th className="p-3">Contenu</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Règlement</th>
                  <th className="p-3 text-right">Valeur Marchandise</th>
                  <th className="p-3 text-right">À Encaisser (COD)</th>
                  <th className="p-3 text-right">Bon de Commande</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcels.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#1B3D87]" />
                      <p className="font-bold text-foreground">Aucun colis trouvé</p>
                      <p className="text-xs mt-1">Créez votre première expédition avec le bouton ci-dessus.</p>
                    </td>
                  </tr>
                ) : (
                  filteredParcels.map((parcel) => (
                    <tr
                      key={parcel.id}
                      className={`hover:bg-[#F7F9FC] dark:hover:bg-slate-800/40 transition-colors ${
                        RETURN_STATUSES.includes(parcel.status) ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="p-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                        {parcel.tracking_number}
                        <span className="block text-[10px] font-sans font-normal text-muted-foreground">
                          {new Date(parcel.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-foreground">{parcel.recipient_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{parcel.recipient_phone}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <span className="font-semibold text-foreground">{parcel.recipient_governorate}</span>
                        {parcel.recipient_delegation && ` • ${parcel.recipient_delegation}`}
                        <span className="block text-[10px] truncate max-w-[150px]">{parcel.recipient_address}</span>
                      </td>
                      <td className="p-3 max-w-[140px] truncate">
                        <span className="font-semibold text-foreground truncate block">{parcel.description}</span>
                        <span className="text-[10px] text-muted-foreground">Qté: {parcel.quantity} • {parcel.weight} kg</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={parcel.status} size="sm" />
                      </td>
                      <td className="p-3">
                        {parcel.status === 'delivered' ? (
                          <SettlementBadge
                            isSettled={!!parcel.is_settled}
                            settledAt={parcel.settled_at}
                            size="sm"
                          />
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {(parcel.goods_amount || 0).toFixed(3)} DT
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {parcel.total_amount.toFixed(3)} DT
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {parcel.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 font-bold"
                              onClick={() => handleOpenEditModal(parcel)}
                              leftIcon={<Pencil className="h-3 w-3 text-amber-600" />}
                              title="Modifier ce colis (uniquement pour les colis en attente)"
                            >
                              Modifier
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-[#1B3D87] font-bold bg-blue-50/50 hover:bg-blue-100 border border-blue-200"
                            onClick={() => handleOpenDoc(parcel)}
                            leftIcon={<FileText className="h-3.5 w-3.5" />}
                          >
                            Bon PDF
                          </Button>
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

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#1B3D87] text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* ── MODAL: Modifier le Colis (Client - En attente uniquement) ─────────── */}
      {editingParcel && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            if (!isUpdating) {
              setIsEditModalOpen(false);
              setEditingParcel(null);
            }
          }}
          size="2xl"
          title={
            <div className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-amber-600" />
              <span>Modifier le Colis {editingParcel.tracking_number}</span>
            </div>
          }
          description="Vous pouvez modifier les coordonnées du destinataire et les détails du colis tant qu'il est en statut « En attente »."
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingParcel(null);
                }}
                disabled={isUpdating}
              >
                Annuler
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSaveEdit}
                isLoading={isUpdating}
                className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
              >
                Enregistrer les Modifications
              </Button>
            </div>
          }
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {editError && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-800 p-2.5 rounded-lg text-xs font-semibold">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            {/* Info badge */}
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs font-medium">
              <Clock className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Statut actuel : <strong>En attente</strong>. Dès que le colis sera validé ou assigné à un livreur, il ne pourra plus être modifié.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Coordonnées Destinataire */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B3D87] dark:text-blue-300">
                  1. Destinataire
                </h4>
                <Input
                  label="Nom & Prénom *"
                  placeholder="Mohamed Ben Ali"
                  value={editForm.recipient_name}
                  onChange={(e) => setEditForm({ ...editForm, recipient_name: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
                <Input
                  label="Téléphone Principal *"
                  placeholder="+216 22 000 000"
                  value={editForm.recipient_phone}
                  onChange={(e) => setEditForm({ ...editForm, recipient_phone: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
                <Input
                  label="Téléphone Secondaire"
                  placeholder="+216 98 111 222"
                  value={editForm.recipient_secondary_phone}
                  onChange={(e) => setEditForm({ ...editForm, recipient_secondary_phone: e.target.value })}
                  className="h-8 text-xs"
                />
                <div>
                  <label className="text-[10px] font-bold text-foreground mb-0.5 block">Gouvernorat *</label>
                  <select
                    value={editForm.recipient_governorate}
                    onChange={(e) => setEditForm({ ...editForm, recipient_governorate: e.target.value })}
                    className="w-full h-8 px-2 rounded-lg border border-border bg-background text-xs font-semibold"
                  >
                    <optgroup label="Grand Tunis">
                      {GRAND_TUNIS_GOVERNORATES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Hors Grand Tunis">
                      {ALL_TUNISIAN_GOVERNORATES.filter((g) => !GRAND_TUNIS_GOVERNORATES.includes(g)).map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <Input
                  label="Adresse Complète & Repère *"
                  placeholder="Résidence, Apt, Rue..."
                  value={editForm.recipient_address}
                  onChange={(e) => setEditForm({ ...editForm, recipient_address: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
              </div>

              {/* Détails Marchandise */}
              <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1B3D87] dark:text-blue-300">
                  2. Marchandise & Montant
                </h4>
                <Input
                  label="Description Marchandise *"
                  placeholder="Article mode, chaussures..."
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="h-8 text-xs"
                  required
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    label="Quantité"
                    min={1}
                    value={editForm.quantity}
                    onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                  <Input
                    type="number"
                    step="0.1"
                    label="Poids (kg)"
                    min={0.1}
                    value={editForm.weight}
                    onChange={(e) => setEditForm({ ...editForm, weight: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <Input
                  type="number"
                  step="0.5"
                  label="Montant Marchandise à Encaisser (DT) *"
                  placeholder="70.000"
                  value={editForm.goods_amount}
                  onChange={(e) => setEditForm({ ...editForm, goods_amount: Number(e.target.value) })}
                  className="h-8 text-xs font-bold text-emerald-600"
                  required
                />
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="is_fragile"
                    checked={editForm.is_fragile}
                    onChange={(e) => setEditForm({ ...editForm, is_fragile: e.target.checked })}
                    className="h-4 w-4 rounded text-[#1B3D87] focus:ring-[#1B3D87]"
                  />
                  <label htmlFor="is_fragile" className="text-xs font-semibold text-foreground cursor-pointer">
                    ⚠️ Colis fragile
                  </label>
                </div>
                <Input
                  label="Remarques / Instructions"
                  placeholder="Appeler avant livraison..."
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* Recalcul automatique */}
            <div className="bg-[#1B3D87] text-white p-3 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-white/70 block">Frais livraison ({editForm.recipient_governorate}) :</span>
                <span className="font-mono font-bold">
                  {calculateDeliveryFee(
                    editForm.recipient_governorate,
                    editingParcel.sender_name || profile?.company_name || profile?.full_name || ''
                  ).toFixed(3)} DT
                </span>
              </div>
              <div className="text-right">
                <span className="text-amber-200 font-bold block">TOTAL COD À ENCAISSER :</span>
                <span className="text-base font-black font-mono text-amber-300">
                  {(
                    Number(editForm.goods_amount || 0) +
                    calculateDeliveryFee(
                      editForm.recipient_governorate,
                      editingParcel.sender_name || profile?.company_name || profile?.full_name || ''
                    )
                  ).toFixed(3)} DT
                </span>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Document Viewer Modal */}
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

