import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart2,
  Package,
  Truck,
  CheckCircle2,
  TrendingUp,
  MapPin,
  DollarSign,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getDbParcels } from '@/services/parcelsDb';
import type { Parcel } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
}

export const AdminAnalyticsPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const { parcels: data } = await getDbParcels();
      setParcels(data);
      setIsLoading(false);
    };
    load();
  }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = parcels.length;
    const delivered = parcels.filter((p) => p.status === 'delivered').length;
    const pending = parcels.filter((p) => p.status === 'pending').length;
    const inTransit = parcels.filter((p) =>
      ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)
    ).length;
    const issues = parcels.filter((p) =>
      ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused'].includes(p.status)
    ).length;
    const totalRevenue = parcels
      .filter((p) => p.status === 'delivered')
      .reduce((s, p) => s + (p.delivery_fee || 0), 0);
    const totalCOD = parcels
      .filter((p) => p.status === 'delivered')
      .reduce((s, p) => s + (p.total_amount || 0), 0);
    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;

    return { total, delivered, pending, inTransit, issues, totalRevenue, totalCOD, deliveryRate };
  }, [parcels]);

  // ── Colis par jour (7 derniers jours) ────────────────────────────────────
  const last7Days = getLast7Days();
  const colisParJour = useMemo(() => {
    return last7Days.map((day) => ({
      day,
      label: formatDay(day),
      count: parcels.filter((p) => p.created_at?.startsWith(day)).length,
    }));
  }, [parcels, last7Days]);

  const maxCount = Math.max(...colisParJour.map((d) => d.count), 1);

  // ── Top Livreurs ─────────────────────────────────────────────────────────
  const topDrivers = useMemo(() => {
    const map: Record<string, { total: number; delivered: number }> = {};
    parcels.forEach((p) => {
      const name = p.driver_name || 'Non assigné';
      if (!map[name]) map[name] = { total: 0, delivered: 0 };
      map[name].total += 1;
      if (p.status === 'delivered') map[name].delivered += 1;
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        total: v.total,
        delivered: v.delivered,
        rate: v.total > 0 ? Math.round((v.delivered / v.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [parcels]);

  // ── Top Gouvernorats ──────────────────────────────────────────────────────
  const topGovs = useMemo(() => {
    const map: Record<string, number> = {};
    parcels.forEach((p) => {
      const g = p.recipient_governorate || 'Inconnu';
      map[g] = (map[g] || 0) + 1;
    });
    const total = parcels.length || 1;
    return Object.entries(map)
      .map(([gov, count]) => ({ gov, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [parcels]);

  // ── Status Distribution ───────────────────────────────────────────────────
  const statusDist = useMemo(() => {
    const groups = [
      { label: 'En attente', statuses: ['pending'], color: 'bg-amber-400' },
      { label: 'En cours', statuses: ['accepted', 'assigned', 'picked_up', 'in_transit'], color: 'bg-[#1B3D87]' },
      { label: 'Livré', statuses: ['delivered'], color: 'bg-emerald-500' },
      { label: 'Retour/Echec', statuses: ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused', 'cancelled'], color: 'bg-[#EA4E52]' },
    ];
    const total = parcels.length || 1;
    return groups.map((g) => ({
      ...g,
      count: parcels.filter((p) => g.statuses.includes(p.status)).length,
      pct: Math.round((parcels.filter((p) => g.statuses.includes(p.status)).length / total) * 100),
    }));
  }, [parcels]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground animate-pulse">
        Chargement des analytiques...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
            Analytiques &amp; Performances
          </h1>
          <span className="bg-[#1B3D87]/10 text-[#1B3D87] text-xs font-bold px-2.5 py-0.5 rounded-full">
            {parcels.length} colis analysés
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vue d'ensemble des performances opérationnelles ZIHAN en temps réel.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-[#1B3D87] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Colis</p>
              <p className="text-2xl font-black text-foreground">{stats.total}</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-[#1B3D87]">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Taux de Livraison</p>
              <p className="text-2xl font-black text-emerald-600">{stats.deliveryRate}%</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">En cours</p>
              <p className="text-2xl font-black text-amber-600">{stats.inTransit}</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#EA4E52] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Revenus Livraison</p>
              <p className="text-xl font-black text-foreground">{stats.totalRevenue.toFixed(1)} <span className="text-xs font-bold text-muted-foreground">DT</span></p>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 rounded-xl text-[#EA4E52]">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar Chart — Colis par jour */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="h-4 w-4 text-[#1B3D87]" />
              <h3 className="text-sm font-black text-foreground">Colis créés — 7 derniers jours</h3>
            </div>
            <div className="flex items-end gap-2 h-32">
              {colisParJour.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-[#1B3D87]">
                    {d.count > 0 ? d.count : ''}
                  </span>
                  <div className="w-full flex flex-col justify-end" style={{ height: '96px' }}>
                    <div
                      className="w-full rounded-t-md bg-[#1B3D87] transition-all duration-500"
                      style={{
                        height: `${Math.max((d.count / maxCount) * 96, d.count > 0 ? 6 : 2)}px`,
                        opacity: d.count > 0 ? 1 : 0.2,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium truncate w-full text-center">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-4 w-4 text-[#1B3D87]" />
              <h3 className="text-sm font-black text-foreground">Répartition par statut</h3>
            </div>
            <div className="space-y-3">
              {statusDist.map((s) => (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className={`h-2 w-2 rounded-full ${s.color}`} />
                      <span className="font-semibold text-foreground">{s.label}</span>
                    </div>
                    <span className="font-black text-foreground">{s.count}</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${s.color}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">{s.pct}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Drivers */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="h-4 w-4 text-[#1B3D87]" />
              <h3 className="text-sm font-black text-foreground">Top Livreurs</h3>
            </div>
            {topDrivers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucun livreur assigné encore.</p>
            ) : (
              <div className="space-y-2">
                {topDrivers.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3 py-1.5 border-b border-border/40 last:border-0">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black text-white shrink-0 ${
                      i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-[#1B3D87]/60'
                    }`}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{d.name}</p>
                      <p className="text-[11px] text-muted-foreground">{d.delivered}/{d.total} livrés</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-black ${d.rate >= 80 ? 'text-emerald-600' : d.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                        {d.rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Gouvernorats */}
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-4 w-4 text-[#EA4E52]" />
              <h3 className="text-sm font-black text-foreground">Gouvernorats les + actifs</h3>
            </div>
            {topGovs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Aucune donnée disponible.</p>
            ) : (
              <div className="space-y-2">
                {topGovs.map((g) => (
                  <div key={g.gov} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{g.gov}</span>
                      <span className="font-black text-foreground">{g.count} <span className="text-[10px] text-muted-foreground font-normal">colis</span></span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#EA4E52] transition-all duration-700"
                        style={{ width: `${g.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts Section */}
      {(stats.pending > 0 || stats.issues > 0) && (
        <Card className="shadow-sm border-amber-200 dark:border-amber-800">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-black text-amber-700 dark:text-amber-400">Points d'attention</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.pending > 0 && (
                <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">{stats.pending} colis en attente</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">Ces colis nécessitent une validation admin.</p>
                  </div>
                </div>
              )}
              {stats.issues > 0 && (
                <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-800 dark:text-red-300">{stats.issues} livraisons en échec</p>
                    <p className="text-[11px] text-red-700 dark:text-red-400">Retours, refus ou adresses incorrectes.</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
