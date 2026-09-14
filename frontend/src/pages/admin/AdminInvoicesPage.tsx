import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Receipt,
  Search,
  RefreshCw,
  Download,
  Package,
  CheckCircle2,
  RotateCcw,
  TrendingUp,
  Store,
  DollarSign,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InvoiceViewerModal } from '@/components/documents/InvoiceViewerModal';
import { getDbParcels, calculateDeliveryFee } from '@/services/parcelsDb';
import { getDbUsers } from '@/services/usersDb';
import type { Parcel, UserProfile } from '@/types';
import type { ClientInvoiceData, InvoiceParcelItem } from '@/components/documents/ZihanInvoiceTemplate';

interface ClientBillingSummary {
  clientId: string;
  clientName: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  governorate: string;
  deliveredCount: number;
  deliveredFeesTotal: number;
  returnedCount: number;
  returnedFeesTotal: number; // at 50%
  totalParcelsCount: number;
  totalAmountToPay: number;
  totalGoodsAmountDelivered: number;
  parcels: Parcel[];
}

export const AdminInvoicesPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'month' | 'last_month' | 'week'>('month');

  // Modal Facture State
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<ClientInvoiceData | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [{ parcels: fetchedParcels }, { users: fetchedUsers }] = await Promise.all([
        getDbParcels(),
        getDbUsers(),
      ]);
      setParcels(fetchedParcels);
      setClients((fetchedUsers || []).filter((u) => u.role === 'client'));
    } catch (err) {
      console.error('Erreur chargement données facturation:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter parcels by period
  const filteredParcelsByPeriod = useMemo(() => {
    const now = new Date();
    return parcels.filter((p) => {
      if (!p.created_at) return true;
      const pDate = new Date(p.created_at);
      if (periodFilter === 'month') {
        return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear();
      }
      if (periodFilter === 'last_month') {
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return pDate.getMonth() === lastMonth && pDate.getFullYear() === lastMonthYear;
      }
      if (periodFilter === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return pDate >= sevenDaysAgo;
      }
      return true;
    });
  }, [parcels, periodFilter]);

  // Aggregate billing per client
  const clientBillingSummaries = useMemo<ClientBillingSummary[]>(() => {
    // Map existing clients and track their names
    const clientMap = new Map<string, ClientBillingSummary>();

    // 1. Initialize with real clients from DB
    clients.forEach((c) => {
      const nameKey = (c.company_name || c.full_name).trim().toLowerCase();
      clientMap.set(nameKey, {
        clientId: c.id,
        clientName: c.full_name,
        companyName: c.company_name || c.full_name,
        phone: c.phone || '',
        email: c.email || '',
        address: c.zone || '',
        city: c.zone || '',
        governorate: '',
        deliveredCount: 0,
        deliveredFeesTotal: 0,
        returnedCount: 0,
        returnedFeesTotal: 0,
        totalParcelsCount: 0,
        totalAmountToPay: 0,
        totalGoodsAmountDelivered: 0,
        parcels: [],
      });
    });

    // 2. Aggregate filtered parcels
    filteredParcelsByPeriod.forEach((p) => {
      const senderKey = (p.sender_name || 'Autre Boutique').trim().toLowerCase();
      let summary = clientMap.get(senderKey);

      if (!summary) {
        // Fallback create entry for sender not in profiles table
        summary = {
          clientId: p.sender_name || 'unknown',
          clientName: p.sender_name,
          companyName: p.sender_name,
          phone: p.sender_phone || '',
          email: '',
          address: p.sender_address || '',
          city: '',
          governorate: '',
          deliveredCount: 0,
          deliveredFeesTotal: 0,
          returnedCount: 0,
          returnedFeesTotal: 0,
          totalParcelsCount: 0,
          totalAmountToPay: 0,
          totalGoodsAmountDelivered: 0,
          parcels: [],
        };
        clientMap.set(senderKey, summary);
      }

      summary.parcels.push(p);
      summary.totalParcelsCount += 1;

      const fee = Number(p.delivery_fee) > 0
        ? Number(p.delivery_fee)
        : calculateDeliveryFee(p.recipient_governorate, p.sender_name);
      const goods = Number(p.goods_amount) || 0;

      if (p.status === 'delivered') {
        // 100% delivery fee
        summary.deliveredCount += 1;
        summary.deliveredFeesTotal += fee;
        summary.totalGoodsAmountDelivered += goods;
      } else if (p.status === 'returned' || p.status === 'cancelled') {
        // 50% return fee (la moitié)
        summary.returnedCount += 1;
        summary.returnedFeesTotal += fee * 0.5;
      }
    });

    // 3. Compute totals
    const result: ClientBillingSummary[] = [];
    clientMap.forEach((s) => {
      s.totalAmountToPay = s.deliveredFeesTotal + s.returnedFeesTotal;
      // Only include clients with parcels or from the database
      if (s.totalParcelsCount > 0 || clients.some((c) => c.id === s.clientId)) {
        result.push(s);
      }
    });

    return result.sort((a, b) => b.totalAmountToPay - a.totalAmountToPay);
  }, [clients, filteredParcelsByPeriod]);

  // Global KPIs
  const globalKPIs = useMemo(() => {
    const totalDelivered = clientBillingSummaries.reduce((sum, c) => sum + c.deliveredCount, 0);
    const totalDeliveredFees = clientBillingSummaries.reduce((sum, c) => sum + c.deliveredFeesTotal, 0);
    const totalReturned = clientBillingSummaries.reduce((sum, c) => sum + c.returnedCount, 0);
    const totalReturnedFees = clientBillingSummaries.reduce((sum, c) => sum + c.returnedFeesTotal, 0);
    const grandTotalDue = totalDeliveredFees + totalReturnedFees;
    const totalCOD = clientBillingSummaries.reduce((sum, c) => sum + c.totalGoodsAmountDelivered, 0);

    return {
      totalDelivered,
      totalDeliveredFees,
      totalReturned,
      totalReturnedFees,
      grandTotalDue,
      totalCOD,
      clientsCount: clientBillingSummaries.filter((c) => c.totalParcelsCount > 0).length,
    };
  }, [clientBillingSummaries]);

  // Filtered by Search
  const filteredSummaries = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clientBillingSummaries;
    return clientBillingSummaries.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.clientName.toLowerCase().includes(q) ||
        c.phone.includes(q)
    );
  }, [clientBillingSummaries, searchQuery]);

  // Generate Invoice Data for a client
  const handleGenerateInvoice = (clientSummary: ClientBillingSummary) => {
    const invoiceNumber = `FAC-ZH-${new Date().getFullYear()}-${clientSummary.clientId.slice(0, 4).toUpperCase() || '0001'}`;
    const periodName =
      periodFilter === 'month'
        ? `Mois de ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`
        : periodFilter === 'last_month'
        ? 'Mois Précédent'
        : periodFilter === 'week'
        ? '7 Derniers Jours'
        : 'Toutes Périodes';

    const invoiceItems: InvoiceParcelItem[] = clientSummary.parcels
      .filter((p) => p.status === 'delivered' || p.status === 'returned' || p.status === 'cancelled')
      .map((p) => {
        const fee = Number(p.delivery_fee) > 0
          ? Number(p.delivery_fee)
          : calculateDeliveryFee(p.recipient_governorate, p.sender_name);
        const isDelivered = p.status === 'delivered';
        const rate = isDelivered ? 1.0 : 0.5;
        return {
          trackingNumber: p.tracking_number,
          recipientName: p.recipient_name,
          governorate: p.recipient_governorate || '',
          date: p.created_at ? new Date(p.created_at).toLocaleDateString('fr-FR') : '',
          status: isDelivered ? 'delivered' : 'returned',
          deliveryFee: fee,
          rateApplied: rate,
          billedAmount: fee * rate,
        };
      });

    const invoiceData: ClientInvoiceData = {
      invoiceNumber,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dueDate: 'À réception',
      periodLabel: periodName,
      client: {
        name: clientSummary.clientName,
        company: clientSummary.companyName,
        phone: clientSummary.phone,
        email: clientSummary.email,
        address: clientSummary.address,
        city: clientSummary.city,
        governorate: clientSummary.governorate,
      },
      deliveredCount: clientSummary.deliveredCount,
      deliveredFeesTotal: clientSummary.deliveredFeesTotal,
      returnedCount: clientSummary.returnedCount,
      returnedFeesTotal: clientSummary.returnedFeesTotal,
      totalDeliveriesCount: clientSummary.deliveredCount + clientSummary.returnedCount,
      totalAmountToPay: clientSummary.totalAmountToPay,
      items: invoiceItems,
      paymentStatus: 'PENDING',
    };

    setSelectedInvoiceData(invoiceData);
    setIsInvoiceModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-[#1B3D87]" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
              Facturation Clients &amp; Recouvrement
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Calcul certifié ZIHAN : <strong>100%</strong> pour les livraisons réussies + <strong>50% (moitié prix)</strong> pour les colis retournés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="h-4 w-4" />}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* ── Global KPI Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Facturé Dû */}
        <Card className="shadow-xs border-l-4 border-l-[#1B3D87]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Total Frais Dûs</span>
              <DollarSign className="h-4 w-4 text-[#1B3D87]" />
            </div>
            <p className="text-2xl font-black text-[#1B3D87] dark:text-blue-400 mt-1 font-mono">
              {globalKPIs.grandTotalDue.toFixed(3)} DT
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Frais de livraison + retours (50%)
            </p>
          </CardContent>
        </Card>

        {/* Livraisons Réussies (100%) */}
        <Card className="shadow-xs border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Livraisons (100%)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">
              {globalKPIs.totalDelivered} colis
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Sous-total : {globalKPIs.totalDeliveredFees.toFixed(3)} DT
            </p>
          </CardContent>
        </Card>

        {/* Colis Retours (50%) */}
        <Card className="shadow-xs border-l-4 border-l-[#EA4E52]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Retours (50%)</span>
              <RotateCcw className="h-4 w-4 text-[#EA4E52]" />
            </div>
            <p className="text-2xl font-black text-[#EA4E52] mt-1 font-mono">
              {globalKPIs.totalReturned} retours
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Frais retour (moitié) : {globalKPIs.totalReturnedFees.toFixed(3)} DT
            </p>
          </CardContent>
        </Card>

        {/* Total Marchandise COD */}
        <Card className="shadow-xs border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Total COD Encaissé</span>
              <TrendingUp className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-600 mt-1 font-mono">
              {globalKPIs.totalCOD.toFixed(3)} DT
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Articles encaissés pour les clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters & Period Selector ────────────────────────────────────── */}
      <Card className="border-border/80 shadow-xs">
        <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher boutique, client, tél…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Period selector tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 shrink-0 mr-1">
              <Calendar className="h-3.5 w-3.5" /> Période :
            </span>
            {[
              { id: 'month', label: 'Ce mois' },
              { id: 'last_month', label: 'Mois dernier' },
              { id: 'week', label: '7 jours' },
              { id: 'all', label: 'Tout' },
            ].map((tab) => (
              <Button
                key={tab.id}
                size="sm"
                variant={periodFilter === tab.id ? 'default' : 'outline'}
                onClick={() => setPeriodFilter(tab.id as any)}
                className={periodFilter === tab.id ? 'bg-[#1B3D87] text-white' : 'text-xs'}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Clients Billing Table ──────────────────────────────────── */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-5 w-5 text-[#1B3D87]" />
                <span>Relevé Détaillé par Client ({filteredSummaries.length})</span>
              </CardTitle>
              <CardDescription>
                Chaque ligne applique la tarification du client (Livraison 100% + Retour 50%). Cliquez sur "Facture PDF" pour générer le document officiel.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#EEF3F9] dark:bg-slate-800 text-[#1B3D87] dark:text-blue-300 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Client / Boutique</th>
                  <th className="py-3 px-3 text-center">Livraisons (100%)</th>
                  <th className="py-3 px-3 text-center">Retours (50%)</th>
                  <th className="py-3 px-3 text-right">Frais Livraisons</th>
                  <th className="py-3 px-3 text-right">Frais Retours</th>
                  <th className="py-3 px-4 text-right">Total À Payer</th>
                  <th className="py-3 px-3 text-right">COD Encaissé</th>
                  <th className="py-3 px-4 text-center">Action Facture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-muted-foreground">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      Aucune prestation de livraison trouvée pour cette sélection.
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((summary) => (
                    <tr
                      key={summary.clientId}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Client info */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-sm text-[#162033] dark:text-white">
                          {summary.companyName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {summary.clientName !== summary.companyName ? `${summary.clientName} • ` : ''}
                          {summary.phone || 'Sans tél'} {summary.city ? `(${summary.city})` : ''}
                        </p>
                      </td>

                      {/* Livraisons réussies */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3" />
                          {summary.deliveredCount}
                        </span>
                      </td>

                      {/* Retours (50%) */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-black px-2 py-0.5 rounded-md bg-red-50 text-[#EA4E52] border border-red-200">
                          <RotateCcw className="h-3 w-3" />
                          {summary.returnedCount}
                        </span>
                      </td>

                      {/* Frais livraisons 100% */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-foreground">
                        {summary.deliveredFeesTotal.toFixed(3)} DT
                      </td>

                      {/* Frais retours 50% */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#EA4E52]">
                        {summary.returnedFeesTotal.toFixed(3)} DT
                      </td>

                      {/* Total À Payer */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-black text-sm font-mono text-[#1B3D87] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-1 rounded-md border border-blue-200 dark:border-blue-900">
                          {summary.totalAmountToPay.toFixed(3)} DT
                        </span>
                      </td>

                      {/* COD Encaissé */}
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                        {summary.totalGoodsAmountDelivered.toFixed(3)} DT
                      </td>

                      {/* Action Facture PDF */}
                      <td className="py-3 px-4 text-center">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleGenerateInvoice(summary)}
                          leftIcon={<Download className="h-3.5 w-3.5" />}
                          className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
                        >
                          Facture PDF
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

      {/* ── Invoice Viewer Modal ────────────────────────────────────────── */}
      {selectedInvoiceData && (
        <InvoiceViewerModal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoiceData(null);
          }}
          invoiceData={selectedInvoiceData}
        />
      )}
    </div>
  );
};
