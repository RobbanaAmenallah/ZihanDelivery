import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Phone,
  MessageCircle,
  Navigation,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  MapPin,
  Search,
  Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/modal';
import { ParcelStatus } from '@/lib/statusConfig';
import { getDbParcels, updateDbParcel } from '@/services/parcelsDb';
import type { Parcel } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export const DriverMobileView: React.FC = () => {
  const { profile } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPeriod, setFilterPeriod] = useState<'today' | 'all'>('today');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'delivered' | 'issues'>('all');

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusNote, setStatusNote] = useState<string>('');

  const fetchDriverParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: allParcels } = await getDbParcels();
    
    // Filter parcels assigned to this driver AND that are dispatched by admin
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

  const handleOpenStatusModal = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setStatusNote(parcel.notes || '');
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: ParcelStatus) => {
    if (!selectedParcel) return;
    
    // Optimistic UI update
    setParcels((prev) =>
      prev.map((p) => (p.id === selectedParcel.id ? { ...p, status: newStatus, notes: statusNote || p.notes } : p))
    );
    setIsStatusModalOpen(false);

    // Actual DB update
    await updateDbParcel(selectedParcel.id!, { 
      status: newStatus,
      notes: statusNote || selectedParcel.notes
    });
  };

  // Date filtering
  const todayStr = new Date().toISOString().split('T')[0];

  const filteredByDate = useMemo(() => {
    if (filterPeriod === 'today') {
      return parcels.filter((p) => p.created_at?.startsWith(todayStr) || true); // Default to assigned tour
    }
    return parcels;
  }, [parcels, filterPeriod, todayStr]);

  // Statistics calculation for the driver
  const stats = useMemo(() => {
    const totalParcels = filteredByDate.length;
    const deliveredParcels = filteredByDate.filter((p) => p.status === 'delivered');
    const deliveredCount = deliveredParcels.length;
    const activeCount = filteredByDate.filter((p) => !['delivered', 'returned', 'refused'].includes(p.status)).length;
    const failedCount = filteredByDate.filter((p) => ['returned', 'refused', 'wrong_address', 'customer_absent'].includes(p.status)).length;

    // Financials
    const totalGoodsAmount = filteredByDate.reduce((sum, p) => sum + (p.goods_amount || 0), 0);
    const totalDeliveryFees = filteredByDate.reduce((sum, p) => sum + (p.delivery_fee || 0), 0);
    const totalToCollectCOD = filteredByDate
      .filter((p) => !['returned', 'refused'].includes(p.status))
      .reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const alreadyCollectedCOD = deliveredParcels.reduce((sum, p) => sum + (p.total_amount || 0), 0);
    const remainingToCollect = totalToCollectCOD - alreadyCollectedCOD;

    const completionRate = totalParcels > 0 ? Math.round((deliveredCount / totalParcels) * 100) : 0;

    return {
      totalParcels,
      deliveredCount,
      activeCount,
      failedCount,
      totalGoodsAmount,
      totalDeliveryFees,
      totalToCollectCOD,
      alreadyCollectedCOD,
      remainingToCollect,
      completionRate,
    };
  }, [filteredByDate]);

  // Filtered parcels list
  const displayedParcels = useMemo(() => {
    return filteredByDate.filter((p) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.tracking_number.toLowerCase().includes(q) ||
        p.recipient_name.toLowerCase().includes(q) ||
        p.recipient_phone.includes(q) ||
        p.recipient_address.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q);

      // Status
      let matchStatus = true;
      if (filterStatus === 'active') {
        matchStatus = !['delivered', 'returned', 'refused'].includes(p.status);
      } else if (filterStatus === 'delivered') {
        matchStatus = p.status === 'delivered';
      } else if (filterStatus === 'issues') {
        matchStatus = ['customer_absent', 'wrong_address', 'returned', 'refused', 'rescheduled'].includes(p.status);
      }

      return matchSearch && matchStatus;
    });
  }, [filteredByDate, searchQuery, filterStatus]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement de votre tournée et tableau de bord...</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-16 animate-in fade-in">
      {/* Mobile Driver Tour Header */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1B3D87] to-[#15316E] text-white p-5 space-y-4 shadow-xl border border-blue-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Truck className="h-6 w-6 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight leading-none">Tableau de Bord Livreur</h2>
              <p className="text-[11px] text-blue-200 mt-1">
                {profile?.full_name || 'Karim Mansouri'} {profile?.vehicle ? `• ${profile.vehicle}` : ''}
              </p>
            </div>
          </div>

          {/* Time filter toggle */}
          <div className="flex items-center bg-black/20 p-0.5 rounded-lg text-[10px] font-bold">
            <button
              onClick={() => setFilterPeriod('today')}
              className={`px-2 py-1 rounded-md transition-all ${
                filterPeriod === 'today' ? 'bg-white text-[#1B3D87] shadow-xs' : 'text-white/80'
              }`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setFilterPeriod('all')}
              className={`px-2 py-1 rounded-md transition-all ${
                filterPeriod === 'all' ? 'bg-white text-[#1B3D87] shadow-xs' : 'text-white/80'
              }`}
            >
              Global
            </button>
          </div>
        </div>

        {/* Real Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-blue-200">Avancement des livraisons</span>
            <span className="text-amber-300 font-mono">{stats.completionRate}% ({stats.deliveredCount}/{stats.totalParcels})</span>
          </div>
          <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* 4 KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/15 text-xs">
          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-white/70 text-[10px] block uppercase font-semibold">À Livrer</span>
            <span className="text-lg font-black text-amber-300">{stats.activeCount}</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-white/70 text-[10px] block uppercase font-semibold">Livrées</span>
            <span className="text-lg font-black text-emerald-300">{stats.deliveredCount}</span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-white/70 text-[10px] block uppercase font-semibold">Encaissé</span>
            <span className="text-base font-black text-white font-mono">{stats.alreadyCollectedCOD.toFixed(1)} <span className="text-[10px]">DT</span></span>
          </div>

          <div className="bg-white/10 p-2.5 rounded-xl">
            <span className="text-white/70 text-[10px] block uppercase font-semibold">Reste COD</span>
            <span className="text-base font-black text-amber-300 font-mono">{stats.remainingToCollect.toFixed(1)} <span className="text-[10px]">DT</span></span>
          </div>
        </div>

        {/* Financial Recap Box */}
        <div className="bg-white/10 p-3 rounded-xl flex items-center justify-between text-xs border border-white/10">
          <div>
            <span className="text-white/70 text-[10px] block uppercase">Prix Total Marchandises :</span>
            <span className="font-bold text-white font-mono">{stats.totalGoodsAmount.toFixed(3)} DT</span>
          </div>
          <div className="text-right">
            <span className="text-white/70 text-[10px] block uppercase">Total COD Tournée :</span>
            <span className="text-sm font-black text-amber-300 font-mono">{stats.totalToCollectCOD.toFixed(3)} DT</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Controls */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par N° Suivi, Client, Téléphone, Adresse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
              filterStatus === 'all'
                ? 'bg-[#1B3D87] text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            Tous ({filteredByDate.length})
          </button>
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
              filterStatus === 'active'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            À Livrer ({stats.activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('delivered')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
              filterStatus === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            Livrés ({stats.deliveredCount})
          </button>
          <button
            onClick={() => setFilterStatus('issues')}
            className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
              filterStatus === 'issues'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-muted/70 text-muted-foreground hover:bg-muted'
            }`}
          >
            Alertes/Reportés ({stats.failedCount})
          </button>
        </div>
      </div>

      {/* Parcels List */}
      {displayedParcels.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border mt-4 shadow-sm">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#1B3D87]" />
          <p className="text-sm font-bold text-foreground">Aucun colis dans cette vue</p>
          <p className="text-xs mt-1">Tous vos colis assignés apparaîtront ici dès que l'administrateur valide le départ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedParcels.map((parcel) => {
            const isDelivered = parcel.status === 'delivered';
            const isReturned = ['returned', 'refused'].includes(parcel.status);

            return (
              <Card
                key={parcel.id}
                className={`overflow-hidden border-2 shadow-sm transition-all ${
                  isDelivered
                    ? 'border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10'
                    : isReturned
                    ? 'border-red-200 bg-red-50/20 dark:bg-red-950/10'
                    : 'border-border hover:border-[#1B3D87] bg-card'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Card Header: Tracking + Status */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-[#1B3D87] dark:text-blue-400">
                        {parcel.tracking_number}
                      </span>
                      {parcel.is_fragile && (
                        <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                          Fragile
                        </span>
                      )}
                    </div>
                    <StatusBadge status={parcel.status as ParcelStatus} size="sm" />
                  </div>

                  {/* Recipient Details */}
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-[#162033] dark:text-white leading-snug">
                      {parcel.recipient_name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#EA4E52] shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-foreground">{parcel.recipient_delegation || parcel.recipient_governorate}</strong> ({parcel.recipient_governorate}) — {parcel.recipient_address}
                      </span>
                    </p>
                    
                    {/* Item details */}
                    <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg mt-1 space-y-0.5">
                      <p><strong className="text-foreground">Contenu :</strong> {parcel.description} (x{parcel.quantity})</p>
                      <p className="text-[10px]">Expéditeur : {parcel.sender_name}</p>
                    </div>

                    {parcel.notes && (
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded font-medium mt-1">
                        ⚠️ Note : {parcel.notes}
                      </p>
                    )}
                  </div>

                  {/* Financial Details Box */}
                  <div className="rounded-xl bg-[#EEF3F9] dark:bg-slate-800 p-2.5 px-3 flex items-center justify-between border border-[#DCE3EC] dark:border-slate-700">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-semibold">
                        Article : {parcel.goods_amount?.toFixed(2)} DT + Port : {parcel.delivery_fee?.toFixed(2)} DT
                      </span>
                      <span className="text-xs font-black text-foreground uppercase tracking-wider">
                        Total à Encaisser (COD) :
                      </span>
                    </div>
                    <span className="text-base font-black text-[#1B3D87] dark:text-blue-400 font-mono">
                      {parcel.total_amount?.toFixed(3) || '0.000'} DT
                    </span>
                  </div>

                  {/* Quick Actions (Call, WhatsApp, Update Status) */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold"
                      onClick={() => window.open(`tel:${parcel.recipient_phone}`, '_self')}
                    >
                      <Phone className="h-3.5 w-3.5" /> Appeler
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 border-green-200 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold"
                      onClick={() => window.open(`https://wa.me/216${parcel.recipient_phone.replace(/\D/g, '')}`, '_blank')}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white text-xs font-bold"
                      onClick={() => handleOpenStatusModal(parcel)}
                    >
                      {isDelivered ? '✅ Livré' : isReturned ? '↩️ Retour' : 'Modifier'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Update Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Mettre à jour la livraison"
        description={
          selectedParcel ? `Colis ${selectedParcel.tracking_number} — ${selectedParcel.recipient_name}` : ''
        }
      >
        <div className="space-y-3 py-2">
          {/* Note Input */}
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">Commentaire / Remarque terrain :</label>
            <Input
              placeholder="Ex: Livré et payé en espèces, client demande rappel..."
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <Button
              variant="outline"
              className="h-12 justify-start border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm shadow-sm"
              onClick={() => handleUpdateStatus('delivered')}
            >
              <CheckCircle2 className="h-5 w-5 mr-2.5 text-emerald-600 shrink-0" />
              <span>Livré avec Succès (Encaissé en Espèces)</span>
            </Button>

            <Button
              variant="outline"
              className="h-12 justify-start border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-sm shadow-sm"
              onClick={() => handleUpdateStatus('rescheduled')}
            >
              <Clock className="h-5 w-5 mr-2.5 text-amber-600 shrink-0" />
              <span>Reporté (Client absent ou demande un autre créneau)</span>
            </Button>

            <Button
              variant="outline"
              className="h-12 justify-start border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-sm shadow-sm"
              onClick={() => handleUpdateStatus('returned')}
            >
              <XCircle className="h-5 w-5 mr-2.5 text-red-600 shrink-0" />
              <span>Retour Définitif (Client refuse le colis)</span>
            </Button>

            <Button
              variant="outline"
              className="h-12 justify-start border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm shadow-sm"
              onClick={() => handleUpdateStatus('in_transit')}
            >
              <Navigation className="h-5 w-5 mr-2.5 text-slate-500 shrink-0" />
              <span>En Route vers le client</span>
            </Button>

            <Button
              variant="ghost"
              className="mt-2 text-muted-foreground w-full text-xs"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Annuler
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
