import React, { useState, useEffect, useMemo } from 'react';
import { Receipt, FileText, Download, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { getDbParcels } from '@/services/parcelsDb';
import type { Parcel } from '@/types';

export const ClientInvoicesPage: React.FC = () => {
  const [parcels, setParcels] = useState<Parcel[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const load = async () => {
      const { parcels: data } = await getDbParcels();
      setParcels(data);
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const delivered = parcels.filter((p) => p.status === 'delivered');
    const totalFees = parcels.reduce((sum, p) => sum + (p.delivery_fee || 0), 0);
    const totalCOD = delivered.reduce((sum, p) => sum + (p.goods_amount || 0), 0);
    return { count: delivered.length, totalFees, totalCOD };
  }, [parcels]);

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
          Historique des prestations de livraison ZIHAN facturées et relevés de reversement COD.
        </p>
      </div>

      {/* Invoice Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-l-4 border-l-[#1B3D87]">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Factures Payées</span>
            <p className="text-2xl font-black text-[#1B3D87] mt-1">{stats.totalFees.toFixed(3)} DT</p>
            <p className="text-[11px] text-muted-foreground">Frais de livraison facturés</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Reversements Effectués</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.totalCOD.toFixed(3)} DT</p>
            <p className="text-[11px] text-muted-foreground">Articles encaissés et reversés</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Statut Compte</span>
            <p className="text-xl font-black text-amber-600 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              À Jour (0.000 DT)
            </p>
            <p className="text-[11px] text-muted-foreground">Aucun impayé</p>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Relevés de Prestations Disponibles</CardTitle>
          <CardDescription>Téléchargez vos factures certifiées ZIHAN Super Delivery Express au format PDF</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-xl border border-border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card hover:border-[#1B3D87] transition-all">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#1B3D87]" />
                <p className="font-mono font-black text-foreground">FAC-ZH-2026-000001</p>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Payée
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Période active du mois en cours • {stats.count} livraisons validées
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-mono font-black text-lg text-foreground">{stats.totalFees.toFixed(3)} DT TTC</p>
                <span className="text-[10px] text-muted-foreground">TVA 19% incluse</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDocModalOpen(true)}
                leftIcon={<Download className="h-4 w-4 text-[#1B3D87]" />}
                className="font-bold text-[#1B3D87] border-blue-200 bg-blue-50/50 hover:bg-blue-100"
              >
                Facture PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Modal */}
      <DocumentViewerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        initialType="invoice"
      />
    </div>
  );
};
