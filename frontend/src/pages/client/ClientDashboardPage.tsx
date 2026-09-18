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
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { type Parcel } from '@/types';
import { getDbParcels, parcelToDeliveryNoteData, isParcelForClient } from '@/services/parcelsDb';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/routes/paths';

export const ClientDashboardPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
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
  }, [loadParcels]);

  const handleOpenDeliveryNote = (parcel: Parcel) => {
    setSelectedParcelForDoc(parcelToDeliveryNoteData(parcel));
    setIsDocModalOpen(true);
  };

  // Client-specific statistics — strictly from client money & stock perspective
  const stats = useMemo(() => {
    const totalParcels = parcels.length;

    // Delivered (Livrés & Encaissés)
    const deliveredParcels = parcels.filter((p) => p.status === 'delivered');
    const deliveredCount = deliveredParcels.length;
    const deliveredGoodsAmount = deliveredParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // Pending in warehouse / deposit (En attente / En dépôt)
    const pendingParcels = parcels.filter((p) => p.status === 'pending');
    const pendingCount = pendingParcels.length;
    const pendingGoodsAmount = pendingParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // In transit / out for delivery (En cours d'acheminement)
    const inTransitParcels = parcels.filter((p) =>
      ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)
    );
    const inTransitCount = inTransitParcels.length;
    const inTransitGoodsAmount = inTransitParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // Total in progress / in depot not yet delivered (Argents en dépôt & en cours)
    const inDepotCount = pendingCount + inTransitCount;
    const inDepotGoodsAmount = pendingGoodsAmount + inTransitGoodsAmount;

    // Returned / failed / refused (Retours / Non livrés)
    const returnedParcels = parcels.filter((p) =>
      ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused', 'cancelled'].includes(p.status)
    );
    const returnedCount = returnedParcels.length;
    const returnedGoodsAmount = returnedParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    // Total merchandise value entrusted to ZIHAN (Valeur totale confiée)
    const totalGoodsValue = parcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);

    const successRate = totalParcels > 0 ? Math.round((deliveredCount / totalParcels) * 100) : 0;

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
      totalGoodsValue,
      successRate,
    };
  }, [parcels]);

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
            Suivi en temps réel de vos marchandises : argents livrés, fonds en dépôt et livraisons en cours.
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

      {/* ── 4 Main Financial KPI Cards (Client Perspective) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Argents Livrés (Encaissés) */}
        <StatCard
          title="Argents Livrés (Encaissés)"
          value={`${stats.deliveredGoodsAmount.toFixed(3)} DT`}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/50"
          description={`${stats.deliveredCount} colis livrés et encaissés`}
        />

        {/* Card 2: Argents en Dépôt & En Cours */}
        <StatCard
          title="Argents en Dépôt & En Cours"
          value={`${stats.inDepotGoodsAmount.toFixed(3)} DT`}
          icon={<Clock className="h-5 w-5 text-[#1B3D87]" />}
          iconBgColor="bg-blue-50 dark:bg-blue-950/50"
          description={`${stats.inDepotCount} colis non encore livrés`}
        />

        {/* Card 3: Argents Non Livrés / Retours */}
        <StatCard
          title="Argents Non Livrés / Retours"
          value={`${stats.returnedGoodsAmount.toFixed(3)} DT`}
          icon={<RotateCcw className="h-5 w-5 text-amber-600" />}
          iconBgColor="bg-amber-50 dark:bg-amber-950/50"
          description={`${stats.returnedCount} colis retours ou incidents`}
        />

        {/* Card 4: Total Marchandises Confiées */}
        <StatCard
          title="Total Marchandises Confiées"
          value={`${stats.totalGoodsValue.toFixed(3)} DT`}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          iconBgColor="bg-purple-50 dark:bg-purple-950/50"
          description={`${stats.totalParcels} colis au total (${stats.successRate}% succès)`}
        />
      </div>

      {/* ── Quick Action Card ─────────────────────────────── */}
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

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/60 text-xs">
            <div className="bg-card p-3.5 rounded-xl border border-border/80 text-center">
              <span className="text-[10px] uppercase text-muted-foreground font-bold block">En Dépôt / Attente</span>
              <span className="text-lg font-black text-amber-600">{stats.pendingCount}</span>
              <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                {stats.pendingGoodsAmount.toFixed(1)} DT
              </span>
            </div>
            <div className="bg-card p-3.5 rounded-xl border border-border/80 text-center">
              <span className="text-[10px] uppercase text-muted-foreground font-bold block">En Acheminement</span>
              <span className="text-lg font-black text-[#1B3D87]">{stats.inTransitCount}</span>
              <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                {stats.inTransitGoodsAmount.toFixed(1)} DT
              </span>
            </div>
            <div className="bg-card p-3.5 rounded-xl border border-border/80 text-center">
              <span className="text-[10px] uppercase text-muted-foreground font-bold block">Livrés &amp; Encaissés</span>
              <span className="text-lg font-black text-emerald-600">{stats.deliveredCount}</span>
              <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-0.5">
                {stats.deliveredGoodsAmount.toFixed(1)} DT
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Recent 5 Shipments Table ─────────────────────────────────────────── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-card border-b border-border/60">
          <div>
            <CardTitle className="text-base">Dernières Expéditions</CardTitle>
            <CardDescription>Vos 5 derniers colis enregistrés sur le réseau</CardDescription>
          </div>
          <Link to={ROUTES.CLIENT_SHIPMENTS}>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#1B3D87] hover:underline flex items-center gap-1">
              Voir tout ({parcels.length}) <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="py-3 px-4">N° Suivi</th>
                  <th className="py-3">Destinataire</th>
                  <th className="py-3">Gouvernorat</th>
                  <th className="py-3">Statut</th>
                  <th className="py-3 text-right">Valeur Marchandise</th>
                  <th className="py-3 text-right">Bon PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      Aucun colis expédié pour le moment.
                    </td>
                  </tr>
                ) : (
                  parcels.slice(0, 5).map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                        {parcel.tracking_number}
                      </td>
                      <td className="py-3">
                        <p className="font-bold text-foreground">{parcel.recipient_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{parcel.recipient_phone}</p>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        <span className="font-semibold text-foreground">{parcel.recipient_governorate}</span>
                        {parcel.recipient_delegation && ` • ${parcel.recipient_delegation}`}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={parcel.status} size="sm" />
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {(parcel.goods_amount || 0).toFixed(3)} DT
                      </td>
                      <td className="py-3 text-right">
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
