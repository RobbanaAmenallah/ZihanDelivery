import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Search,
  RefreshCw,
  Phone,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Banknote,
  Calendar,
  Filter,
  Download,
  ChevronRight,
  PlusCircle,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { getDbUsers, createDbUser } from '@/services/usersDb';
import { getDbParcels } from '@/services/parcelsDb';
import type { UserProfile, Parcel, ParcelStatus } from '@/types';

type PeriodFilter = 'all' | 'today' | 'week' | 'month';
type DriverStatusFilter = 'all' | 'active_tour' | 'available' | 'inactive';

interface DriverStats {
  driver: UserProfile;
  totalAssigned: number;
  deliveredCount: number;
  inTransitCount: number;
  failedCount: number;
  returnedCount: number;
  totalCollectedCOD: number;
  totalPendingCOD: number;
  completionRate: number;
  parcels: Parcel[];
}

export const AdminDriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<UserProfile[]>([]);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<DriverStatusFilter>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Selected driver for parcel details modal
  const [selectedDriverStats, setSelectedDriverStats] = useState<DriverStats | null>(null);
  const [isTourModalOpen, setIsTourModalOpen] = useState<boolean>(false);
  const [tourParcelSearch, setTourParcelSearch] = useState<string>('');
  const [tourStatusFilter, setTourStatusFilter] = useState<string>('all');

  // New Driver Modal
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState<boolean>(false);
  const [newDriverForm, setNewDriverForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    zone: 'Grand Tunis',
    vehicle: 'Scooter',
  });
  const [isCreatingDriver, setIsCreatingDriver] = useState<boolean>(false);
  const [newDriverError, setNewDriverError] = useState<string | null>(null);

  // ── 1. Load Data ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ users }, { parcels: allParcels }] = await Promise.all([
        getDbUsers(),
        getDbParcels(),
      ]);
      const driverProfiles = (users || []).filter((u) => u.role === 'driver');
      setDrivers(driverProfiles);
      setParcels(allParcels || []);
    } catch (err) {
      console.error('Erreur chargement données livreurs:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── 2. Filter parcels by period ──────────────────────────────────────────
  const filterParcelByPeriod = useCallback(
    (p: Parcel) => {
      if (periodFilter === 'all') return true;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const targetDate = p.status_updated_at || p.created_at || '';

      if (periodFilter === 'today') {
        return targetDate.startsWith(todayStr);
      }
      if (periodFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return new Date(targetDate) >= weekAgo;
      }
      if (periodFilter === 'month') {
        const d = new Date(targetDate);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    },
    [periodFilter]
  );

  // ── 3. Compute Stats for each Driver ──────────────────────────────────────
  const driverStatsList = useMemo<DriverStats[]>(() => {
    const periodParcels = parcels.filter(filterParcelByPeriod);

    return drivers.map((driver) => {
      // Find parcels assigned to this driver by driver_id or driver_name
      const driverParcels = periodParcels.filter((p) => {
        if (p.driver_id && p.driver_id === driver.id) return true;
        if (p.driver_name && driver.full_name) {
          return p.driver_name.trim().toLowerCase() === driver.full_name.trim().toLowerCase();
        }
        return false;
      });

      const totalAssigned = driverParcels.length;
      const deliveredParcels = driverParcels.filter((p) => p.status === 'delivered');
      const deliveredCount = deliveredParcels.length;

      const inTransitCount = driverParcels.filter((p) =>
        ['assigned', 'picked_up', 'in_transit', 'contacted', 'rescheduled'].includes(p.status)
      ).length;

      const failedCount = driverParcels.filter((p) =>
        ['customer_absent', 'wrong_address', 'failed'].includes(p.status)
      ).length;

      const returnedCount = driverParcels.filter((p) =>
        ['returned', 'refused', 'cancelled'].includes(p.status)
      ).length;

      const totalCollectedCOD = deliveredParcels.reduce(
        (sum, p) => sum + (Number(p.total_amount) || 0),
        0
      );

      const totalPendingCOD = driverParcels
        .filter((p) => p.status !== 'delivered' && p.status !== 'returned' && p.status !== 'cancelled')
        .reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);

      const completionRate =
        totalAssigned > 0 ? Math.round((deliveredCount / totalAssigned) * 100) : 0;

      return {
        driver,
        totalAssigned,
        deliveredCount,
        inTransitCount,
        failedCount,
        returnedCount,
        totalCollectedCOD,
        totalPendingCOD,
        completionRate,
        parcels: driverParcels,
      };
    });
  }, [drivers, parcels, filterParcelByPeriod]);

  // ── 4. Global Fleet KPIs ──────────────────────────────────────────────────
  const fleetKPIs = useMemo(() => {
    const totalDrivers = drivers.length;
    const activeDrivers = drivers.filter((d) => d.is_active).length;
    const driversInTour = driverStatsList.filter((ds) => ds.inTransitCount > 0).length;

    let totalParcelsAssigned = 0;
    let totalDelivered = 0;
    let totalInTransit = 0;
    let totalIssues = 0;
    let totalCODCollected = 0;

    driverStatsList.forEach((ds) => {
      totalParcelsAssigned += ds.totalAssigned;
      totalDelivered += ds.deliveredCount;
      totalInTransit += ds.inTransitCount;
      totalIssues += ds.failedCount + ds.returnedCount;
      totalCODCollected += ds.totalCollectedCOD;
    });

    const fleetCompletionRate =
      totalParcelsAssigned > 0
        ? Math.round((totalDelivered / totalParcelsAssigned) * 100)
        : 0;

    return {
      totalDrivers,
      activeDrivers,
      driversInTour,
      totalParcelsAssigned,
      totalDelivered,
      totalInTransit,
      totalIssues,
      totalCODCollected,
      fleetCompletionRate,
    };
  }, [drivers, driverStatsList]);

  // ── 5. Distinct Zones ─────────────────────────────────────────────────────
  const availableZones = useMemo(() => {
    const zones = new Set<string>();
    drivers.forEach((d) => {
      if (d.zone) zones.add(d.zone);
    });
    return Array.from(zones);
  }, [drivers]);

  // ── 6. Filtered Driver Stats ──────────────────────────────────────────────
  const filteredDriverStats = useMemo(() => {
    return driverStatsList.filter((ds) => {
      const d = ds.driver;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = d.full_name?.toLowerCase().includes(q);
        const matchPhone = d.phone?.includes(q);
        const matchZone = d.zone?.toLowerCase().includes(q);
        const matchVehicle = d.vehicle?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchZone && !matchVehicle) return false;
      }

      // Zone filter
      if (zoneFilter !== 'all' && d.zone !== zoneFilter) {
        return false;
      }

      // Driver status filter
      if (statusFilter === 'active_tour' && ds.inTransitCount === 0) return false;
      if (statusFilter === 'available' && (ds.inTransitCount > 0 || !d.is_active)) return false;
      if (statusFilter === 'inactive' && d.is_active) return false;

      return true;
    });
  }, [driverStatsList, searchQuery, zoneFilter, statusFilter]);

  // ── 7. Handle Create Driver ───────────────────────────────────────────────
  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewDriverError(null);

    if (!newDriverForm.full_name || !newDriverForm.phone || !newDriverForm.email || !newDriverForm.password) {
      setNewDriverError('Veuillez renseigner tous les champs obligatoires (*)');
      return;
    }

    setIsCreatingDriver(true);
    try {
      const { user: created, error } = await createDbUser({
        full_name: newDriverForm.full_name,
        phone: newDriverForm.phone,
        email: newDriverForm.email,
        password: newDriverForm.password,
        role: 'driver',
        zone: newDriverForm.zone,
        vehicle: newDriverForm.vehicle,
      });

      if (error) {
        setNewDriverError(error);
        return;
      }

      if (created) {
        setDrivers((prev) => [created, ...prev]);
        setIsNewDriverModalOpen(false);
        setNewDriverForm({
          full_name: '',
          phone: '',
          email: '',
          password: '',
          zone: 'Grand Tunis',
          vehicle: 'Scooter',
        });
      }
    } catch (err) {
      setNewDriverError((err as Error).message);
    } finally {
      setIsCreatingDriver(false);
    }
  };

  // ── 8. Export CSV ─────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (driverStatsList.length === 0) {
      alert('Aucune donnée livreur à exporter.');
      return;
    }

    const headers = [
      'Nom Livreur',
      'Téléphone',
      'Email',
      'Zone / Secteur',
      'Véhicule',
      'Statut Compte',
      'Colis Assignés',
      'Colis Livrés',
      'Taux Succès (%)',
      'Colis en Cours',
      'Colis Échoués / Retours',
      'Total Encaissé COD (TND)',
      'Total Restant COD (TND)',
    ];

    const rows = driverStatsList.map((ds) => [
      `"${ds.driver.full_name}"`,
      `"${ds.driver.phone}"`,
      `"${ds.driver.email || ''}"`,
      `"${ds.driver.zone || ''}"`,
      `"${ds.driver.vehicle || ''}"`,
      ds.driver.is_active ? 'Actif' : 'Inactif',
      ds.totalAssigned,
      ds.deliveredCount,
      `${ds.completionRate}%`,
      ds.inTransitCount,
      ds.failedCount + ds.returnedCount,
      ds.totalCollectedCOD.toFixed(3),
      ds.totalPendingCOD.toFixed(3),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Flotte_Livreurs_ZIHAN_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // ── 9. Filter parcels inside Tour Modal ───────────────────────────────────
  const filteredTourParcels = useMemo(() => {
    if (!selectedDriverStats) return [];
    return selectedDriverStats.parcels.filter((p) => {
      if (tourParcelSearch.trim()) {
        const q = tourParcelSearch.toLowerCase();
        const matchTrack = p.tracking_number.toLowerCase().includes(q);
        const matchRecip = p.recipient_name.toLowerCase().includes(q);
        const matchPhone = p.recipient_phone.includes(q);
        const matchAddress = p.recipient_address.toLowerCase().includes(q);
        if (!matchTrack && !matchRecip && !matchPhone && !matchAddress) return false;
      }

      if (tourStatusFilter === 'delivered' && p.status !== 'delivered') return false;
      if (
        tourStatusFilter === 'in_transit' &&
        !['assigned', 'picked_up', 'in_transit', 'contacted', 'rescheduled'].includes(p.status)
      ) {
        return false;
      }
      if (
        tourStatusFilter === 'issues' &&
        !['customer_absent', 'wrong_address', 'failed', 'returned', 'refused', 'cancelled'].includes(p.status)
      ) {
        return false;
      }

      return true;
    });
  }, [selectedDriverStats, tourParcelSearch, tourStatusFilter]);

  const getStatusBadge = (status: ParcelStatus) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">✓ Livré</Badge>;
      case 'in_transit':
      case 'assigned':
      case 'picked_up':
      case 'contacted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold">🚚 En cours</Badge>;
      case 'returned':
      case 'refused':
        return <Badge className="bg-purple-100 text-purple-800 border-purple-300 font-bold">↩ Retour</Badge>;
      case 'wrong_address':
      case 'customer_absent':
      case 'failed':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold">⚠️ Échec</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#1B3D87]/10 text-[#1B3D87] dark:bg-blue-900/30 dark:text-blue-300 rounded-xl">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                Gestion des Livreurs &amp; Flotte
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Pilotage en direct des tournées, performances de livraison et encaissements COD par livreur.
              </p>
            </div>
          </div>
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
            leftIcon={<Download className="h-4 w-4" />}
            className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
          >
            Exporter Stats
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setIsNewDriverModalOpen(true)}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
          >
            + Nouveau Livreur
          </Button>
        </div>
      </div>

      {/* ── KPI STATS CARDS (CHIFFRES & VISUELS) ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Livreurs */}
        <Card className="border-l-4 border-l-[#1B3D87] shadow-sm bg-card hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Total Livreurs
              </p>
              <p className="text-2xl font-black text-foreground mt-1">
                {fleetKPIs.totalDrivers}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-semibold text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {fleetKPIs.driversInTour} en tournée active
              </div>
            </div>
            <div className="p-2.5 bg-[#1B3D87]/10 text-[#1B3D87] rounded-xl">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Colis Assignés */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-card hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Colis Assignés
              </p>
              <p className="text-2xl font-black text-foreground mt-1">
                {fleetKPIs.totalParcelsAssigned}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1.5">
                {fleetKPIs.totalInTransit} en cours de route
              </p>
            </div>
            <div className="p-2.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-xl">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Colis Livrés */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-card hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Colis Livrés
              </p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {fleetKPIs.totalDelivered}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px] font-bold text-emerald-700">
                <span>Taux de succès :</span>
                <span className="px-1.5 py-0.2 bg-emerald-100 rounded text-emerald-800">
                  {fleetKPIs.fleetCompletionRate}%
                </span>
              </div>
            </div>
            <div className="p-2.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-xl">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total COD Encaissé */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-card hover:shadow-md transition">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                COD Encaissé
              </p>
              <p className="text-2xl font-black text-[#1B3D87] mt-1">
                {fleetKPIs.totalCODCollected.toFixed(3)}{' '}
                <span className="text-xs font-bold text-muted-foreground">DT</span>
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1.5">
                Fonds perçus par l'équipe
              </p>
            </div>
            <div className="p-2.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-xl">
              <Banknote className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Retours & Incidents */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm bg-card hover:shadow-md transition col-span-2 sm:col-span-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Retours &amp; Échecs
              </p>
              <p className="text-2xl font-black text-rose-600 mt-1">
                {fleetKPIs.totalIssues}
              </p>
              <p className="text-[11px] font-medium text-muted-foreground mt-1.5">
                À réassigner ou clôturer
              </p>
            </div>
            <div className="p-2.5 bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 rounded-xl">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── BARRE DE RECHERCHE & FILTRES ────────────────────────────────────── */}
      <Card className="shadow-xs border-border/80">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Recherche */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom de livreur, téléphone, véhicule ou zone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            {/* Toggle View Mode */}
            <div className="flex items-center gap-1 border rounded-lg p-1 bg-muted/20 shrink-0">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  viewMode === 'cards'
                    ? 'bg-white shadow-xs text-[#1B3D87]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Vue Grille / Cartes
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white shadow-xs text-[#1B3D87]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Vue Tableau
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
            {/* Période */}
            <span className="font-bold text-muted-foreground flex items-center gap-1 mr-1">
              <Calendar className="w-3.5 h-3.5" /> Période :
            </span>
            {(['all', 'today', 'week', 'month'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodFilter(p)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  periodFilter === p
                    ? 'bg-[#1B3D87] text-white shadow-xs'
                    : 'bg-muted/40 hover:bg-muted text-muted-foreground'
                }`}
              >
                {p === 'all' && 'Toutes les périodes'}
                {p === 'today' && "Aujourd'hui"}
                {p === 'week' && '7 derniers jours'}
                {p === 'month' && 'Ce mois-ci'}
              </button>
            ))}

            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

            {/* Statut Tournée */}
            <span className="font-bold text-muted-foreground flex items-center gap-1 mr-1 ml-auto sm:ml-0">
              <Filter className="w-3.5 h-3.5" /> Statut :
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DriverStatusFilter)}
              className="px-2.5 py-1 border rounded-md text-xs bg-card font-medium text-foreground focus:ring-1 focus:ring-primary"
            >
              <option value="all">Tous les livreurs</option>
              <option value="active_tour">🚚 En tournée active</option>
              <option value="available">🟢 Disponibles</option>
              <option value="inactive">🔴 Inactifs</option>
            </select>

            {/* Zone */}
            {availableZones.length > 0 && (
              <select
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
                className="px-2.5 py-1 border rounded-md text-xs bg-card font-medium text-foreground focus:ring-1 focus:ring-primary"
              >
                <option value="all">Toutes les zones</option>
                {availableZones.map((z) => (
                  <option key={z} value={z}>
                    📍 {z}
                  </option>
                ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── LISTE DES LIVREURS ─────────────────────────────────────────────── */}
      {filteredDriverStats.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Truck className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">Aucun livreur trouvé</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Aucun livreur ne correspond à vos filtres actuels. Modifiez votre recherche ou ajoutez un nouveau livreur.
          </p>
        </Card>
      ) : viewMode === 'cards' ? (
        /* ── VUE GRILLE / CARTES ─────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDriverStats.map((ds) => {
            const d = ds.driver;
            const inTour = ds.inTransitCount > 0;
            const initials = (d.full_name || 'ZI')
              .split(' ')
              .map((w) => w[0])
              .join('')
              .slice(0, 2)
              .toUpperCase();

            return (
              <Card
                key={d.id}
                className="hover:shadow-lg transition-all duration-200 border-border/80 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Card Header */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900 border-b border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative">
                          <div className="w-11 h-11 rounded-full bg-[#1B3D87] text-white flex items-center justify-center font-black text-sm shadow-xs">
                            {initials}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                              !d.is_active
                                ? 'bg-slate-400'
                                : inTour
                                ? 'bg-emerald-500 animate-pulse'
                                : 'bg-blue-400'
                            }`}
                            title={
                              !d.is_active
                                ? 'Inactif'
                                : inTour
                                ? 'En tournée'
                                : 'Disponible'
                            }
                          />
                        </div>

                        <div>
                          <h3 className="font-bold text-base text-foreground leading-tight">
                            {d.full_name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {d.zone && (
                              <span className="flex items-center gap-1 font-semibold text-foreground/80">
                                <MapPin className="w-3 h-3 text-[#1B3D87]" /> {d.zone}
                              </span>
                            )}
                            {d.vehicle && (
                              <span>• {d.vehicle}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      {!d.is_active ? (
                        <Badge variant="outline" className="text-slate-500 border-slate-300">
                          Inactif
                        </Badge>
                      ) : inTour ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                          🚚 En Tournée ({ds.inTransitCount})
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[11px]">
                          ✓ Disponible
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Body — Visual Numbers & Progress */}
                  <div className="p-4 space-y-3.5">
                    {/* Performance Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-muted-foreground">Progression tournée :</span>
                        <span className="font-bold text-[#1B3D87]">
                          {ds.deliveredCount} / {ds.totalAssigned} livrés ({ds.completionRate}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${ds.completionRate}%` }}
                        />
                      </div>
                    </div>

                    {/* Breakdown Numbers */}
                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-lg border border-emerald-200/60">
                        <span className="block text-[10px] uppercase font-bold text-emerald-700">Livrés</span>
                        <span className="text-base font-black text-emerald-800 dark:text-emerald-300">
                          {ds.deliveredCount}
                        </span>
                      </div>
                      <div className="p-2 bg-blue-50/60 dark:bg-blue-950/20 rounded-lg border border-blue-200/60">
                        <span className="block text-[10px] uppercase font-bold text-blue-700">En cours</span>
                        <span className="text-base font-black text-blue-800 dark:text-blue-300">
                          {ds.inTransitCount}
                        </span>
                      </div>
                      <div className="p-2 bg-rose-50/60 dark:bg-rose-950/20 rounded-lg border border-rose-200/60">
                        <span className="block text-[10px] uppercase font-bold text-rose-700">Retours</span>
                        <span className="text-base font-black text-rose-800 dark:text-rose-300">
                          {ds.failedCount + ds.returnedCount}
                        </span>
                      </div>
                    </div>

                    {/* Encaissement COD */}
                    <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          Total COD Encaissé :
                        </span>
                      </div>
                      <span className="text-sm font-black text-[#1B3D87]">
                        {ds.totalCollectedCOD.toFixed(3)} DT
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-muted/10 border-t border-border/60 flex items-center gap-2">
                  <a
                    href={`tel:${d.phone}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-bold border border-border bg-card hover:bg-muted text-foreground transition"
                  >
                    <Phone className="h-3.5 w-3.5 text-blue-600" />
                    <span>Appeler</span>
                  </a>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setSelectedDriverStats(ds);
                      setIsTourModalOpen(true);
                    }}
                    className="flex-1 bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold text-xs"
                    rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  >
                    Voir Tournée ({ds.totalAssigned})
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* ── VUE TABLEAU SYNTHÉTIQUE ─────────────────────────────────────── */
        <Card className="overflow-hidden shadow-xs border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground uppercase font-black text-[10px]">
                  <th className="py-3 px-4">Livreur</th>
                  <th className="py-3 px-3">Téléphone</th>
                  <th className="py-3 px-3">Zone &amp; Véhicule</th>
                  <th className="py-3 px-3 text-center">Colis Confiés</th>
                  <th className="py-3 px-3 text-center">Livrés (%)</th>
                  <th className="py-3 px-3 text-center">En Cours</th>
                  <th className="py-3 px-3 text-center">Retours</th>
                  <th className="py-3 px-4 text-right">COD Encaissé</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredDriverStats.map((ds) => {
                  const d = ds.driver;
                  return (
                    <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-foreground">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              !d.is_active
                                ? 'bg-slate-400'
                                : ds.inTransitCount > 0
                                ? 'bg-emerald-500'
                                : 'bg-blue-400'
                            }`}
                          />
                          <span>{d.full_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-muted-foreground">
                        <a href={`tel:${d.phone}`} className="hover:text-primary hover:underline">
                          {d.phone}
                        </a>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        <span className="font-semibold text-foreground">{d.zone || '—'}</span>
                        {d.vehicle && <span className="text-[11px] block">{d.vehicle}</span>}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-foreground">
                        {ds.totalAssigned}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                          {ds.deliveredCount} ({ds.completionRate}%)
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-blue-600">
                        {ds.inTransitCount}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-rose-600">
                        {ds.failedCount + ds.returnedCount}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-[#1B3D87] text-sm">
                        {ds.totalCollectedCOD.toFixed(3)} DT
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedDriverStats(ds);
                            setIsTourModalOpen(true);
                          }}
                          className="h-7 text-xs font-bold text-[#1B3D87]"
                        >
                          Détails
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── MODAL DÉTAIL TOURNÉE D'UN LIVREUR ───────────────────────────────── */}
      {selectedDriverStats && (
        <Modal
          isOpen={isTourModalOpen}
          onClose={() => {
            setIsTourModalOpen(false);
            setSelectedDriverStats(null);
            setTourParcelSearch('');
            setTourStatusFilter('all');
          }}
          size="2xl"
          title={
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-[#1B3D87]" />
              <span>Tournée de {selectedDriverStats.driver.full_name}</span>
            </div>
          }
          description={`Détail des ${selectedDriverStats.totalAssigned} colis assignés • Secteur : ${
            selectedDriverStats.driver.zone || 'Non défini'
          } • Tél : ${selectedDriverStats.driver.phone}`}
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs text-muted-foreground font-semibold">
                COD total encaissé :{' '}
                <span className="text-[#1B3D87] font-black text-sm">
                  {selectedDriverStats.totalCollectedCOD.toFixed(3)} DT
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsTourModalOpen(false);
                  setSelectedDriverStats(null);
                }}
              >
                Fermer
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Header KPI Tournée */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-muted/30 rounded-lg border">
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Assignés</span>
                <span className="text-lg font-black">{selectedDriverStats.totalAssigned}</span>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                <span className="text-[10px] text-emerald-700 block font-bold uppercase">Livrés</span>
                <span className="text-lg font-black text-emerald-800">{selectedDriverStats.deliveredCount}</span>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-[10px] text-blue-700 block font-bold uppercase">En Route</span>
                <span className="text-lg font-black text-blue-800">{selectedDriverStats.inTransitCount}</span>
              </div>
              <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-200">
                <span className="text-[10px] text-rose-700 block font-bold uppercase">Anomalies</span>
                <span className="text-lg font-black text-rose-800">
                  {selectedDriverStats.failedCount + selectedDriverStats.returnedCount}
                </span>
              </div>
            </div>

            {/* Filtres Tournée */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Filtrer les colis du livreur (Code suivi, client, tél, adresse)..."
                  value={tourParcelSearch}
                  onChange={(e) => setTourParcelSearch(e.target.value)}
                  className="pl-8 text-xs h-8"
                />
              </div>
              <select
                value={tourStatusFilter}
                onChange={(e) => setTourStatusFilter(e.target.value)}
                className="px-2.5 py-1 border rounded-md text-xs bg-card font-medium text-foreground h-8 w-full sm:w-auto"
              >
                <option value="all">Tous les états</option>
                <option value="delivered">✓ Livrés uniquement</option>
                <option value="in_transit">🚚 En cours uniquement</option>
                <option value="issues">⚠️ Échecs &amp; Retours</option>
              </select>
            </div>

            {/* Tableau des Colis */}
            <div className="max-h-[50vh] overflow-y-auto border rounded-lg">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/60 sticky top-0 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                  <tr>
                    <th className="py-2 px-3">N° Suivi</th>
                    <th className="py-2 px-3">Destinataire</th>
                    <th className="py-2 px-3">Gouvernorat / Adresse</th>
                    <th className="py-2 px-3 text-center">Statut</th>
                    <th className="py-2 px-3 text-right">Montant COD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredTourParcels.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground">
                        Aucun colis ne correspond à ce filtre
                      </td>
                    </tr>
                  ) : (
                    filteredTourParcels.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/10">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#1B3D87]">
                          {p.tracking_number}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-foreground">{p.recipient_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{p.recipient_phone}</div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">
                          <div className="font-medium text-foreground">{p.recipient_governorate}</div>
                          <div className="text-[11px] truncate max-w-[180px]">{p.recipient_address}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {getStatusBadge(p.status)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-foreground">
                          {Number(p.total_amount || 0).toFixed(3)} DT
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL CRÉATION RAPIDE LIVREUR ───────────────────────────────────── */}
      <Modal
        isOpen={isNewDriverModalOpen}
        onClose={() => setIsNewDriverModalOpen(false)}
        size="md"
        title={
          <div className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-[#1B3D87]" />
            <span>Ajouter un Nouveau Livreur</span>
          </div>
        }
        description="Créez un compte livreur avec identifiants pour lui permettre d'accéder à l'application mobile et gérer ses tournées."
      >
        <form onSubmit={handleCreateDriver} className="space-y-3.5">
          {newDriverError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-800 rounded-lg border border-rose-200">
              {newDriverError}
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-foreground">Nom et Prénom *</label>
            <Input
              required
              placeholder="Ex: Anis Trabelsi"
              value={newDriverForm.full_name}
              onChange={(e) => setNewDriverForm({ ...newDriverForm, full_name: e.target.value })}
              className="mt-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-foreground">Téléphone *</label>
              <Input
                required
                placeholder="Ex: 28 123 456"
                value={newDriverForm.phone}
                onChange={(e) => setNewDriverForm({ ...newDriverForm, phone: e.target.value })}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Véhicule</label>
              <select
                value={newDriverForm.vehicle}
                onChange={(e) => setNewDriverForm({ ...newDriverForm, vehicle: e.target.value })}
                className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-card font-medium text-foreground"
              >
                <option value="Scooter">Scooter / Moto</option>
                <option value="Voiture">Voiture commerciale</option>
                <option value="Fourgonnette">Fourgonnette</option>
                <option value="Camionnette">Camionnette</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-foreground">Zone / Secteur Assigné</label>
            <select
              value={newDriverForm.zone}
              onChange={(e) => setNewDriverForm({ ...newDriverForm, zone: e.target.value })}
              className="w-full mt-1 px-3 py-2 border rounded-md text-sm bg-card font-medium text-foreground"
            >
              <option value="Grand Tunis">Grand Tunis</option>
              <option value="Tunis">Tunis</option>
              <option value="Ben Arous">Ben Arous</option>
              <option value="Ariana">Ariana</option>
              <option value="Manouba">Manouba</option>
              <option value="Sousse">Sousse</option>
              <option value="Sfax">Sfax</option>
              <option value="Nabeul">Nabeul</option>
              <option value="Bizerte">Bizerte</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/60">
            <div>
              <label className="text-xs font-bold text-foreground">Email de Connexion *</label>
              <Input
                required
                type="email"
                placeholder="livreur@zihan.tn"
                value={newDriverForm.email}
                onChange={(e) => setNewDriverForm({ ...newDriverForm, email: e.target.value })}
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground">Mot de passe *</label>
              <Input
                required
                type="password"
                placeholder="******"
                value={newDriverForm.password}
                onChange={(e) => setNewDriverForm({ ...newDriverForm, password: e.target.value })}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsNewDriverModalOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              isLoading={isCreatingDriver}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              Enregistrer le Livreur
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
