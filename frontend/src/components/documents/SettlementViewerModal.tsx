import React, { useState, useRef } from 'react';
import { Banknote, Printer, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ZihanSettlementTemplate, type ClientSettlementData } from './ZihanSettlementTemplate';
import { downloadElementAsPdf } from '@/lib/pdfGenerator';

interface SettlementViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  settlementData: ClientSettlementData | null;
}

export const SettlementViewerModal: React.FC<SettlementViewerModalProps> = ({
  isOpen,
  onClose,
  settlementData,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!settlementData) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      const clientSlug = (settlementData.client.company || settlementData.client.name || 'Client')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Bordereau_Reglement_${settlementData.settlementNumber}_${clientSlug}.pdf`;
      await downloadElementAsPdf(printRef.current, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors du téléchargement du Bordereau PDF:', err);
      alert('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-[#1B3D87]" />
          <span>Bordereau de Règlement Officiel — {settlementData.client.company || settlementData.client.name}</span>
        </div>
      }
      description={`Bordereau N° ${settlementData.settlementNumber} — Total réglé : ${settlementData.totalSettledAmount.toFixed(3)} TND (${settlementData.settlementMethod === 'cheque' ? 'Chèque' : 'Espèces'})`}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            {downloadSuccess ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Bordereau PDF téléchargé avec succès !
              </span>
            ) : (
              <span>Format optimisé A4 haute résolution</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fermer
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Imprimer
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              isLoading={isExporting}
              leftIcon={<Download className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#152e66] text-white"
            >
              Télécharger PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="overflow-auto max-h-[75vh] p-4 bg-muted/30 rounded-lg flex justify-center">
        <div
          ref={printRef}
          className="shadow-xl bg-white border border-border rounded-sm print:shadow-none print:border-none"
        >
          <ZihanSettlementTemplate data={settlementData} />
        </div>
      </div>
    </Modal>
  );
};
