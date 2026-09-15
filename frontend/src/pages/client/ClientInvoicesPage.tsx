import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, FileText, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { InvoiceViewerModal } from '@/components/documents/InvoiceViewerModal';
import { getDbParcels, calculateDeliveryFee, isParcelForClient } from '@/services/parcelsDb';
import { useAuth } from '@/contexts/AuthContext';
import type { Parcel } from '@/types';
import type { ClientInvoiceData, InvoiceParcelItem } from '@/components/documents/ZihanInvoiceTemplate';

export const ClientInvoicesPage: React.FC = () => {
  const { profile, user } = useAuth();
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const { parcels: data } = await getDbParcels();
      const clientParcels = data.filter((p) => isParcelForClient(p, profile, user?.id));
      setParcels(clientParcels);
    };
    load();
  }, [profile, user]);

  const stats = useMemo(() => {
    const delivered = parcels.filter((p) => p.status === 'delivered');
    const returned = parcels.filter((p) => p.status === 'returned' || p.status === 'cancelled');

    const getFee = (p: Parcel) =>
      Number(p.delivery_fee) > 0
        ? Number(p.delivery_fee)
        : calculateDeliveryFee(p.recipient_governorate, p.sender_name || profile?.company_name || profile?.full_name);

    const deliveredFees = delivered.reduce((sum, p) => sum + getFee(p), 0);
    const returnedFees = returned.reduce((sum, p) => sum + getFee(p) * 0.5, 0);
    const totalFeesToPay = deliveredFees + returnedFees;

    const totalCOD = delivered.reduce((sum, p) => sum + (Number(p.goods_amount) || 0), 0);

    return {
      deliveredCount: delivered.length,
      deliveredFees,
      returnedCount: returned.length,
      returnedFees,
      totalFeesToPay,
      totalCOD,
      totalCount: delivered.length + returned.length,
    };
  }, [parcels, profile]);

  const invoiceData = useMemo<ClientInvoiceData>(() => {
    const clientName = profile?.full_name || 'Client ZIHAN';
    const companyName = profile?.company_name || clientName;

    const invoiceItems: InvoiceParcelItem[] = parcels
      .filter((p) => p.status === 'delivered' || p.status === 'returned' || p.status === 'cancelled')
      .map((p) => {
        const fee = Number(p.delivery_fee) > 0
          ? Number(p.delivery_fee)
          : calculateDeliveryFee(p.recipient_governorate, p.sender_name || companyName);
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

    return {
      invoiceNumber: `FAC-ZH-${new Date().getFullYear()}-0001`,
      date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dueDate: 'À réception',
      periodLabel: `Mois de ${new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}`,
      client: {
        name: clientName,
        company: companyName,
        phone: profile?.phone || '',
        email: profile?.email || '',
        address: profile?.zone || '',
        city: profile?.zone || '',
      },
      deliveredCount: stats.deliveredCount,
      deliveredFeesTotal: stats.deliveredFees,
      returnedCount: stats.returnedCount,
      returnedFeesTotal: stats.returnedFees,
      totalDeliveriesCount: stats.totalCount,
      totalAmountToPay: stats.totalFeesToPay,
      items: invoiceItems,
      paymentStatus: 'PENDING',
    };
  }, [profile, parcels, stats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-6 w-6 text-[#1B3D87]" />
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
            Mes Factures &amp; Relevés de Compte
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Historique des prestations : <strong>100%</strong> pour les livraisons réussies + <strong>50% (moitié tarif)</strong> pour les colis retournés.
        </p>
      </div>

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Prestations Dues */}
        <Card className="shadow-xs border-l-4 border-l-[#1B3D87]">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Frais de Livraison Dus</span>
            <p className="text-2xl font-black text-[#1B3D87] mt-1 font-mono">{stats.totalFeesToPay.toFixed(3)} DT</p>
            <p className="text-[11px] text-muted-foreground">
              {stats.deliveredCount} livraisons ({stats.deliveredFees.toFixed(3)} DT) + {stats.returnedCount} retours 50% ({stats.returnedFees.toFixed(3)} DT)
            </p>
          </CardContent>
        </Card>

        {/* Reversements COD */}
        <Card className="shadow-xs border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Reversements Effectués (COD)</span>
            <p className="text-2xl font-black text-emerald-600 mt-1 font-mono">{stats.totalCOD.toFixed(3)} DT</p>
            <p className="text-[11px] text-muted-foreground">Articles encaissés et reversés</p>
          </CardContent>
        </Card>

        {/* Statut Compte */}
        <Card className="shadow-xs border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Statut Facturation</span>
            <p className="text-xl font-black text-amber-600 mt-1 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              {stats.totalFeesToPay.toFixed(3)} DT À Régler
            </p>
            <p className="text-[11px] text-muted-foreground">Règlement mensuel périodique</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base">Relevés de Prestations Disponibles</CardTitle>
          <CardDescription>Téléchargez vos factures officielles ZIHAN Super Delivery Express au format PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card hover:border-[#1B3D87] transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#1B3D87]" />
                <p className="font-mono font-black text-foreground">{invoiceData.invoiceNumber}</p>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                  En cours
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {invoiceData.periodLabel} • {stats.deliveredCount} livraisons validées + {stats.returnedCount} retours (50%)
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono font-black text-lg text-foreground">{stats.totalFeesToPay.toFixed(3)} DT</p>
                <span className="text-[10px] text-muted-foreground">Total Prestations Dues</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInvoiceModalOpen(true)}
                leftIcon={<Download className="h-4 w-4 text-[#1B3D87]" />}
                className="font-bold text-[#1B3D87] border-blue-200 bg-blue-50/50 hover:bg-blue-100"
              >
                Facture PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      {isInvoiceModalOpen && (
        <InvoiceViewerModal
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          invoiceData={invoiceData}
        />
      )}
    </div>
  );
};
