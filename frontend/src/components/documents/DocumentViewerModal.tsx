import React, { useState, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  Tag,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { ZihanDeliveryNoteTemplate, type DeliveryNoteData, sampleDeliveryNoteData } from './ZihanDeliveryNoteTemplate';
import { ZihanShippingLabelTemplate, type LabelData } from './ZihanShippingLabelTemplate';
import { downloadElementAsPdf } from '@/lib/pdfGenerator';

export type DocumentType = 'delivery_note' | 'invoice' | 'manifest' | 'label';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: DocumentType;
  deliveryNoteData?: DeliveryNoteData;
  labelData?: LabelData;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  initialType = 'delivery_note',
  deliveryNoteData = sampleDeliveryNoteData,
  labelData: customLabelData,
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialType);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const printRef = useRef<HTMLDivElement>(null);

  const activeLabelData: LabelData = customLabelData || {
    trackingNumber: deliveryNoteData.trackingNumber || 'ZH000153',
    senderName: deliveryNoteData.sender?.name || 'Expéditeur',
    senderPhone: deliveryNoteData.sender?.phone || '',
    recipientName: deliveryNoteData.recipient?.name || 'Destinataire',
    recipientPhone: deliveryNoteData.recipient?.phone || '',
    secondaryPhone: deliveryNoteData.recipient?.secondaryPhone,
    address: deliveryNoteData.recipient?.address || '',
    city: deliveryNoteData.recipient?.city || '',
    governorate: deliveryNoteData.recipient?.governorate || '',
    postalCode: deliveryNoteData.recipient?.postalCode,
    amountToCollect: deliveryNoteData.totalToCollect ?? deliveryNoteData.parcelValue ?? 0,
    deliveryFee: deliveryNoteData.deliveryFee ?? 0,
    isFragile: false,
    notes: deliveryNoteData.notes,
    date: deliveryNoteData.createdAt || new Date().toLocaleDateString('fr-FR'),
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsExporting(true);
    setDownloadSuccess(false);

    try {
      const trackingNumber = deliveryNoteData?.trackingNumber || 'ZH000153';
      const filename =
        docType === 'label'
          ? `Etiquette_ZIHAN_${trackingNumber}.pdf`
          : `Bon_de_Livraison_${trackingNumber}.pdf`;

      await downloadElementAsPdf(printRef.current, filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Erreur lors du téléchargement du PDF:', err);
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
          <FileText className="h-5 w-5 text-[#1B3D87]" />
          <span>Bon de Commande & Documents Officiels ZIHAN</span>
        </div>
      }
      description="Prévisualisation haute fidélité conforme aux standards d'impression ZIHAN Super Delivery Express (A4 / Téléchargeable)."
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-muted-foreground hidden sm:flex items-center gap-1.5">
            {downloadSuccess ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> PDF téléchargé avec succès !
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
              {isExporting ? 'Génération PDF…' : 'Télécharger PDF'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Document Type Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
          <Button
            size="sm"
            variant={docType === 'delivery_note' ? 'default' : 'outline'}
            onClick={() => setDocType('delivery_note')}
            leftIcon={<FileText className="h-4 w-4" />}
            className={docType === 'delivery_note' ? 'bg-[#1B3D87] text-white' : ''}
          >
            Bon de Livraison (A4)
          </Button>

          <Button
            size="sm"
            variant={docType === 'label' ? 'default' : 'outline'}
            onClick={() => setDocType('label')}
            leftIcon={<Tag className="h-4 w-4" />}
            className={docType === 'label' ? 'bg-[#1B3D87] text-white' : ''}
          >
            Étiquette Thermique (A6)
          </Button>
        </div>

        {/* Scaled Preview Frame */}
        <div className="max-h-[58vh] overflow-y-auto overflow-x-auto bg-slate-200/80 dark:bg-slate-950 p-2 sm:p-4 rounded-xl flex justify-center border border-border">
          <div className="w-full max-w-[794px] overflow-x-auto flex justify-center">
            <div ref={printRef} className="origin-top bg-white shadow-md">
              {docType === 'delivery_note' && <ZihanDeliveryNoteTemplate data={deliveryNoteData} />}
              {docType === 'label' && <ZihanShippingLabelTemplate data={activeLabelData} />}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
