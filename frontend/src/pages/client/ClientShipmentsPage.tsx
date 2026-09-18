import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  PlusCircle,
  Search,
  RefreshCw,
  FileText,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { type Parcel } from '@/types';
import { getDbParcels, parcelToDeliveryNoteData, isParcelForClient } from '@/services/parcelsDb';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/routes/paths';

export const ClientShipmentsPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  const handleOpenDoc = (parcel: Parcel) => {
    setSelectedParcelForDoc(parcelToDeliveryNoteData(parcel));
    setIsDocModalOpen(true);
  };

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

      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'pending' && p.status === 'pending') ||
        (statusFilter === 'in_transit' && ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)) ||
        (statusFilter === 'delivered' && p.status === 'delivered') ||
        (statusFilter === 'issues' && ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused'].includes(p.status));

      return matchSearch && matchStatus;
    });
  }, [parcels, searchQuery, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Mes Expéditions &amp; Colis
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {parcels.length} Colis
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Historique complet, suivi en temps réel et impression de bons de commande A4 (PDF).
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

          {parcels.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenDoc(parcels[0])}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Dernier Bon (PDF)
            </Button>
          )}

          <Link to={ROUTES.CLIENT_CREATE}>
            <Button
              size="sm"
              leftIcon={<PlusCircle className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              + Nouveau Bon
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border-border/80 shadow-sm overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 bg-card border-b border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par N° Suivi (ZH...), Destinataire, Tél, Ville..."
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
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'pending' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              En attente
            </button>
            <button
              onClick={() => setStatusFilter('in_transit')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'in_transit' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              En cours
            </button>
            <button
              onClick={() => setStatusFilter('delivered')}
              className={`px-3 py-1 rounded-md transition-all ${
                statusFilter === 'delivered' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
              }`}
            >
              Livrés
            </button>
          </div>
        </div>

        {/* Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border font-bold text-[#667085]">
                <tr>
                  <th className="p-3 px-4">N° Suivi</th>
                  <th className="p-3">Destinataire</th>
                  <th className="p-3">Gouvernorat &amp; Ville</th>
                  <th className="p-3">Contenu</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3 text-right">Valeur Marchandise</th>
                  <th className="p-3 text-right">À Encaisser (COD)</th>
                  <th className="p-3 text-right">Bon de Commande</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredParcels.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-30 text-[#1B3D87]" />
                      <p className="font-bold text-foreground">Aucun colis trouvé</p>
                      <p className="text-xs mt-1">Créez votre première expédition avec le bouton ci-dessus.</p>
                    </td>
                  </tr>
                ) : (
                  filteredParcels.map((parcel) => (
                    <tr key={parcel.id} className="hover:bg-[#F7F9FC] dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                        {parcel.tracking_number}
                        <span className="block text-[10px] font-sans font-normal text-muted-foreground">
                          {new Date(parcel.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-foreground">{parcel.recipient_name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{parcel.recipient_phone}</p>
                      </td>
                      <td className="p-3 text-muted-foreground">
                        <span className="font-semibold text-foreground">{parcel.recipient_governorate}</span>
                        {parcel.recipient_delegation && ` • ${parcel.recipient_delegation}`}
                        <span className="block text-[10px] truncate max-w-[150px]">{parcel.recipient_address}</span>
                      </td>
                      <td className="p-3 max-w-[140px] truncate">
                        <span className="font-semibold text-foreground truncate block">{parcel.description}</span>
                        <span className="text-[10px] text-muted-foreground">Qté: {parcel.quantity} • {parcel.weight} kg</span>
                      </td>
                      <td className="p-3">
                        <StatusBadge status={parcel.status} size="sm" />
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {(parcel.goods_amount || 0).toFixed(3)} DT
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-foreground">
                        {parcel.total_amount.toFixed(3)} DT
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 text-xs text-[#1B3D87] font-bold bg-blue-50/50 hover:bg-blue-100 border border-blue-200"
                          onClick={() => handleOpenDoc(parcel)}
                          leftIcon={<FileText className="h-3.5 w-3.5" />}
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
