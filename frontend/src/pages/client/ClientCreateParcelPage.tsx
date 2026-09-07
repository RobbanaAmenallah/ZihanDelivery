import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CreateParcelWizard } from '@/components/parcels/CreateParcelWizard';
import { DocumentViewerModal } from '@/components/documents/DocumentViewerModal';
import { getDbParcels, parcelToDeliveryNoteData } from '@/services/parcelsDb';
import { type DeliveryNoteData } from '@/components/documents/ZihanDeliveryNoteTemplate';
import { ROUTES } from '@/routes/paths';

export const ClientCreateParcelPage: React.FC = () => {
  const navigate = useNavigate();
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [selectedParcelForDoc, setSelectedParcelForDoc] = useState<DeliveryNoteData | null>(null);

  const handleCreatedSuccess = async (trackingNumber: string) => {
    const { parcels } = await getDbParcels();
    const created = parcels.find((p) => p.tracking_number === trackingNumber);
    if (created) {
      setSelectedParcelForDoc(parcelToDeliveryNoteData(created));
      setIsDocModalOpen(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-[#1B3D87]" />
            <h1 className="text-2xl font-black tracking-tight text-[#162033] dark:text-white">
              Créer un Nouveau Colis &amp; Bon de Commande
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Calcul automatique du tarif (Grand Tunis 7 DT / Hors Tunis 10 DT) et génération du Bon officiel imprimable.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(ROUTES.CLIENT_SHIPMENTS)}
          leftIcon={<ArrowLeft className="h-4 w-4" />}
        >
          Retour aux Expéditions
        </Button>
      </div>

      {/* Creation Wizard */}
      <CreateParcelWizard
        onSuccess={handleCreatedSuccess}
        onOpenDocumentPreview={() => setIsDocModalOpen(true)}
      />

      {/* Document Viewer Modal */}
      {selectedParcelForDoc && (
        <DocumentViewerModal
          isOpen={isDocModalOpen}
          onClose={() => {
            setIsDocModalOpen(false);
            setSelectedParcelForDoc(null);
            navigate(ROUTES.CLIENT_SHIPMENTS);
          }}
          deliveryNoteData={selectedParcelForDoc}
          initialType="delivery_note"
        />
      )}
    </div>
  );
};
