import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusCircle,
  DollarSign,
  ArrowRight,
  RefreshCw,
  FileText,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { DateRangeFilter, applyDateFilter } from '@/components/admin/DateRangeFilter';
import type { QuickFilter, DateRange } from '@/components/admin/DateRangeFilter';
import { type Parcel } from '@/types';
import { getDbParcels, parcelToDeliveryNoteData, isParcelForClient } from '@/services/parcelsDb';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/routes/paths';

const RETURN_STATUSES = ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused', 'cancelled'];

export const ClientDashboardPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeFilter, setTimeFilter] = useState<QuickFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>({ from: '', to: '' });
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [selectedParcelForDoc, setSelectedParcelForDoc] = useState<DeliveryNoteData | null>(null);

  const loadParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: fetched } = await getDbParcels();
    const clientParcels = fetched.filter((p) => isParcelForClient(p, profile, user?.id));
    setParcels(clientParcels);
    setIsLoading(false);
  }, [profile, user]);

  useEffect(() => {
    loadParcels();

    const config = getActiveSupabaseConfig();
    if (config.isConfigured) {
      const client = getSupabaseClient();
      const channel = client
        .channel(`client_dashboard_parcels_${user?.id || 'client'}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'parcels' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newP = payload.new as Parcel;
              if (isParcelForClient(newP, profile, user?.id)) {
                setParcels((prev) => [newP, ...prev.filter((p) => p.id !== newP.id)]);
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedP = payload.new as Parcel;
              if (isParcelForClient(updatedP, profile, user?.id)) {
                setParcels((prev) =>
                  prev.map((p) => (p.id === updatedP.id ? { ...p, ...updatedP } : p))
                );
              }
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
  }, [loadParcels, profile, user]);

  const handleOpenDeliveryNote = (parcel: Parcel) => {
    setSelectedParcelForDoc(parcelToDeliveryNoteData(parcel));
    setIsDocModalOpen(true);
  };

  // Filter parcels according to period
  const filteredParcels = useMemo(() => {
    return applyDateFilter(parcels, timeFilter, dateRange);
  }, [parcels, timeFilter, dateRange]);

  // Client-specific statistics — strictly from client money & stock perspective
  const stats = useMemo(() => {
    const totalParcels = filteredParcels.length;

    // Delivered (Livrés & Encaissés)
    const deliveredParcels = filteredParcels.filter((p) => p.status === 'delivered');
    const deliveredCount = deliveredParcels.length;
    const deliveredGoodsAmount = deliveredParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // Pending in warehouse / deposit (En attente / En dépôt)
    const pendingParcels = filteredParcels.filter((p) => p.status === 'pending');
    const pendingCount = pendingParcels.length;
    const pendingGoodsAmount = pendingParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // In transit / out for delivery (En cours d'acheminement)
    const inTransitParcels = filteredParcels.filter((p) =>
      ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)
    );
    const inTransitCount = inTransitParcels.length;
    const inTransitGoodsAmount = inTransitParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // Total in progress / in depot not yet delivered (Argents en dépôt & en cours)
    const inDepotCount = pendingCount + inTransitCount;
    const inDepotGoodsAmount = pendingGoodsAmount + inTransitGoodsAmount;

    // Returned / failed / refused (Retours / Non livrés)
    const returnedParcels = filteredParcels.filter((p) => RETURN_STATUSES.includes(p.status));
    const returnedCount = returnedParcels.length;
    const returnedGoodsAmount = returnedParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // Total merchandise value entrusted to ZIHAN (Valeur totale confiée)
    const totalGoodsValue = filteredParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    const successRate = totalParcels > 0 ? Math.round((deliveredCount / totalParcels) * 100) : 0;
    const returnRate = totalParcels > 0 ? Number(((returnedCount / totalParcels) * 100).toFixed(1)) : 0;

    return {
      totalParcels,
      deliveredCount,
      deliveredGoodsAmount,
      pendingCount,
      pendingGoodsAmount,
      inTransitCount,
      inTransitGoodsAmount,
      inDepotCount,
      inDepotGoodsAmount,
      returnedCount,
      returnedGoodsAmount,
      returnedParcels,
      totalGoodsValue,
      successRate,
      returnRate,
    };
  }, [filteredParcels]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Client Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Tableau de Bord Client
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {profile?.company_name || profile?.full_name || 'Espace Client'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Suivi en temps réel de vos marchandises : argents livrés, fonds en dépôt, retours et livraisons en cours.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Période dans le tableau de bord client */}
          <DateRangeFilter
            activeFilter={timeFilter}
            dateRange={dateRange}
            onChange={(filter, range) => {
              setTimeFilter(filter);
              setDateRange(range);
            }}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={loadParcels}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>

          <Link to={ROUTES.CLIENT_CREATE}>
            <Button
              size="sm"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              + Nouveau Bon de Commande
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 4 Main Financial KPI Cards (With Clickable Buttons) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Argents Livrés (Encaissés) */}
        <div className="flex flex-col justify-between bg-card rounded-2xl border border-border/80 p-4 shadow-sm hover:border-emerald-400 transition-all">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-muted-foreground">Argents Livrés (Encaissés)</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#162033] dark:text-white font-mono">
              {stats.deliveredGoodsAmount.toFixed(3)} DT
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.deliveredCount} colis livrés et encaissés
            </p>
          </div>
          <Link
            to={`${ROUTES.CLIENT_SHIPMENTS}?status=delivered`}
            className="mt-3 flex items-center justify-between px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/80 hover:bg-emerald-100 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
          >
            <span>Consulter les détails</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 2: Argents en Dépôt & En Cours */}
        <div className="flex flex-col justify-between bg-card rounded-2xl border border-border/80 p-4 shadow-sm hover:border-[#1B3D87] transition-all">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-muted-foreground">Argents en Dépôt &amp; En Cours</span>
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#1B3D87] dark:text-blue-400">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#162033] dark:text-white font-mono">
              {stats.inDepotGoodsAmount.toFixed(3)} DT
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.inDepotCount} colis non encore livrés
            </p>
          </div>
          <Link
            to={`${ROUTES.CLIENT_SHIPMENTS}?status=in_transit`}
            className="mt-3 flex items-center justify-between px-3 py-1.5 text-xs font-bold text-[#1B3D87] dark:text-blue-400 bg-blue-50/80 hover:bg-blue-100 dark:bg-blue-950/40 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
          >
            <span>Consulter les détails</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 3: Rubrique Retours / Non Livrés */}
        <div className="flex flex-col justify-between bg-card rounded-2xl border border-rose-200/80 dark:border-rose-900/60 p-4 shadow-sm hover:border-rose-400 transition-all bg-gradient-to-br from-rose-50/20 to-transparent">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-rose-800 dark:text-rose-300">Rubrique Retours &amp; Échecs</span>
              <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600">
                <RotateCcw className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400 font-mono">
              {stats.returnedGoodsAmount.toFixed(3)} DT
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.returnedCount} colis en retour ({stats.returnRate}%)
            </p>
          </div>
          <Link
            to={`${ROUTES.CLIENT_SHIPMENTS}?status=returns`}
            className="mt-3 flex items-center justify-between px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 rounded-lg border border-rose-300 dark:border-rose-800 transition-colors"
          >
            <span>Consulter les retours</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 4: Total Marchandises Confiées */}
        <div className="flex flex-col justify-between bg-card rounded-2xl border border-border/80 p-4 shadow-sm hover:border-purple-400 transition-all">
          <div>
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-bold text-muted-foreground">Total Marchandises Confiées</span>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-[#162033] dark:text-white font-mono">
              {stats.totalGoodsValue.toFixed(3)} DT
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalParcels} colis ({stats.successRate}% succès)
            </p>
          </div>
          <Link
            to={`${ROUTES.CLIENT_SHIPMENTS}?status=all`}
            className="mt-3 flex items-center justify-between px-3 py-1.5 text-xs font-bold text-purple-700 dark:text-purple-400 bg-purple-50/80 hover:bg-purple-100 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors"
          >
            <span>Consulter tous les colis</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Rubrique Retours Dédiée (Si des colis sont retournés) ─────────── */}
      {stats.returnedCount > 0 && (
        <Card className="border-rose-300 dark:border-rose-900 bg-gradient-to-br from-rose-50/40 via-card to-card shadow-sm overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-rose-200/60 dark:border-rose-900/60 bg-rose-50/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-100 dark:bg-rose-950 text-rose-600 rounded-xl">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base text-rose-900 dark:text-rose-200 flex items-center gap-2">
                  Rubrique Retours &amp; Incidents de Livraison
                  <span className="bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-200 text-xs px-2 py-0.5 rounded-full font-bold">
                    {stats.returnedCount} Colis
                  </span>
                </CardTitle>
                <CardDescription className="text-rose-700/80 dark:text-rose-300/70">
                  Colis retournés, clients absents, refusés ou adresses incorrectes sur la période sélectionnée
                </CardDescription>
              </div>
            </div>
            <Link to={`${ROUTES.CLIENT_SHIPMENTS}?status=returns`}>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                className="border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 text-xs font-bold whitespace-nowrap"
              >
                Consulter les détails des retours ({stats.returnedCount}) →
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-rose-100/50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 font-bold">
                  <tr>
                    <th className="p-3 px-4">N° Suivi</th>
                    <th className="p-3">Destinataire</th>
                    <th className="p-3">Gouvernorat</th>
                    <th className="p-3">Motif / Statut</th>
                    <th className="p-3 text-right">Valeur Marchandise</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 dark:divide-rose-950/60">
                  {stats.returnedParcels.slice(0, 4).map((p) => (
                    <tr key={p.id} className="hover:bg-rose-50/50 transition-colors">
                      <td className="p-3 px-4 font-mono font-bold text-[#1B3D87] dark:text-blue-400">
                        {p.tracking_number}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {p.recipient_name}
                        <span className="block text-[10px] text-muted-foreground font-mono">{p.recipient_phone}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {p.recipient_governorate}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={p.status} size="sm" />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-rose-700 dark:text-rose-400">
                        {(p.goods_amount || 0).toFixed(3)} DT
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeliveryNote(p)}
                          className="h-6 px-2 text-[11px] text-rose-700 hover:bg-rose-100 border border-rose-200"
                        >
                          Bon PDF
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Action Card & 4-Column Breakdown ─────────────────────── */}
      <Card className="shadow-sm bg-gradient-to-br from-[#1B3D87]/5 via-card to-card border-[#1B3D87]/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-black text-[#1B3D87] dark:text-blue-400 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Expédition &amp; Bon de Commande Officiel
              </h3>
              <p className="text-xs text-muted-foreground">
                Générez instantanément votre bordereau de livraison A4 imprimable et suivez l'avancement de vos encaissements.
              </p>
            </div>
            <Link to={ROUTES.CLIENT_CREATE}>
              <Button className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold whitespace-nowrap">
                + Créer un Bon
              </Button>
            </Link>
          </div>

          {/* 4 Rubriques avec bouton cliquable vers les détails */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-border/60 text-xs">
            {/* Rubrique 1 : En Dépôt */}
            <div className="bg-card p-3.5 rounded-xl border border-border/80 flex flex-col justify-between">
              <div className="text-center">
                <span className="text-[10px] uppercase text-muted-foreground font-bold block">En Dépôt / Attente</span>
                <span className="text-lg font-black text-amber-600">{stats.pendingCount}</span>
                <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                  {stats.pendingGoodsAmount.toFixed(1)} DT
                </span>
              </div>
              <Link
                to={`${ROUTES.CLIENT_SHIPMENTS}?status=pending`}
                className="mt-2 text-center text-[10px] font-bold text-amber-700 hover:underline block pt-1 border-t border-border/40"
              >
                Détails →
              </Link>
            </div>

            {/* Rubrique 2 : En Acheminement */}
            <div className="bg-card p-3.5 rounded-xl border border-border/80 flex flex-col justify-between">
              <div className="text-center">
                <span className="text-[10px] uppercase text-muted-foreground font-bold block">En Acheminement</span>
                <span className="text-lg font-black text-[#1B3D87]">{stats.inTransitCount}</span>
                <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                  {stats.inTransitGoodsAmount.toFixed(1)} DT
                </span>
              </div>
              <Link
                to={`${ROUTES.CLIENT_SHIPMENTS}?status=in_transit`}
                className="mt-2 text-center text-[10px] font-bold text-[#1B3D87] hover:underline block pt-1 border-t border-border/40"
              >
                Détails →
              </Link>
            </div>

            {/* Rubrique 3 : Livrés & Encaissés */}
            <div className="bg-card p-3.5 rounded-xl border border-border/80 flex flex-col justify-between">
              <div className="text-center">
                <span className="text-[10px] uppercase text-muted-foreground font-bold block">Livrés &amp; Encaissés</span>
                <span className="text-lg font-black text-emerald-600">{stats.deliveredCount}</span>
                <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-0.5">
                  {stats.deliveredGoodsAmount.toFixed(1)} DT
                </span>
              </div>
              <Link
                to={`${ROUTES.CLIENT_SHIPMENTS}?status=delivered`}
                className="mt-2 text-center text-[10px] font-bold text-emerald-700 hover:underline block pt-1 border-t border-border/40"
              >
                Détails →
              </Link>
            </div>

            {/* Rubrique 4 : Retours & Échecs */}
            <div className="bg-card p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 flex flex-col justify-between">
              <div className="text-center">
                <span className="text-[10px] uppercase text-rose-700 font-bold block">Retours &amp; Non Livrés</span>
                <span className="text-lg font-black text-rose-600">{stats.returnedCount}</span>
                <span className="text-[10px] text-rose-600 font-mono font-bold block mt-0.5">
                  {stats.returnedGoodsAmount.toFixed(1)} DT
                </span>
              </div>
              <Link
                to={`${ROUTES.CLIENT_SHIPMENTS}?status=returns`}
                className="mt-2 text-center text-[10px] font-bold text-rose-700 hover:underline block pt-1 border-t border-rose-100"
              >
                Détails →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent 5 Shipments Table ─────────────────────────────────────────── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-card border-b border-border/60">
          <div>
            <CardTitle className="text-base">Dernières Expéditions</CardTitle>
            <CardDescription>Vos derniers colis enregistrés sur le réseau</CardDescription>
          </div>
          <Link to={ROUTES.CLIENT_SHIPMENTS}>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#1B3D87] hover:underline flex items-center gap-1">
              Voir tout ({filteredParcels.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="p-3 px-4">N° Suivi</th>
                  <th className="p-3">Destinataire</th>
                  <th className="p-3">Gouvernorat</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Valeur Marchandise</th>
                  <th className="p-3 text-right">Bon PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aucun colis trouvé sur la période sélectionnée.
                    </td>
                  </tr>
                ) : (
                  filteredParcels.slice(0, 5).map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                        {parcel.tracking_number}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-foreground">{parcel.recipient_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{parcel.recipient_phone}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <span className="font-semibold text-foreground">{parcel.recipient_governorate}</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={parcel.status} size="sm" />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {(parcel.goods_amount || 0).toFixed(3)} DT
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeliveryNote(parcel)}
                          leftIcon={<FileText className="h-3.5 w-3.5" />}
                          className="h-6 px-2 text-[11px] text-[#1B3D87] font-bold bg-blue-50/50 hover:bg-blue-100 border border-blue-200"
                        >
                          Bon PDF
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
