import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { History, CheckCircle2, XCircle, Search, RefreshCw, DollarSign, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getDbParcels } from '@/services/parcelsDb';
import type { Parcel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const DriverHistoryPage: React.FC = () => {
  const { profile } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'delivered' | 'returned'>('all');

  const fetchDriverParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: allParcels } = await getDbParcels();
    const driverName = profile?.full_name || 'Karim Mansouri';

    const assigned = allParcels.filter(
      (p) =>
        p.driver_name?.trim().toLowerCase() === driverName.trim().toLowerCase() &&
        ['delivered', 'returned', 'refused'].includes(p.status.toLowerCase())
    );

    setParcels(assigned);
    setIsLoading(false);
  }, [profile]);

  useEffect(() => {
    fetchDriverParcels();
  }, [fetchDriverParcels]);

  const stats = useMemo(() => {
    const delivered = parcels.filter((p) => p.status === 'delivered');
    const returned = parcels.filter((p) => ['returned', 'refused'].includes(p.status));
    const totalCollected = delivered.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    return {
      total: parcels.length,
      deliveredCount: delivered.length,
      returnedCount: returned.length,
      totalCollected,
    };
  }, [parcels]);

  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.tracking_number.toLowerCase().includes(q) ||
        p.recipient_name.toLowerCase().includes(q) ||
        p.recipient_phone.includes(q) ||
        p.recipient_address.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);

      let matchStatus = true;
      if (statusFilter === 'delivered') matchStatus = p.status === 'delivered';
      if (statusFilter === 'returned') matchStatus = ['returned', 'refused'].includes(p.status);

      return matchSearch && matchStatus;
    });
  }, [parcels, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-[#1B3D87]" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Historique des Livraisons
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Historique certifié des colis livrés, retours et encaissements clôturés.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchDriverParcels}
          isLoading={isLoading}
          leftIcon={<RefreshCw className="h-4 w-4" />}
        >
          Actualiser
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Colis Livrés avec Succès</p>
              <p className="text-2xl font-black text-emerald-600 mt-0.5">{stats.deliveredCount}</p>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-[#1B3D87]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Espèces Encaissé</p>
              <p className="text-2xl font-black text-[#1B3D87] font-mono mt-0.5">{stats.totalCollected.toFixed(3)} DT</p>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-xl text-[#1B3D87]">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-rose-500">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Retours Clôturés</p>
              <p className="text-2xl font-black text-rose-600 mt-0.5">{stats.returnedCount}</p>
            </div>
            <div className="p-2.5 bg-red-50 rounded-xl text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        <div className="p-4 bg-card border-b border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par N° Suivi, Destinataire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold shrink-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'all' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Tous ({parcels.length})
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'delivered' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Livrés ({stats.deliveredCount})
            </button>
            <button
              onClick={() => setStatusFilter('returned')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'returned' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Retours ({stats.returnedCount})
            </button>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="p-3 px-4">N° Suivi</th>
                  <th className="p-3">Destinataire</th>
                  <th className="p-3">Adresse &amp; Ville</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Montant Encaissé</th>
                  <th className="p-3">Remarque</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-30 text-[#1B3D87]" />
                      Aucun historique disponible pour cette sélection.
                    </td>
                  </tr>
                ) : (
                  filteredParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-muted/30">
                      <td className="p-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                        {parcel.tracking_number}
                        <span className="block text-[10px] font-sans font-normal text-muted-foreground">
                          {new Date(parcel.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {parcel.recipient_name}
                      </td>
                      <td className="p-3 text-muted-foreground">
                        {parcel.recipient_governorate} — {parcel.recipient_address}
                      </td>
                      <td className="p-3">
                        <StatusBadge status={parcel.status} size="sm" />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {parcel.status === 'delivered' ? `${parcel.total_amount.toFixed(3)} DT` : '0.000 DT'}
                      </td>
                      <td className="p-3 text-muted-foreground italic text-[11px]">
                        {parcel.notes || '—'}
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
