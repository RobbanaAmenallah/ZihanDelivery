import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Banknote,
  Search,
  RefreshCw,
  Printer,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  Check,
  CreditCard,
  DollarSign,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getDbParcels, updateDbParcel } from '@/services/parcelsDb';
import { getDbUsers } from '@/services/usersDb';
import type { Parcel, UserProfile } from '@/types';
import {
  SettlementViewerModal,
} from '@/components/documents/SettlementViewerModal';
import type {
  ClientSettlementData,
  DaySettlementGroup,
  SettlementParcelItem,
} from '@/components/documents/ZihanSettlementTemplate';

export const AdminSettlementsPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Filters
  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'last_month'>('month');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'settled' | 'unsettled'>('all');

  // Settlement Form Controls (Informations de règlement)
  const [settlementMethod, setSettlementMethod] = useState<'especes' | 'cheque'>('especes');
  const [settlementDate, setSettlementDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [settlementReference, setSettlementReference] = useState<string>('');

  // Expanded dates state (accordion: which dates have details open)
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Modal Bordereau Official State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Success toast / feedback
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ parcels: fetchedParcels }, { users: fetchedUsers }] = await Promise.all([
        getDbParcels(),
        getDbUsers(),
      ]);
      setParcels(fetchedParcels);
      setClients((fetchedUsers || []).filter((u) => u.role === 'client'));
    } catch (err) {
      console.error('Erreur chargement données règlement:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected client object
  const selectedClient = useMemo(() => {
    if (selectedClientId === 'all') return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Delivered parcels filtered by client, period, search, settlement status
  const deliveredParcels = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return parcels.filter((p) => {
      // Must be delivered
      if (p.status !== 'delivered') return false;

      // Filter client
      if (selectedClientId !== 'all') {
        const matchId = p.sender_id === selectedClientId;
        const matchName = selectedClient && p.sender_name?.toLowerCase().includes(selectedClient.full_name?.toLowerCase());
        if (!matchId && !matchName) return false;
      }

      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTrack = p.tracking_number?.toLowerCase().includes(q);
        const matchRecip = p.recipient_name?.toLowerCase().includes(q);
        const matchPhone = p.recipient_phone?.includes(q);
        const matchSender = p.sender_name?.toLowerCase().includes(q);
        if (!matchTrack && !matchRecip && !matchPhone && !matchSender) return false;
      }

      // Filter settlement status
      if (settlementFilter === 'settled' && !p.is_settled) return false;
      if (settlementFilter === 'unsettled' && p.is_settled) return false;

      // Filter period (based on delivery date status_updated_at or settled_at or created_at)
      const dDateStr = p.status_updated_at || p.settled_at || p.created_at;
      if (!dDateStr) return true;
      const dDate = new Date(dDateStr);

      if (periodFilter === 'today') {
        return dDateStr.startsWith(todayStr);
      }
      if (periodFilter === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return dDate >= sevenDaysAgo;
      }
      if (periodFilter === 'month') {
        return dDate.getMonth() === now.getMonth() && dDate.getFullYear() === now.getFullYear();
      }
      if (periodFilter === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return dDate.getMonth() === lastMonth && dDate.getFullYear() === lastMonthYear;
      }

      return true;
    });
  }, [parcels, selectedClientId, selectedClient, searchQuery, settlementFilter, periodFilter]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalSettled = 0;
    let totalPending = 0;
    let settledCount = 0;
    let pendingCount = 0;

    deliveredParcels.forEach((p) => {
      const amount = Number(p.goods_amount || 0);
      if (p.is_settled) {
        totalSettled += amount;
        settledCount++;
      } else {
        totalPending += amount;
        pendingCount++;
      }
    });

    return {
      totalSettled,
      totalPending,
      totalCount: deliveredParcels.length,
      settledCount,
      pendingCount,
      totalOverallAmount: totalSettled + totalPending,
    };
  }, [deliveredParcels]);

  // Group delivered parcels by Day / Date
  const groupedByDay = useMemo<DaySettlementGroup[]>(() => {
    const groupsMap = new Map<string, Parcel[]>();

    deliveredParcels.forEach((p) => {
      const rawDate = p.status_updated_at || p.settled_at || p.created_at || new Date().toISOString();
      const dateKey = rawDate.split('T')[0]; // "YYYY-MM-DD"

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(p);
    });

    // Sort descending by date (most recent first)
    const sortedDateKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));

    let globalParcelIndex = 1;

    return sortedDateKeys.map((dateKey) => {
      const dayParcels = groupsMap.get(dateKey)!;
      let dayTotal = 0;
      let allSettled = true;

      const items: SettlementParcelItem[] = dayParcels.map((p) => {
        const gAmount = Number(p.goods_amount || 0);
        dayTotal += gAmount;
        if (!p.is_settled) allSettled = false;

        const rawDeliveryDate = p.status_updated_at || p.settled_at || p.created_at;
        const formattedDeliveryDate = rawDeliveryDate
          ? new Date(rawDeliveryDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : dateKey;

        return {
          index: globalParcelIndex++,
          id: p.id,
          trackingNumber: p.tracking_number,
          recipientName: p.recipient_name,
          recipientPhone: p.recipient_phone,
          recipientGovernorate: p.recipient_governorate,
          deliveryDate: formattedDeliveryDate,
          goodsAmount: gAmount,
          isSettled: Boolean(p.is_settled),
          settledAt: p.settled_at,
          settlementMethod: p.settlement_method,
        };
      });

      // Label date e.g. "Dimanche 18 Octobre 2026"
      const dateObj = new Date(dateKey + 'T12:00:00Z');
      const dateLabel = isNaN(dateObj.getTime())
        ? dateKey
        : dateObj.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

      return {
        date: dateKey,
        dateLabel: dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1),
        parcelsCount: dayParcels.length,
        totalDayAmount: dayTotal,
        isAllSettled: allSettled && dayParcels.length > 0,
        items,
      };
    });
  }, [deliveredParcels]);

  // Toggle details for a specific day
  const toggleDateDetails = (dateKey: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Expand all / collapse all
  const toggleAllDetails = (expand: boolean) => {
    const next: Record<string, boolean> = {};
    groupedByDay.forEach((grp) => {
      next[grp.date] = expand;
    });
    setExpandedDates(next);
  };

  // Toggle individual parcel settlement
  const handleToggleParcelSettlement = async (parcelId: string, currentStatus: boolean) => {
    setIsUpdating(true);
    try {
      const newStatus = !currentStatus;
      await updateDbParcel(parcelId, {
        is_settled: newStatus,
        settled_at: newStatus ? settlementDate + 'T12:00:00Z' : null,
        settlement_method: newStatus ? settlementMethod : null,
        settlement_note: newStatus && settlementReference ? settlementReference : undefined,
      });

      // Update local state
      setParcels((prev) =>
        prev.map((p) =>
          p.id === parcelId || p.tracking_number === parcelId
            ? {
                ...p,
                is_settled: newStatus,
                settled_at: newStatus ? settlementDate + 'T12:00:00Z' : null,
                settlement_method: newStatus ? settlementMethod : null,
              }
            : p
        )
      );

      setActionSuccessMsg(`Colis mis à jour : ${newStatus ? 'RÉGLÉ' : 'NON RÉGLÉ'}`);
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Erreur mise à jour règlement:', err);
      alert('Impossible de mettre à jour le règlement');
    } finally {
      setIsUpdating(false);
    }
  };

  // Settle all unsettled parcels in the current filter
  const handleSettleAllFiltered = async () => {
    const unsettled = deliveredParcels.filter((p) => !p.is_settled);
    if (unsettled.length === 0) {
      alert('Aucun colis en attente de règlement dans la sélection actuelle.');
      return;
    }

    const confirmMsg = `Confirmez-vous le règlement de ${unsettled.length} colis pour un montant total de ${stats.totalPending.toFixed(
      3
    )} TND en mode [${settlementMethod.toUpperCase()}] à la date du ${settlementDate} ?`;
    if (!window.confirm(confirmMsg)) return;

    setIsUpdating(true);
    try {
      for (const p of unsettled) {
        await updateDbParcel(p.id, {
          is_settled: true,
          settled_at: settlementDate + 'T12:00:00Z',
          settlement_method: settlementMethod,
          settlement_note: settlementReference || undefined,
        });
      }

      await loadData();
      setActionSuccessMsg(`Succès : ${unsettled.length} colis marqués comme réglés avec succès !`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Erreur règlement groupé:', err);
      alert('Erreur lors de la validation du règlement.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (deliveredParcels.length === 0) {
      alert('Aucun colis à exporter.');
      return;
    }

    const headers = [
      'N° Colis',
      'Code Suivi',
      'Expéditeur',
      'Destinataire',
      'Téléphone',
      'Gouvernorat',
      'Date Livraison',
      'Montant COD (TND)',
      'Statut Règlement',
      'Mode Règlement',
      'Date Règlement',
    ];

    let rowIdx = 1;
    const rows = deliveredParcels.map((p) => {
      const rawDate = p.status_updated_at || p.settled_at || p.created_at;
      const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('fr-FR') : '';
      return [
        rowIdx++,
        `"${p.tracking_number}"`,
        `"${p.sender_name || ''}"`,
        `"${p.recipient_name}"`,
        `"${p.recipient_phone}"`,
        `"${p.recipient_governorate}"`,
        `"${formattedDate}"`,
        (Number(p.goods_amount) || 0).toFixed(3),
        p.is_settled ? 'RÉGLÉ' : 'EN ATTENTE',
        p.settlement_method || '',
        p.settled_at ? new Date(p.settled_at).toLocaleDateString('fr-FR') : '',
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Bordereau_Reglement_${selectedClient?.company_name || 'Global'}_${settlementDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare Settlement Data for PDF Modal
  const modalSettlementData: ClientSettlementData = useMemo(() => {
    const clientName = selectedClient?.company_name || selectedClient?.full_name || 'Tous les Clients';
    return {
      settlementNumber: `BDR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      settlementDate: new Date(settlementDate).toLocaleDateString('fr-FR'),
      settlementMethod,
      settlementReference,
      client: {
        name: clientName,
        company: selectedClient?.company_name || clientName,
        phone: selectedClient?.phone || '+216 29 177 004',
        email: selectedClient?.email || 'contact@client.tn',
        address: selectedClient?.address || 'Tunisie',
        city: selectedClient?.city || 'Tunis',
        governorate: selectedClient?.governorate || 'Tunis',
      },
      totalSettledAmount: stats.totalSettled,
      totalPendingAmount: stats.totalPending,
      totalDeliveredCount: stats.totalCount,
      groups: groupedByDay,
    };
  }, [selectedClient, settlementDate, settlementMethod, settlementReference, stats, groupedByDay]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Banknote className="h-7 w-7 text-[#1B3D87]" />
              Bordereau de Règlement
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              COD Encaissé
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des reversements de fonds aux boutiques et expéditeurs (Chèque / Espèces) avec détail des colis livrés.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            leftIcon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
          >
            Export Excel/CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Printer className="h-4 w-4" />}
            className="bg-[#1B3D87] hover:bg-[#152e66] text-white"
          >
            Imprimer Bordereau
          </Button>
        </div>
      </div>

      {/* Success alert message */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* ── SECTION 1 : INFORMATIONS DE RÈGLEMENT (FORMULAIRE & ACTIONS) ── */}
      <Card className="border-[#1B3D87]/20 shadow-sm bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-[#1B3D87] flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                Informations de Règlement (Fonds Reversés au Client)
              </CardTitle>
              <CardDescription>
                Définissez le mode de paiement, la date et validez le déblocage des fonds en temps réel.
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground font-mono bg-white px-2 py-1 rounded border">
              Statut : <span className="text-emerald-700 font-bold">Synchronisé DB</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* 1. Sélection Expéditeur / Client */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                Client / Expéditeur
              </label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#1B3D87]"
              >
                <option value="all">Tous les clients (Global)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company_name || c.full_name} ({c.phone || c.email})
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Mode de règlement (Chèque / Espèces) */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5 flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                Mode de règlement
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSettlementMethod('especes')}
                  className={`text-xs font-semibold py-2 px-3 rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                    settlementMethod === 'especes'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  Espèces
                </button>
                <button
                  type="button"
                  onClick={() => setSettlementMethod('cheque')}
                  className={`text-xs font-semibold py-2 px-3 rounded-md border transition-all flex items-center justify-center gap-1.5 ${
                    settlementMethod === 'cheque'
                      ? 'bg-[#1B3D87] text-white border-[#1B3D87] shadow-sm'
                      : 'bg-background hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <Check className="h-3.5 w-3.5" />
                  Chèque
                </button>
              </div>
            </div>

            {/* 3. Date de règlement */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1.5">
                Date de règlement
              </label>
              <Input
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                className="text-sm bg-background"
              />
            </div>

            {/* 4. Réf / N° Chèque ou Bouton Valider */}
            <div>
              {settlementMethod === 'cheque' ? (
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1.5">
                    N° Chèque / Banque
                  </label>
                  <Input
                    type="text"
                    placeholder="Ex: CHQ-889422 (BIAT)"
                    value={settlementReference}
                    onChange={(e) => setSettlementReference(e.target.value)}
                    className="text-sm bg-background"
                  />
                </div>
              ) : (
                <Button
                  onClick={handleSettleAllFiltered}
                  isLoading={isUpdating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  leftIcon={<Check className="h-4 w-4" />}
                >
                  Régler les colis en attente ({stats.totalPending.toFixed(3)} DT)
                </Button>
              )}
            </div>
          </div>

          {settlementMethod === 'cheque' && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSettleAllFiltered}
                isLoading={isUpdating}
                className="bg-[#1B3D87] hover:bg-[#152e66] text-white shadow-sm"
                leftIcon={<Check className="h-4 w-4" />}
              >
                Valider règlement par Chèque ({stats.totalPending.toFixed(3)} DT)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total réglé */}
        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Montant Total Réglé
              </p>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {stats.totalSettled.toFixed(3)}{' '}
                <span className="text-xs font-normal text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {stats.settledCount} colis remis aux clients
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* En attente de règlement */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                En Attente de Règlement
              </p>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {stats.totalPending.toFixed(3)}{' '}
                <span className="text-xs font-normal text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                {stats.pendingCount} colis livrés à reverser
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Total Colis Livrés */}
        <Card className="border-l-4 border-l-[#1B3D87] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Colis Livrés (Période)
              </p>
              <div className="text-2xl font-black text-foreground mt-1">
                {stats.totalCount}{' '}
                <span className="text-xs font-normal text-muted-foreground">colis</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total : {stats.totalOverallAmount.toFixed(3)} TND
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#1B3D87]">
              <Banknote className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* Mode & Date Active */}
        <Card className="border-l-4 border-l-slate-400 shadow-sm bg-muted/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mode de Règlement
              </p>
              <div className="text-lg font-bold text-foreground mt-1 capitalize">
                {settlementMethod === 'cheque' ? 'Chèque bancaire' : 'Espèces (Cash)'}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Date : {new Date(settlementDate).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-slate-200 flex items-center justify-center text-slate-700">
              <CreditCard className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRE DE FILTRES SECONDAIRE ── */}
      <div className="bg-card border rounded-lg p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher code suivi, destinataire, tél..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9 bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Période */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md text-xs">
            <span className="text-muted-foreground px-1.5 font-medium">Période:</span>
            {(['month', 'week', 'today', 'last_month', 'all'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  periodFilter === p
                    ? 'bg-white text-[#1B3D87] shadow-sm font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p === 'month'
                  ? 'Ce mois'
                  : p === 'week'
                  ? '7 jours'
                  : p === 'today'
                  ? "Aujourd'hui"
                  : p === 'last_month'
                  ? 'Mois dernier'
                  : 'Tous'}
              </button>
            ))}
          </div>

          {/* État règlement */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-md text-xs">
            <span className="text-muted-foreground px-1.5 font-medium">État:</span>
            <button
              onClick={() => setSettlementFilter('all')}
              className={`px-2 py-1 rounded font-medium ${
                settlementFilter === 'all'
                  ? 'bg-white text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setSettlementFilter('settled')}
              className={`px-2 py-1 rounded font-medium ${
                settlementFilter === 'settled'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Réglés
            </button>
            <button
              onClick={() => setSettlementFilter('unsettled')}
              className={`px-2 py-1 rounded font-medium ${
                settlementFilter === 'unsettled'
                  ? 'bg-amber-500 text-white shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              En attente
            </button>
          </div>

          {/* Déplier / Replier tout */}
          <div className="flex items-center gap-1 border-l pl-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleAllDetails(true)}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              Déplier tout
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleAllDetails(false)}
              className="text-xs h-8 text-muted-foreground hover:text-foreground"
            >
              Replier
            </Button>
          </div>
        </div>
      </div>

      {/* ── SECTION DÉTAIL DES COLIS PAR ÉTAT DE RÈGLEMENT ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-[#1B3D87] tracking-tight">
              1. Colis Livrés & Sommes par Jour et Date
            </h2>
            <Badge variant="secondary" className="font-semibold">
              {groupedByDay.length} date(s)
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            Cliquez sur <strong>« Afficher détails »</strong> pour examiner les colis de chaque date
          </span>
        </div>

        {groupedByDay.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-lg shadow-sm">
            <Banknote className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">Aucun colis livré trouvé</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Aucun colis avec le statut « Livré » ne correspond aux filtres de date ou de client sélectionnés.
            </p>
          </div>
        ) : (
          groupedByDay.map((grp) => {
            const isExpanded = Boolean(expandedDates[grp.date]);

            return (
              <div
                key={grp.date}
                className="bg-card border rounded-lg shadow-sm overflow-hidden transition-all duration-200"
              >
                {/* ── BARRE D'ENTÊTE DU JOUR (SOMME PAR JOUR ET DATE) ── */}
                <div
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none transition-colors ${
                    isExpanded ? 'bg-muted/30 border-b' : 'hover:bg-muted/20'
                  }`}
                  onClick={() => toggleDateDetails(grp.date)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 text-[#1B3D87]">
                      <Banknote className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-bold text-foreground text-sm flex items-center gap-2">
                        <span>{grp.dateLabel}</span>
                        <Badge variant="outline" className="text-xs font-medium">
                          {grp.parcelsCount} {grp.parcelsCount > 1 ? 'colis livrés' : 'colis livré'}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Date référence : {grp.date}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Somme par jour et date */}
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground font-medium">Somme du jour</div>
                      <div className="text-base font-black text-[#1B3D87]">
                        {grp.totalDayAmount.toFixed(3)}{' '}
                        <span className="text-xs font-bold text-muted-foreground">TND</span>
                      </div>
                    </div>

                    {/* Statut du lot du jour */}
                    <div>
                      {grp.isAllSettled ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-300">
                          Tous Réglés
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-300">
                          En attente
                        </Badge>
                      )}
                    </div>

                    {/* Bouton Afficher détails */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDateDetails(grp.date);
                      }}
                      className="text-xs font-semibold gap-1.5 border-[#1B3D87]/30 text-[#1B3D87] hover:bg-blue-50"
                    >
                      {isExpanded ? (
                        <>
                          Masquer détails <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          Afficher détails <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* ── TABLEAU DÉTAIL DES COLIS LORSQUE DÉPLIÉ ── */}
                {isExpanded && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                          <th className="py-2.5 px-3 w-12 text-center">N°</th>
                          <th className="py-2.5 px-3">Code Suivi</th>
                          <th className="py-2.5 px-3">Destinataire</th>
                          <th className="py-2.5 px-3">Date de livraison</th>
                          <th className="py-2.5 px-3 text-right">Montant (TND)</th>
                          <th className="py-2.5 px-3 text-center">Statut Règlement</th>
                          <th className="py-2.5 px-3 text-center">Action Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {grp.items.map((item) => (
                          <tr
                            key={item.id}
                            className={`hover:bg-muted/20 transition-colors ${
                              item.isSettled ? 'bg-white' : 'bg-amber-50/20'
                            }`}
                          >
                            {/* N° Colis (1, 2, 3...) */}
                            <td className="py-2.5 px-3 text-center font-bold text-muted-foreground">
                              {item.index}
                            </td>

                            {/* Code Suivi */}
                            <td className="py-2.5 px-3 font-mono font-bold text-[#1B3D87]">
                              {item.trackingNumber}
                            </td>

                            {/* Destinataire */}
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-foreground">{item.recipientName}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                                <span>{item.recipientPhone || '—'}</span>
                                {item.recipientGovernorate && (
                                  <span>• {item.recipientGovernorate}</span>
                                )}
                              </div>
                            </td>

                            {/* Date de livraison */}
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              {item.deliveryDate}
                            </td>

                            {/* Montant (TND) */}
                            <td className="py-2.5 px-3 text-right font-black text-foreground text-sm">
                              {item.goodsAmount.toFixed(3)}
                            </td>

                            {/* Statut Règlement */}
                            <td className="py-2.5 px-3 text-center">
                              {item.isSettled ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                  ✓ Réglé ({item.settlementMethod || 'Espèces'})
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-bold">
                                  ⏳ À régler
                                </Badge>
                              )}
                            </td>

                            {/* Action Admin : Toggle Settlement */}
                            <td className="py-2.5 px-3 text-center">
                              <Button
                                size="sm"
                                variant={item.isSettled ? 'outline' : 'default'}
                                onClick={() => handleToggleParcelSettlement(item.id, item.isSettled)}
                                className={`text-[11px] h-7 px-2.5 font-medium ${
                                  item.isSettled
                                    ? 'hover:bg-amber-50 hover:text-amber-800 hover:border-amber-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {item.isSettled ? 'Annuler' : 'Marquer Réglé'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted/40 font-bold border-t">
                          <td colSpan={4} className="py-2.5 px-3 text-right text-muted-foreground">
                            Total du {grp.dateLabel} :
                          </td>
                          <td className="py-2.5 px-3 text-right font-black text-[#1B3D87] text-sm">
                            {grp.totalDayAmount.toFixed(3)} TND
                          </td>
                          <td colSpan={2} className="py-2.5 px-3 text-center text-xs text-muted-foreground">
                            {grp.items.filter((i) => i.isSettled).length} / {grp.items.length} réglés
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL D'IMPRESSION DU BORDEREAU OFFICIEL ── */}
      <SettlementViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        settlementData={modalSettlementData}
      />
    </div>
  );
};
