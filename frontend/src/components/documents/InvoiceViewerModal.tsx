import React, { useState, useRef } from 'react';
import { Receipt, Printer, Download, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ZihanInvoiceTemplate, type ClientInvoiceData, sampleInvoiceData } from './ZihanInvoiceTemplate';
import { downloadElementAsPdf } from '@/lib/pdfGenerator';

interface InvoiceViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData?: ClientInvoiceData;
}

export const InvoiceViewerModal: React.FC<InvoiceViewerModalProps> = ({
  isOpen,
  onClose,
  invoiceData = sampleInvoiceData,
}) => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      const clientSlug = (invoiceData.client.company || invoiceData.client.name || 'Client')
        .replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `Facture_ZIHAN_${invoiceData.invoiceNumber}_${clientSlug}.pdf`;
      await downloadElementAsPdf(printRef.current, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors du téléchargement de la Facture PDF:', err);
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
          <Receipt className="h-5 w-5 text-[#1B3D87]" />
          <span>Facture Officielle Client — {invoiceData.client.company || invoiceData.client.name}</span>
        </div>
      }
      description={`Calcul conforme : 100% pour les ${invoiceData.deliveredCount} livraisons effectuées + 50% pour les ${invoiceData.returnedCount} colis retournés.`}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            {downloadSuccess ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Facture PDF téléchargée avec succès !
              </span>
            ) : (
              <span>Format optimisé A4 vectoriel haute résolution (2x DPI)</span>
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
              variant="default"
              size="sm"
              isLoading={isExporting}
              onClick={handleDownloadPdf}
              leftIcon={<Download className="h-4 w-4" />}
              className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
            >
              {isExporting ? 'Génération PDF…' : 'Télécharger Facture PDF'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Scaled Preview Frame */}
        <div className="max-h-[62vh] overflow-y-auto overflow-x-auto bg-slate-200/80 dark:bg-slate-950 p-2 sm:p-4 rounded-xl flex justify-center border border-border">
          <div className="w-full max-w-[794px] overflow-x-auto flex justify-center">
            <div ref={printRef} className="origin-top bg-white shadow-md">
              <ZihanInvoiceTemplate data={invoiceData} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
