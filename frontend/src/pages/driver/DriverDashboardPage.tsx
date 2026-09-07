import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getDbParcels } from '@/services/parcelsDb';
import type { Parcel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/routes/paths';

export const DriverDashboardPage: React.FC = () => {
  const { profile } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDriverParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: allParcels } = await getDbParcels();
    const driverName = profile?.full_name || 'Karim Mansouri';

    const assigned = allParcels.filter(
      (p) =>
        p.driver_name?.trim().toLowerCase() === driverName.trim().toLowerCase() &&
        !['pending', 'cancelled'].includes(p.status.toLowerCase())
    );

    setParcels(assigned);
    setIsLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchDriverParcels();
  }, [fetchDriverParcels]);

  // Statistics calculation for the driver
  const stats = useMemo(() => {
    const total = parcels.length;
    const delivered = parcels.filter((p) => p.status === 'delivered');
    const deliveredCount = delivered.length;
    const activeCount = parcels.filter((p) => !['delivered', 'returned', 'refused'].includes(p.status)).length;
    const issuesCount = parcels.filter((p) => ['returned', 'refused', 'wrong_address', 'customer_absent'].includes(p.status)).length;

    // Financials
    const totalGoodsAmount = parcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);
    const totalDeliveryFees = parcels.reduce((sum, p) => sum + (p.delivery_fee || 0), 0);
    const totalCOD = parcels
      .filter((p) => !['returned', 'refused'].includes(p.status))
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const collectedCOD = delivered.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const remainingCOD = totalCOD - collectedCOD;

    const rate = total > 0 ? Math.round((deliveredCount / total) * 100) : 0;

    return {
      total,
      deliveredCount,
      activeCount,
      issuesCount,
      totalGoodsAmount,
      totalDeliveryFees,
      totalCOD,
      collectedCOD,
      remainingCOD,
      rate,
    };
  }, [parcels]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Driver Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Tableau de Bord Livreur
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {profile?.full_name || 'Karim Mansouri'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {profile?.vehicle ? `Véhicule: ${profile.vehicle} • ` : ''}Secteur: {profile?.zone || 'Grand Tunis — Ben Arous'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDriverParcels}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>

          <Link to={ROUTES.DRIVER_TOUR}>
            <Button
              size="sm"
              leftIcon={<Truck className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              Lancer Ma Tournée ({stats.activeCount})
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 4 Main KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Colis Assignés"
          value={stats.total}
          icon={<Package className="h-5 w-5 text-[#1B3D87]" />}
          description={`${stats.activeCount} restants à distribuer`}
        />
        <StatCard
          title="Taux de Complétion"
          value={`${stats.rate}%`}
          icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/50"
          description={`${stats.deliveredCount}/${stats.total} livrés aujourd'hui`}
        />
        <StatCard
          title="Encaissé en Espèces"
          value={`${stats.collectedCOD.toFixed(3)} DT`}
          icon={<DollarSign className="h-5 w-5 text-emerald-600" />}
          iconBgColor="bg-emerald-50 dark:bg-emerald-950/50"
          description="Montant liquide en caisse"
        />
        <StatCard
          title="Reste à Encaisser (COD)"
          value={`${stats.remainingCOD.toFixed(3)} DT`}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          iconBgColor="bg-amber-50 dark:bg-amber-950/50"
          description="Sur les colis en attente"
        />
      </div>

      {/* ── Financial Breakdown & Progress ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Progress Card */}
        <Card className="md:col-span-2 shadow-sm bg-gradient-to-br from-[#1B3D87] to-[#15316E] text-white border-0">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-200 font-bold">Progression de la Tournée</span>
                <h3 className="text-2xl font-black mt-0.5">{stats.deliveredCount} sur {stats.total} Colis Livrés</h3>
              </div>
              <span className="text-3xl font-black text-amber-300 font-mono">{stats.rate}%</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${stats.rate}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-xs">
              <div>
                <span className="text-white/70 text-[10px] block uppercase font-bold">À Distribuer</span>
                <span className="text-lg font-black text-amber-300">{stats.activeCount} colis</span>
              </div>
              <div>
                <span className="text-white/70 text-[10px] block uppercase font-bold">Livrés Réussis</span>
                <span className="text-lg font-black text-emerald-300">{stats.deliveredCount} colis</span>
              </div>
              <div>
                <span className="text-white/70 text-[10px] block uppercase font-bold">Retours / Alertes</span>
                <span className="text-lg font-black text-rose-300">{stats.issuesCount} colis</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Recap Box */}
        <Card className="shadow-sm">
          <CardContent className="p-5 space-y-3">
            <h4 className="text-xs font-black text-[#1B3D87] uppercase tracking-wider">
              Récapitulatif Financier
            </h4>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-border flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">Valeur Marchandises</p>
                  <p className="text-[10px] text-muted-foreground">Articles transportés</p>
                </div>
                <span className="font-black text-sm text-foreground font-mono">{stats.totalGoodsAmount.toFixed(3)} DT</span>
              </div>

              <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex justify-between items-center">
                <div>
                  <p className="font-bold text-[#1B3D87] dark:text-blue-300">Total COD Tournée</p>
                  <p className="text-[10px] text-muted-foreground">Articles + Frais</p>
                </div>
                <span className="font-black text-sm text-[#1B3D87] font-mono">{stats.totalCOD.toFixed(3)} DT</span>
              </div>
            </div>

            <Link to={ROUTES.DRIVER_TOUR} className="block pt-1">
              <Button className="w-full bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold text-xs">
                Ouvrir la Tournée en Direct
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── Active Tour List (Top 5) ────────────────────────────────────────── */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-card border-b border-border/60">
          <div>
            <CardTitle className="text-base">Prochaines Livraisons de la Tournée</CardTitle>
            <CardDescription>Colis à livrer en priorité</CardDescription>
          </div>
          <Link to={ROUTES.DRIVER_TOUR}>
            <Button variant="ghost" size="sm" className="text-xs font-bold text-[#1B3D87] hover:underline flex items-center gap-1">
              Voir toute la tournée ({stats.activeCount}) <ArrowRight className="h-3.5 w-3.5" />
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
                  <th className="py-3">Adresse &amp; Ville</th>
                  <th className="py-3">Statut</th>
                  <th className="py-3 text-right">À Encaisser</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parcels.filter(p => !['delivered', 'returned'].includes(p.status)).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      🎉 Tous les colis assignés ont été traités pour cette tournée !
                    </td>
                  </tr>
                ) : (
                  parcels
                    .filter(p => !['delivered', 'returned'].includes(p.status))
                    .slice(0, 5)
                    .map((parcel) => (
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
                        <td className="py-3 text-right font-mono font-bold text-foreground">
                          {parcel.total_amount.toFixed(3)} DT
                        </td>
                        <td className="py-3 text-right">
                          <Link to={ROUTES.DRIVER_TOUR}>
                            <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-bold text-[#1B3D87] border-blue-200">
                              Détail
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
