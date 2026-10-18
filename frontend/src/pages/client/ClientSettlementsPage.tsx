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
  Calendar,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getDbParcels } from '@/services/parcelsDb';
import type { Parcel } from '@/types';
import {
  SettlementViewerModal,
} from '@/components/documents/SettlementViewerModal';
import type {
  ClientSettlementData,
  DaySettlementGroup,
  SettlementParcelItem,
} from '@/components/documents/ZihanSettlementTemplate';

export const ClientSettlementsPage: React.FC = () => {
  const { profile } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | 'week' | 'month' | 'last_month'>('month');
  const [settlementFilter, setSettlementFilter] = useState<'all' | 'settled' | 'unsettled'>('all');

  // Expanded dates state
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});

  // Modal Bordereau Official State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { parcels: fetchedParcels } = await getDbParcels();
      setParcels(fetchedParcels);
    } catch (err) {
      console.error('Erreur chargement données règlement client:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Delivered parcels strictly belonging to this client
  const clientDeliveredParcels = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return parcels.filter((p) => {
      // Must belong to this client
      if (profile) {
        const matchId = p.sender_id && p.sender_id === profile.id;
        const matchName =
          p.sender_name &&
          ((profile.company_name && p.sender_name.toLowerCase().includes(profile.company_name.toLowerCase())) ||
            (profile.full_name && p.sender_name.toLowerCase().includes(profile.full_name.toLowerCase())));
        if (!matchId && !matchName) return false;
      }

      // Must be delivered
      if (p.status !== 'delivered') return false;

      // Filter search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTrack = p.tracking_number?.toLowerCase().includes(q);
        const matchRecip = p.recipient_name?.toLowerCase().includes(q);
        const matchPhone = p.recipient_phone?.includes(q);
        if (!matchTrack && !matchRecip && !matchPhone) return false;
      }

      // Filter settlement status
      if (settlementFilter === 'settled' && !p.is_settled) return false;
      if (settlementFilter === 'unsettled' && p.is_settled) return false;

      // Filter period
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
  }, [parcels, profile, searchQuery, settlementFilter, periodFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let totalSettled = 0;
    let totalPending = 0;
    let settledCount = 0;
    let pendingCount = 0;

    clientDeliveredParcels.forEach((p) => {
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
      totalCount: clientDeliveredParcels.length,
      settledCount,
      pendingCount,
      totalOverallAmount: totalSettled + totalPending,
    };
  }, [clientDeliveredParcels]);

  // Latest settlement info found in parcels
  const latestSettlementInfo = useMemo(() => {
    const settledParcels = clientDeliveredParcels.filter((p) => p.is_settled && p.settled_at);
    if (settledParcels.length === 0) {
      return {
        method: 'Espèces',
        date: new Date().toLocaleDateString('fr-FR'),
      };
    }
    // Pick the most recent settled parcel
    const sorted = [...settledParcels].sort((a, b) =>
      (b.settled_at || '').localeCompare(a.settled_at || '')
    );
    const latest = sorted[0];
    return {
      method: latest.settlement_method === 'cheque' ? 'Chèque bancaire' : 'Espèces',
      date: latest.settled_at
        ? new Date(latest.settled_at).toLocaleDateString('fr-FR')
        : new Date().toLocaleDateString('fr-FR'),
    };
  }, [clientDeliveredParcels]);

  // Group delivered parcels by Day / Date
  const groupedByDay = useMemo<DaySettlementGroup[]>(() => {
    const groupsMap = new Map<string, Parcel[]>();

    clientDeliveredParcels.forEach((p) => {
      const rawDate = p.status_updated_at || p.settled_at || p.created_at || new Date().toISOString();
      const dateKey = rawDate.split('T')[0];

      if (!groupsMap.has(dateKey)) {
        groupsMap.set(dateKey, []);
      }
      groupsMap.get(dateKey)!.push(p);
    });

    const sortedDateKeys = Array.from(groupsMap.keys()).sort((a, b) => b.localeCompare(a));
    let globalIndex = 1;

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
          index: globalIndex++,
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
  }, [clientDeliveredParcels]);

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

  // Export CSV
  const handleExportCSV = () => {
    if (clientDeliveredParcels.length === 0) {
      alert('Aucun colis à exporter.');
      return;
    }

    const headers = [
      'N° Colis',
      'Code Suivi',
      'Destinataire',
      'Téléphone',
      'Gouvernorat',
      'Date Livraison',
      'Montant COD (TND)',
      'Statut Règlement',
      'Mode',
      'Date Règlement',
    ];

    let rowIdx = 1;
    const rows = clientDeliveredParcels.map((p) => {
      const rawDate = p.status_updated_at || p.settled_at || p.created_at;
      const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('fr-FR') : '';
      return [
        rowIdx++,
        `"${p.tracking_number}"`,
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
    link.download = `Mon_Bordereau_Reglement_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare Settlement Data for PDF Modal
  const modalSettlementData: ClientSettlementData = useMemo(() => {
    const clientName = profile?.company_name || profile?.full_name || 'Mon Compte';
    return {
      settlementNumber: `BDR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      settlementDate: latestSettlementInfo.date,
      settlementMethod: latestSettlementInfo.method.toLowerCase().includes('chèque') ? 'cheque' : 'especes',
      client: {
        name: clientName,
        company: profile?.company_name || clientName,
        phone: profile?.phone || '—',
        email: profile?.email || '',
        address: profile?.address || '',
        city: profile?.city || '',
        governorate: profile?.governorate || '',
      },
      totalSettledAmount: stats.totalSettled,
      totalPendingAmount: stats.totalPending,
      totalDeliveredCount: stats.totalCount,
      groups: groupedByDay,
    };
  }, [profile, latestSettlementInfo, stats, groupedByDay]);

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
              Fonds Encaissés
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Consultez le relevé des fonds perçus sur vos colis livrés, les montants reversés et les sommes par jour.
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
            Export Excel
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Printer className="h-4 w-4" />}
            className="bg-[#1B3D87] hover:bg-[#152e66] text-white"
          >
            Imprimer Mon Bordereau
          </Button>
        </div>
      </div>

      {/* ── SECTION 1 : INFORMATIONS DE RÈGLEMENT ── */}
      <Card className="border-[#1B3D87]/20 shadow-sm bg-gradient-to-br from-white to-blue-50/20">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold text-[#1B3D87] flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600" />
            Informations de Règlement
          </CardTitle>
          <CardDescription>
            Récapitulatif de vos reversements et moyens de paiement utilisés par ZIHAN DELIVERY.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-3 bg-white rounded-lg border">
              <div className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1.5 mb-1">
                <CreditCard className="h-4 w-4 text-[#1B3D87]" />
                Mode de règlement
              </div>
              <div className="text-lg font-black text-foreground">
                {latestSettlementInfo.method}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Chèque bancaire ou Espèces</div>
            </div>

            <div className="p-3 bg-white rounded-lg border">
              <div className="text-xs text-muted-foreground font-semibold uppercase flex items-center gap-1.5 mb-1">
                <Calendar className="h-4 w-4 text-[#1B3D87]" />
                Date de règlement
              </div>
              <div className="text-lg font-black text-foreground">
                {latestSettlementInfo.date}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Dernière date enregistrée</div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-xs text-emerald-800 font-semibold uppercase flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Montant Total Réglé
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {stats.totalSettled.toFixed(3)}{' '}
                <span className="text-xs font-normal text-emerald-800">TND</span>
              </div>
              <div className="text-xs text-emerald-700 mt-0.5">
                Argent déjà encaissé et remis ({stats.settledCount} colis)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI STATS CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total réglé */}
        <Card className="border-l-4 border-l-emerald-600 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Total Réglé (Reçu)
              </p>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {stats.totalSettled.toFixed(3)}{' '}
                <span className="text-xs font-normal text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                {stats.settledCount} colis encaissés
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>

        {/* En attente */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                En Attente de Versement
              </p>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {stats.totalPending.toFixed(3)}{' '}
                <span className="text-xs font-normal text-muted-foreground">TND</span>
              </div>
              <p className="text-xs text-amber-700 font-medium mt-0.5">
                {stats.pendingCount} colis livrés en cours de reversement
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
                Total Colis Livrés
              </p>
              <div className="text-2xl font-black text-foreground mt-1">
                {stats.totalCount}{' '}
                <span className="text-xs font-normal text-muted-foreground">colis</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Total marchandise : {stats.totalOverallAmount.toFixed(3)} TND
              </p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center text-[#1B3D87]">
              <Banknote className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRE DE RECHERCHE ET FILTRES ── */}
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
            Cliquez sur <strong>« Afficher détails »</strong> pour voir vos colis livrés de chaque date
          </span>
        </div>

        {groupedByDay.length === 0 ? (
          <div className="text-center py-16 bg-card border rounded-lg shadow-sm">
            <Banknote className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">Aucun colis livré trouvé</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
              Vous n'avez pas de colis livrés correspondant aux filtres sélectionnés.
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
                                  ⏳ En attente de versement
                                </Badge>
                              )}
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
                          <td className="py-2.5 px-3 text-center text-xs text-muted-foreground">
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
