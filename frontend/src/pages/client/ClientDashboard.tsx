import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircle,
  Package,
  Receipt,
  FileText,
  Printer,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  Search,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreateParcelWizard } from '@/components/parcels/CreateParcelWizard';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { type Parcel } from '@/types';
import { getDbParcels, parcelToDeliveryNoteData } from '@/services/parcelsDb';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { useAuth } from '@/contexts/AuthContext';

export const ClientDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'create' | 'shipments' | 'invoices'>('overview');
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [selectedDocType, setSelectedDocType] = useState<'delivery_note' | 'invoice'>('delivery_note');
  const [selectedParcelForDoc, setSelectedParcelForDoc] = useState<DeliveryNoteData | null>(null);
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadParcels = useCallback(async () => {
    setIsLoading(true);
    const { parcels: fetched } = await getDbParcels();
    setParcels(fetched);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadParcels();
  }, [loadParcels]);

  const handleOpenDoc = (type: 'delivery_note' | 'invoice', parcel?: Parcel) => {
    setSelectedDocType(type);
    if (parcel) {
      setSelectedParcelForDoc(parcelToDeliveryNoteData(parcel));
    }
    setIsDocModalOpen(true);
  };

  const handleCreatedSuccess = (trackingNumber: string) => {
    loadParcels();
    const created = parcels.find((p) => p.tracking_number === trackingNumber);
    if (created) {
      setSelectedParcelForDoc(parcelToDeliveryNoteData(created));
    }
    setActiveTab('shipments');
  };

  // Client-specific statistics
  const stats = useMemo(() => {
    const totalParcels = parcels.length;
    const deliveredParcels = parcels.filter((p) => p.status === 'delivered');
    const deliveredCount = deliveredParcels.length;
    const pendingCount = parcels.filter((p) => p.status === 'pending').length;
    const inTransitCount = parcels.filter((p) => ['accepted', 'assigned', 'picked_up', 'in_transit'].includes(p.status)).length;
    const issuesCount = parcels.filter((p) => ['customer_absent', 'wrong_address', 'failed', 'returned', 'refused'].includes(p.status)).length;

    // Financials
    const totalGoodsValue = parcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);
    const totalDeliveryFees = parcels.reduce((sum, p) => sum + (p.delivery_fee || 0), 0);
    const collectedGoodsAmount = deliveredParcels.reduce((sum, p) => sum + (p.goods_amount || 0), 0);
    const totalCODToCollect = parcels.reduce((sum, p) => sum + (p.total_amount || 0), 0);

    const successRate = totalParcels > 0 ? Math.round((deliveredCount / totalParcels) * 100) : 0;

    return {
      totalParcels,
      deliveredCount,
      pendingCount,
      inTransitCount,
      issuesCount,
      totalGoodsValue,
      totalDeliveryFees,
      collectedGoodsAmount,
      totalCODToCollect,
      successRate,
    };
  }, [parcels]);

  // Filtered parcels
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
      {/* Client Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Espace Client Expéditeur
            </h1>
            <span className="bg-[#1B3D87]/10 text-[#1B3D87] text-xs font-bold px-2.5 py-0.5 rounded-full">
              {profile?.company_name || 'Boutique Mode Express'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Suivi des ventes, gestion des expéditions et téléchargement des bons de commande officiels ZIHAN.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('overview')}
            className={activeTab === 'overview' ? 'bg-[#1B3D87] text-white' : ''}
          >
            📊 Aperçu &amp; Stats
          </Button>
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('create')}
            leftIcon={<PlusCircle className="h-4 w-4" />}
            className={activeTab === 'create' ? 'bg-[#1B3D87] text-white' : ''}
          >
            + Nouveau Bon
          </Button>
          <Button
            variant={activeTab === 'shipments' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('shipments')}
            leftIcon={<Package className="h-4 w-4" />}
            className={activeTab === 'shipments' ? 'bg-[#1B3D87] text-white' : ''}
          >
            Mes Expéditions ({parcels.length})
          </Button>
          <Button
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('invoices')}
            leftIcon={<Receipt className="h-4 w-4" />}
            className={activeTab === 'invoices' ? 'bg-[#1B3D87] text-white' : ''}
          >
            Factures
          </Button>
        </div>
      </div>

      {/* Real Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-l-4 border-l-[#1B3D87] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Total Colis</p>
              <p className="text-2xl font-black text-foreground">{stats.totalParcels}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats.inTransitCount} en cours d'acheminement</p>
            </div>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 rounded-xl text-[#1B3D87]">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Taux Réussite</p>
              <p className="text-2xl font-black text-emerald-600">{stats.successRate}%</p>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">{stats.deliveredCount} colis livrés</p>
            </div>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Solde Marchandises</p>
              <p className="text-xl font-black text-foreground">{stats.collectedGoodsAmount.toFixed(1)} <span className="text-xs font-bold text-muted-foreground">DT</span></p>
              <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5">Encaissé à vous reverser</p>
            </div>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#EA4E52] shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">Frais ZIHAN</p>
              <p className="text-xl font-black text-foreground">{stats.totalDeliveryFees.toFixed(1)} <span className="text-xs font-bold text-muted-foreground">DT</span></p>
              <p className="text-[10px] text-muted-foreground mt-0.5">7 DT Tunis / 10 DT Hors Tunis</p>
            </div>
            <div className="p-2.5 bg-red-50 dark:bg-red-950/60 rounded-xl text-[#EA4E52]">
              <Truck className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TAB 0: Overview & Quick Actions */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Action Box */}
            <Card className="md:col-span-2 shadow-sm bg-gradient-to-br from-[#1B3D87]/5 via-card to-card border-[#1B3D87]/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-[#1B3D87] dark:text-blue-400">
                      Besoin d'expédier un nouveau colis ?
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Générez votre bon de commande officiel A4 téléchargeable avec calcul automatique des tarifs ZIHAN Express.
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveTab('create')}
                    className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
                  >
                    + Créer un Bon
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs">
                  <div className="bg-card p-3 rounded-xl border border-border/80 text-center">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold block">En Attente</span>
                    <span className="text-base font-black text-amber-600">{stats.pendingCount}</span>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border/80 text-center">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold block">En Cours</span>
                    <span className="text-base font-black text-[#1B3D87]">{stats.inTransitCount}</span>
                  </div>
                  <div className="bg-card p-3 rounded-xl border border-border/80 text-center">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold block">Livrés</span>
                    <span className="text-base font-black text-emerald-600">{stats.deliveredCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Info Pricing Box */}
            <Card className="shadow-sm">
              <CardContent className="p-5 space-y-3">
                <h4 className="text-xs font-black text-[#1B3D87] uppercase tracking-wider">
                  Grille Tarifaire ZIHAN
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[#1B3D87] dark:text-blue-300">Grand Tunis</p>
                      <p className="text-[10px] text-muted-foreground">Tunis, Ariana, Ben Arous, Manouba</p>
                    </div>
                    <span className="font-black text-sm text-[#1B3D87]">7.000 DT</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-purple-800 dark:text-purple-300">Hors Grand Tunis</p>
                      <p className="text-[10px] text-muted-foreground">Toutes les autres régions</p>
                    </div>
                    <span className="font-black text-sm text-purple-800 dark:text-purple-300">10.000 DT</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent 5 Parcels */}
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Dernières Expéditions</CardTitle>
                <CardDescription>Vos 5 derniers colis enregistrés</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('shipments')}
              >
                Voir Tout ({parcels.length})
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border/80 font-bold text-muted-foreground uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">N° Suivi</th>
                      <th className="py-2.5 px-4">Destinataire</th>
                      <th className="py-2.5 px-4">Gouvernorat</th>
                      <th className="py-2.5 px-4">Statut</th>
                      <th className="py-2.5 px-4 text-right">Montant COD</th>
                      <th className="py-2.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {parcels.slice(0, 5).map((parcel) => (
                      <tr key={parcel.id} className="hover:bg-muted/30">
                        <td className="py-2.5 px-4 font-mono font-bold text-[#1B3D87]">
                          {parcel.tracking_number}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-foreground">
                          {parcel.recipient_name}
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground">
                          {parcel.recipient_governorate}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={parcel.status} size="sm" />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold">
                          {parcel.total_amount.toFixed(3)} DT
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDoc('delivery_note', parcel)}
                            className="h-6 px-2 text-[11px] text-[#1B3D87] font-bold"
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
      )}

      {/* TAB 1: Create Parcel Wizard */}
      {activeTab === 'create' && (
        <CreateParcelWizard
          onSuccess={handleCreatedSuccess}
          onOpenDocumentPreview={() => handleOpenDoc('delivery_note')}
        />
      )}

      {/* TAB 2: Client Shipments Table */}
      {activeTab === 'shipments' && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
            <div>
              <CardTitle>Mes Colis &amp; Expéditions</CardTitle>
              <CardDescription>Consultez l'état d'avancement et téléchargez vos bons de commande PDF en 1 clic</CardDescription>
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
                  onClick={() => handleOpenDoc('delivery_note', parcels[0])}
                  leftIcon={<Printer className="h-4 w-4" />}
                >
                  Dernier Bon
                </Button>
              )}
            </div>
          </CardHeader>

          {/* Search and Filters */}
          <div className="px-6 pb-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par N° Suivi, Destinataire, Tél..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center bg-muted/60 p-1 rounded-lg text-xs font-semibold shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'all' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                Tous ({parcels.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'pending' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                En attente ({stats.pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('in_transit')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'in_transit' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                En cours ({stats.inTransitCount})
              </button>
              <button
                onClick={() => setStatusFilter('delivered')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  statusFilter === 'delivered' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground'
                }`}
              >
                Livrés ({stats.deliveredCount})
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
                    <th className="p-3">Gouvernorat &amp; Ville</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right">À Encaisser (COD)</th>
                    <th className="p-3 text-right">Frais Port</th>
                    <th className="p-3 text-right">Bon de Commande</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredParcels.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-muted-foreground">
                        Aucun colis correspondant trouvé.
                      </td>
                    </tr>
                  ) : (
                    filteredParcels.map((parcel) => (
                      <tr key={parcel.id} className="hover:bg-[#F7F9FC] dark:hover:bg-slate-800/40">
                        <td className="p-3 px-4 font-mono font-black text-[#1B3D87] dark:text-blue-400">
                          {parcel.tracking_number}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-foreground">{parcel.recipient_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{parcel.recipient_phone}</p>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          <span className="font-semibold text-foreground">{parcel.recipient_governorate}</span>
                          {parcel.recipient_delegation && ` — ${parcel.recipient_delegation}`}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={parcel.status} size="sm" />
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {parcel.total_amount.toFixed(3)} DT
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {parcel.delivery_fee.toFixed(3)} DT
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2.5 text-xs text-[#1B3D87] font-bold bg-blue-50/50 hover:bg-blue-100 border border-blue-200"
                            onClick={() => handleOpenDoc('delivery_note', parcel)}
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
      )}

      {/* TAB 3: Client Invoices */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Mes Factures &amp; Relevés de Compte</CardTitle>
              <CardDescription>Historique des prestations de livraison ZIHAN facturées</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border p-4 flex items-center justify-between bg-card">
              <div className="space-y-1">
                <p className="font-mono font-bold text-[#1B3D87]">FAC-ZH-2026-000001</p>
                <p className="text-xs text-muted-foreground">Période du mois en cours • {stats.deliveredCount} livraisons effectuées</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-mono font-black text-foreground">{stats.totalDeliveryFees.toFixed(3)} DT TTC</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                    À Jour
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDoc('invoice')}
                  leftIcon={<Receipt className="h-4 w-4" />}
                >
                  Télécharger Facture
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Viewer Modal with PDF download */}
      <DocumentViewerModal
        isOpen={isDocModalOpen}
        onClose={() => {
          setIsDocModalOpen(false);
          setSelectedParcelForDoc(null);
        }}
        deliveryNoteData={selectedParcelForDoc || undefined}
        initialType={selectedDocType}
      />
    </div>
  );
};
