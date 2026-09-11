import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Clock,
  Truck,
  CheckCircle2,
  DollarSign,
  Award,
  Sparkles,
  UserPlus,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Shield,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { ClientReturnRateAnalysis } from '@/components/admin/ClientReturnRateAnalysis';
import { ROUTES } from '@/routes/paths';
import { getDbParcels, parcelToDeliveryNoteData } from '@/services/parcelsDb';
import type { Parcel } from '@/types';
import type { DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';

export const AdminDashboard: React.FC = () => {
  const [timeFilter, setTimeFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [selectedParcelForDoc, setSelectedParcelForDoc] = useState<DeliveryNoteData | null>(null);

  const loadParcels = async () => {
    setIsLoading(true);
    const { parcels: data } = await getDbParcels();
    setParcels(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadParcels();
  }, []);

  // Filter parcels according to timeFilter
  const filteredParcels = useMemo(() => {
    if (timeFilter === 'all') return parcels;

    const now = Date.now();
    let msRange = 7 * 86400000;
    if (timeFilter === 'today') msRange = 86400000;
    if (timeFilter === '30d') msRange = 30 * 86400000;

    return parcels.filter((p) => {
      const pTime = new Date(p.created_at).getTime();
      return now - pTime <= msRange;
    });
  }, [parcels, timeFilter]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredParcels.length;
    const delivered = filteredParcels.filter((p) => p.status === 'delivered').length;
    const inTransit = filteredParcels.filter((p) =>
      ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)
    ).length;
    const pending = filteredParcels.filter((p) => p.status === 'pending').length;
    const issues = filteredParcels.filter((p) =>
      ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused'].includes(p.status)
    ).length;

    const totalCOD = filteredParcels
      .filter((p) => p.status === 'delivered')
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const totalRevenue = filteredParcels
      .filter((p) => p.status === 'delivered')
      .reduce((sum, p) => sum + (p.delivery_fee || 0), 0);

    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const returnRate = total > 0 ? Number(((issues / total) * 100).toFixed(1)) : 0;

    return {
      total,
      delivered,
      inTransit,
      pending,
      issues,
      totalCOD,
      totalRevenue,
      successRate,
      returnRate,
    };
  }, [filteredParcels]);

  // Dynamic Top Drivers calculated from parcels
  const topDrivers = useMemo(() => {
    const driverMap: Record<string, { parcels: number; delivered: number; cod: number }> = {};

    parcels.forEach((p) => {
      const name = p.driver_name || 'Non assigné';
      if (!driverMap[name]) {
        driverMap[name] = { parcels: 0, delivered: 0, cod: 0 };
      }
      driverMap[name].parcels += 1;
      if (p.status === 'delivered') {
        driverMap[name].delivered += 1;
        driverMap[name].cod += p.total_amount || 0;
      }
    });

    return Object.entries(driverMap)
      .map(([name, data]) => {
        const rate = data.parcels > 0 ? Math.round((data.delivered / data.parcels) * 100) : 0;
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        return {
          name,
          initials: initials || 'DR',
          parcels: data.parcels,
          successCount: data.delivered,
          rate,
          collectedAmount: data.cod,
        };
      })
      .sort((a, b) => b.parcels - a.parcels)
      .slice(0, 4);
  }, [parcels]);

  const handleOpenDeliveryNote = (parcel: Parcel) => {
    const docData = parcelToDeliveryNoteData(parcel);
    setSelectedParcelForDoc(docData);
    setIsDocModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Tableau de Bord National
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] dark:bg-blue-900/40 dark:text-blue-300 text-xs font-bold px-2.5 py-0.5 rounded-full">
              Live DB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Supervision du dispatching, flux de colis en temps réel et performance financière ZIHAN.
          </p>
        </div>

        {/* Time Filters & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold">
            {(['today', '7d', '30d', 'all'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded-md transition-all ${
                  timeFilter === filter
                    ? 'bg-background shadow-xs text-foreground font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {filter === 'today' && "Aujourd'hui"}
                {filter === '7d' && '7 Jours'}
                {filter === '30d' && '30 Jours'}
                {filter === 'all' && 'Tout'}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadParcels}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>

          <Link to={ROUTES.ADMIN_SHIPMENTS}>
            <Button
              variant="default"
              size="sm"
              leftIcon={<Sparkles className="h-4 w-4 text-amber-300" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              + Nouveau Colis
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 5 Main KPI Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Colis sur la Période"
          value={stats.total}
          icon={<Package className="h-5 w-5 text-[#1B3D87]" />}
          description={`${stats.inTransit} en cours de livraison`}
        />
        <StatCard
          title="Taux de Livraison"
          value={`${stats.successRate}%`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/50"
          description={`${stats.delivered} livrés avec succès`}
        />
        <StatCard
          title="Taux de Retour Colis"
          value={`${stats.returnRate}%`}
          icon={<RotateCcw className="h-5 w-5 text-[#EA4E52]" />}
          iconBgColor="bg-red-50 dark:bg-red-950/50"
          description={`${stats.issues} retours / échecs`}
        />
        <StatCard
          title="Total Encaissé (COD)"
          value={`${stats.totalCOD.toFixed(3)} DT`}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/50"
          description="Encaissé en espèces"
        />
        <StatCard
          title="Chiffre d'Affaires ZIHAN"
          value={`${stats.totalRevenue.toFixed(3)} DT`}
          icon={<TrendingUp className="h-5 w-5 text-[#1B3D87]" />}
          iconBgColor="bg-blue-50 dark:bg-blue-950/50"
          description="Frais de port générés"
        />
      </div>

      {/* ── Attention Banner (Pending / Issues) ─────────────────────────────────── */}
      {(stats.pending > 0 || stats.issues > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {stats.pending > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-300">
                    {stats.pending} colis en attente de validation
                  </span>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    Assignez des livreurs pour démarrer les tournées.
                  </p>
                </div>
              </div>
              <Link to={ROUTES.ADMIN_SHIPMENTS}>
                <Button size="sm" variant="outline" className="h-7 text-xs border-amber-300 bg-white dark:bg-amber-950 text-amber-800 font-bold">
                  Assigner
                </Button>
              </Link>
            </div>
          )}

          {stats.issues > 0 && (
            <div className="flex items-center justify-between p-3.5 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800 text-xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                <div>
                  <span className="font-bold text-red-900 dark:text-red-300">
                    {stats.issues} livraisons en alerte / échec
                  </span>
                  <p className="text-[11px] text-red-700 dark:text-red-400">
                    Clients absents, retours ou adresses erronées.
                  </p>
                </div>
              </div>
              <Link to={ROUTES.ADMIN_SHIPMENTS}>
                <Button size="sm" variant="outline" className="h-7 text-xs border-red-300 bg-white dark:bg-red-950 text-red-800 font-bold">
                  Gérer
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Main Layout: Recent Parcels (Left 2 cols) + Top Drivers (Right 1 col) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Parcels Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/80 shadow-sm overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-card border-b border-border/60">
              <div>
                <CardTitle className="text-base">Derniers Colis Enregistrés</CardTitle>
                <CardDescription>Flux logistique en direct dans la base de données</CardDescription>
              </div>
              <Link to={ROUTES.ADMIN_SHIPMENTS}>
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
                      <th className="p-3 px-4">N° Suivi</th>
                      <th className="p-3">Destinataire</th>
                      <th className="p-3">Livreur</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">COD</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parcels.slice(0, 6).map((parcel) => (
                      <tr key={parcel.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                          {parcel.tracking_number}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-foreground">{parcel.recipient_name}</p>
                          <p className="text-[10px] text-muted-foreground">{parcel.recipient_governorate}</p>
                        </td>
                        <td className="p-3 font-semibold text-foreground">
                          {parcel.driver_name ? (
                            <span className="inline-flex items-center gap-1">
                              <Truck className="h-3 w-3 text-[#1B3D87]" />
                              {parcel.driver_name}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">Non assigné</span>
                          )}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={parcel.status} size="sm" />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {parcel.total_amount.toFixed(3)} DT
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeliveryNote(parcel)}
                            className="h-6 px-2 text-[11px] text-[#1B3D87] font-bold bg-blue-50/50 hover:bg-blue-100"
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
        </div>

        {/* Top Drivers & Quick Stats */}
        <div className="space-y-6">
          {/* Top Drivers Leaderboard */}
          <Card className="border-border/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base">Top Livreurs</CardTitle>
              </div>
              <Link to={ROUTES.ADMIN_USERS}>
                <Button variant="ghost" size="sm" className="text-xs font-bold text-[#1B3D87] hover:underline">
                  Équipe
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {topDrivers.map((driver, index) => (
                <div
                  key={driver.name}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-card hover:border-[#1B3D87] transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-white font-black text-xs ${
                        index === 0
                          ? 'bg-amber-500'
                          : index === 1
                          ? 'bg-slate-500'
                          : 'bg-[#1B3D87]'
                      }`}
                    >
                      {driver.initials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-tight">{driver.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {driver.successCount}/{driver.parcels} livrés ({driver.rate}%)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-[#1B3D87] dark:text-blue-400 font-mono">
                      {driver.collectedAmount.toFixed(1)} DT
                    </span>
                    <span className="block text-[9px] text-muted-foreground uppercase font-bold">Encaissé</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Shortcuts */}
          <Card className="border-border/80 shadow-sm bg-gradient-to-br from-blue-50/50 via-card to-card dark:from-blue-950/20">
            <CardContent className="p-4 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#1B3D87] dark:text-blue-400">
                Raccourcis Administrateur
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to={ROUTES.ADMIN_SHIPMENTS}
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 font-bold text-foreground flex items-center gap-2 transition-all"
                >
                  <Package className="h-4 w-4 text-[#1B3D87]" />
                  <span>Tous les Colis</span>
                </Link>
                <Link
                  to={ROUTES.ADMIN_USERS}
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 font-bold text-foreground flex items-center gap-2 transition-all"
                >
                  <UserPlus className="h-4 w-4 text-emerald-600" />
                  <span>Utilisateurs</span>
                </Link>
                <Link
                  to={ROUTES.ADMIN_ANALYTICS}
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 font-bold text-foreground flex items-center gap-2 transition-all"
                >
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span>Analytiques</span>
                </Link>
                <Link
                  to={ROUTES.PROFILE}
                  className="p-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 font-bold text-foreground flex items-center gap-2 transition-all"
                >
                  <Shield className="h-4 w-4 text-[#EA4E52]" />
                  <span>Mon Profil</span>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Client Return Rate Analysis Section (Super Admin) ────────────────── */}
      <ClientReturnRateAnalysis parcels={filteredParcels} />

      {/* Document Viewer Modal with PDF download */}
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
