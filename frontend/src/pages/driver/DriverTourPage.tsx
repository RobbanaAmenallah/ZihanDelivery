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
  RefreshCw,
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

export const DriverTourPage: React.FC = () => {
  const { profile } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'delivered'>('active');

  const [selectedParcel, setSelectedParcel] = useState<Parcel | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState<boolean>(false);
  const [statusNote, setStatusNote] = useState<string>('');

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

  const handleOpenStatusModal = (parcel: Parcel) => {
    setSelectedParcel(parcel);
    setStatusNote(parcel.notes || '');
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async (newStatus: ParcelStatus) => {
    if (!selectedParcel) return;

    setParcels((prev) =>
      prev.map((p) =>
        p.id === selectedParcel.id ? { ...p, status: newStatus, notes: statusNote || p.notes } : p
      )
    );
    setIsStatusModalOpen(false);

    await updateDbParcel(selectedParcel.id!, {
      status: newStatus,
      notes: statusNote || selectedParcel.notes,
    });
  };

  const activeCount = parcels.filter((p) => !['delivered', 'returned', 'refused'].includes(p.status)).length;
  const deliveredCount = parcels.filter((p) => p.status === 'delivered').length;

  const totalToCollect = parcels
    .filter((p) => !['returned', 'refused'].includes(p.status))
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const displayedParcels = useMemo(() => {
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
      if (filterStatus === 'active') {
        matchStatus = !['delivered', 'returned', 'refused'].includes(p.status);
      } else if (filterStatus === 'delivered') {
        matchStatus = p.status === 'delivered';
      }

      return matchSearch && matchStatus;
    });
  }, [parcels, searchQuery, filterStatus]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement de votre tournée...</div>;
  }

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-16 animate-in fade-in">
      {/* Header Banner */}
      <div className="rounded-2xl bg-[#1B3D87] text-white p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-amber-300" />
            <h2 className="text-base font-black tracking-tight">Ma Tournée Active</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDriverParcels}
            className="h-7 text-xs text-white/90 hover:text-white hover:bg-white/10"
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Actualiser
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/20 text-xs">
          <div>
            <span className="text-white/70 text-[9px] block uppercase font-bold">À Livrer</span>
            <span className="text-lg font-black text-amber-300">{activeCount}</span>
          </div>
          <div>
            <span className="text-white/70 text-[9px] block uppercase font-bold">Livrés</span>
            <span className="text-lg font-black text-emerald-300">{deliveredCount}</span>
          </div>
          <div className="text-right">
            <span className="text-white/70 text-[9px] block uppercase font-bold">Total COD</span>
            <span className="text-lg font-black text-white font-mono">
              {totalToCollect.toFixed(1)} DT
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher destinataire, adresse, tél..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterStatus('active')}
            className={`px-3 py-1 rounded-full font-bold transition-all ${
              filterStatus === 'active' ? 'bg-[#1B3D87] text-white shadow-xs' : 'bg-muted text-muted-foreground'
            }`}
          >
            En attente de livraison ({activeCount})
          </button>
          <button
            onClick={() => setFilterStatus('delivered')}
            className={`px-3 py-1 rounded-full font-bold transition-all ${
              filterStatus === 'delivered' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-muted text-muted-foreground'
            }`}
          >
            Livrés ({deliveredCount})
          </button>
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 rounded-full font-bold transition-all ${
              filterStatus === 'all' ? 'bg-slate-700 text-white shadow-xs' : 'bg-muted text-muted-foreground'
            }`}
          >
            Tous ({parcels.length})
          </button>
        </div>
      </div>

      {/* Parcels List */}
      {displayedParcels.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-card rounded-xl border border-dashed border-border mt-4">
          <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#1B3D87]" />
          <p className="font-bold text-foreground">Aucun colis dans cette vue</p>
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
                  <div className="flex items-center justify-between border-b border-border/60 pb-2">
                    <span className="font-mono text-sm font-black text-[#1B3D87] dark:text-blue-400">
                      {parcel.tracking_number}
                    </span>
                    <StatusBadge status={parcel.status as ParcelStatus} size="sm" />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-foreground">{parcel.recipient_name}</h3>
                    <p className="text-xs text-muted-foreground flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#EA4E52] shrink-0 mt-0.5" />
                      <span>
                        <strong>{parcel.recipient_delegation || parcel.recipient_governorate}</strong> ({parcel.recipient_governorate}) — {parcel.recipient_address}
                      </span>
                    </p>
                    <div className="text-[11px] text-muted-foreground bg-muted/40 p-2 rounded-lg mt-1">
                      <p><strong>Article :</strong> {parcel.description} (x{parcel.quantity})</p>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#EEF3F9] dark:bg-slate-800 p-2.5 px-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase">À Encaisser :</span>
                    <span className="text-base font-black text-[#1B3D87] dark:text-blue-400 font-mono">
                      {parcel.total_amount.toFixed(3)} DT
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold"
                      onClick={() => window.open(`tel:${parcel.recipient_phone}`, '_self')}
                    >
                      <Phone className="h-3.5 w-3.5 mr-1" /> Appel
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="border-green-200 bg-green-50 text-green-700 hover:bg-green-100 text-xs font-bold"
                      onClick={() => window.open(`https://wa.me/216${parcel.recipient_phone.replace(/\D/g, '')}`, '_blank')}
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white text-xs font-bold"
                      onClick={() => handleOpenStatusModal(parcel)}
                    >
                      {isDelivered ? '✅ Livré' : 'Statut'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Mettre à jour la livraison"
        description={selectedParcel ? `Colis ${selectedParcel.tracking_number} — ${selectedParcel.recipient_name}` : ''}
      >
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs font-bold text-foreground mb-1 block">Commentaire / Remarque :</label>
            <Input
              placeholder="Ex: Livré et payé en espèces..."
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-1 gap-2.5 pt-2">
            <Button
              variant="outline"
              className="h-12 justify-start border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-sm"
              onClick={() => handleUpdateStatus('delivered')}
            >
              <CheckCircle2 className="h-5 w-5 mr-2.5 text-emerald-600 shrink-0" />
              Livré avec Succès (Encaissé)
            </Button>

            <Button
              variant="outline"
              className="h-12 justify-start border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-sm"
              onClick={() => handleUpdateStatus('rescheduled')}
            >
              <Clock className="h-5 w-5 mr-2.5 text-amber-600 shrink-0" />
              Reporté (Client absent ou occupé)
            </Button>

            <Button
              variant="outline"
              className="h-12 justify-start border-red-200 bg-red-50 hover:bg-red-100 text-red-800 font-bold text-sm"
              onClick={() => handleUpdateStatus('returned')}
            >
              <XCircle className="h-5 w-5 mr-2.5 text-red-600 shrink-0" />
              Retour Définitif (Refusé)
            </Button>

            <Button
              variant="outline"
              className="h-12 justify-start border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm"
              onClick={() => handleUpdateStatus('in_transit')}
            >
              <Navigation className="h-5 w-5 mr-2.5 text-slate-500 shrink-0" />
              En Route vers le client
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
