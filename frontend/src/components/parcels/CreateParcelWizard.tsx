import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Package,
  Truck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { createDbParcel, calculateDeliveryFee } from '@/services/parcelsDb';
import { useAuth } from '@/contexts/AuthContext';

const ALL_GOVERNORATES = [
  'Tunis',
  'Ariana',
  'Ben Arous',
  'Manouba',
  'Nabeul',
  'Zaghouan',
  'Bizerte',
  'Béja',
  'Jendouba',
  'Le Kef',
  'Siliana',
  'Sousse',
  'Monastir',
  'Mahdia',
  'Sfax',
  'Kairouan',
  'Kasserine',
  'Sidi Bouzid',
  'Gabès',
  'Médenine',
  'Tataouine',
  'Gafsa',
  'Tozeur',
  'Kébili',
];

interface CreateParcelWizardProps {
  onSuccess?: (parcelId: string) => void;
  onOpenDocumentPreview?: () => void;
}

export const CreateParcelWizard: React.FC<CreateParcelWizardProps> = ({
  onSuccess,
  onOpenDocumentPreview,
}) => {
  const { profile, user } = useAuth();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdParcelId, setCreatedParcelId] = useState<string | null>(null);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState(() => ({
    // Step 1 - Sender
    senderName: profile?.company_name || profile?.full_name || '',
    senderPhone: profile?.phone || '',
    senderAddress: profile?.zone || 'Grand Tunis',
    // Step 2 - Recipient
    recipientName: '',
    recipientPhone: '',
    recipientSecondaryPhone: '',
    governorate: 'Ben Arous',
    delegation: 'Nouvelle Médina',
    recipientAddress: '',
    postalCode: '2063',
    // Step 3 - Parcel
    description: 'Article Mode & Habillement',
    quantity: 1,
    weight: '1.0',
    isFragile: false,
    goodsAmount: 70, // DT
    notes: '',
    // Step 4 - Pricing & Speed
    speed: 'express', // 'express' | 'standard'
  }));

  useEffect(() => {
    if (profile) {
      setFormData((prev) => ({
        ...prev,
        senderName: prev.senderName || profile.company_name || profile.full_name || '',
        senderPhone: prev.senderPhone || profile.phone || '',
        senderAddress: prev.senderAddress || profile.zone || 'Grand Tunis',
      }));
    }
  }, [profile]);

  // Calculate pricing — tarif unique par client
  const baseDeliveryFee = calculateDeliveryFee(formData.governorate, formData.senderName);
  const speedSurcharge = 0.0;
  const deliveryFee = baseDeliveryFee + speedSurcharge;
  const totalToCollect = Number(formData.goodsAmount || 0) + deliveryFee;
  const estimatedTime = '24 à 48 heures';

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { parcel } = await createDbParcel({
        sender_id: profile?.id || user?.id || null,
        sender_name: formData.senderName,
        sender_phone: formData.senderPhone,
        sender_address: formData.senderAddress,
        recipient_name: formData.recipientName || 'Client Destinataire',
        recipient_phone: formData.recipientPhone || '+216 22 000 000',
        recipient_secondary_phone: formData.recipientSecondaryPhone,
        recipient_governorate: formData.governorate,
        recipient_delegation: formData.delegation,
        recipient_address: formData.recipientAddress || 'Nouvelle Médina',
        recipient_postal_code: formData.postalCode,
        description: formData.description || 'Marchandise',
        quantity: Number(formData.quantity || 1),
        weight: parseFloat(formData.weight) || 1.0,
        is_fragile: formData.isFragile,
        goods_amount: Number(formData.goodsAmount || 0),
        notes: formData.notes,
      });

      setCreatedParcelId(parcel.tracking_number);
      if (onSuccess) onSuccess(parcel.tracking_number);
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error('Error creating parcel:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, label: 'Expéditeur', icon: User },
    { num: 2, label: 'Destinataire', icon: MapPin },
    { num: 3, label: 'Colis', icon: Package },
    { num: 4, label: 'Livraison', icon: Truck },
    { num: 5, label: 'Confirmation', icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Wizard Stepper Header */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-card">
        <div className="flex items-center justify-between relative">
          {/* Background Connecting Line */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-[#DCE3EC] dark:bg-slate-800 -z-0" />

          {steps.map((s) => {
            const isCompleted = currentStep > s.num;
            const isCurrent = currentStep === s.num;
            const Icon = s.icon;

            return (
              <div key={s.num} className="relative z-10 flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl font-bold text-xs transition-all duration-200 shadow-xs ${
                    isCurrent
                      ? 'bg-[#1B3D87] text-white ring-4 ring-[#1B3D87]/20 scale-105'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-card text-muted-foreground border border-border'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <span
                  className={`text-[11px] font-bold hidden sm:block ${
                    isCurrent ? 'text-[#1B3D87] dark:text-blue-400' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Active Step Content Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            Étape {currentStep} sur 5 — {steps[currentStep - 1].label}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Vérifiez les coordonnées d\'enlèvement de votre entreprise.'}
            {currentStep === 2 && 'Renseignez l\'adresse précise et les numéros du client destinataire.'}
            {currentStep === 3 && 'Indiquez le contenu, la valeur marchande et les consignes.'}
            {currentStep === 4 && 'Calcul automatique des frais de livraison selon la zone géographique.'}
            {currentStep === 5 && 'Vérification complète avant émission du bon officiel.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* STEP 1: Expéditeur */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <Input
                label="Nom / Raison Sociale Expéditeur"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Téléphone d'enlèvement"
                  value={formData.senderPhone}
                  onChange={(e) => setFormData({ ...formData, senderPhone: e.target.value })}
                />
                <Input
                  label="Adresse de prise en charge"
                  value={formData.senderAddress}
                  onChange={(e) => setFormData({ ...formData, senderAddress: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* STEP 2: Destinataire */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <Input
                label="Nom & Prénom du Destinataire *"
                placeholder="Ex: Mohamed Ben Ali"
                value={formData.recipientName}
                onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Téléphone Principal *"
                  placeholder="Ex: +216 22 000 000"
                  value={formData.recipientPhone}
                  onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                />
                <Input
                  label="Téléphone Secondaire (Optionnel)"
                  placeholder="Ex: +216 98 111 222"
                  value={formData.recipientSecondaryPhone}
                  onChange={(e) => setFormData({ ...formData, recipientSecondaryPhone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Gouvernorat *"
                  value={formData.governorate}
                  onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                  options={ALL_GOVERNORATES.map((gov) => ({ value: gov, label: gov }))}
                />
                <Input
                  label="Délégation / Ville *"
                  placeholder="Ex: Nouvelle Médina"
                  value={formData.delegation}
                  onChange={(e) => setFormData({ ...formData, delegation: e.target.value })}
                />
              </div>
              <Input
                label="Adresse Complète & Repère *"
                placeholder="Ex: Résidence Ennasr, Bloc B, Apt 14, Rue..."
                value={formData.recipientAddress}
                onChange={(e) => setFormData({ ...formData, recipientAddress: e.target.value })}
              />
            </div>
          )}

          {/* STEP 3: Colis */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <Input
                label="Description du Marchandise *"
                placeholder="Ex: Chaussures Sport ZIHAN Runner Pro"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  type="number"
                  label="Quantité"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                />
                <Input
                  label="Poids estimé (kg)"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                />
                <Input
                  type="number"
                  label="Montant Marchandise à Encaisser (DT) *"
                  value={formData.goodsAmount}
                  onChange={(e) => setFormData({ ...formData, goodsAmount: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-[#EEF3F9] dark:bg-slate-800/50">
                <input
                  type="checkbox"
                  id="fragile"
                  checked={formData.isFragile}
                  onChange={(e) => setFormData({ ...formData, isFragile: e.target.checked })}
                  className="h-4 w-4 rounded text-[#1B3D87] focus:ring-[#1B3D87]"
                />
                <label htmlFor="fragile" className="text-xs font-bold text-foreground cursor-pointer select-none">
                  ⚠️ Colis fragile (Nécessite manipulation prioritaire)
                </label>
              </div>
              <Input
                label="Remarques / Instructions spéciales"
                placeholder="Ex: Appeler avant livraison, ne pas plier..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          )}

          {/* STEP 4: Tarification Livraison */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="rounded-xl border-2 border-[#1B3D87] p-4 bg-[#EEF3F9] dark:bg-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#1B3D87] dark:text-blue-400">
                    Destination : {formData.governorate}
                  </span>
                  <span className="text-xs font-black uppercase bg-[#1B3D87] text-white px-2 py-0.5 rounded">
                    Tarif Client Négocié
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs pt-2 border-t border-[#DCE3EC] dark:border-slate-700">
                  <div>
                    <p className="text-muted-foreground">Frais de livraison ZIHAN :</p>
                    <p className="text-base font-black text-foreground font-mono">
                      {deliveryFee.toFixed(3)} DT
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Délai estimé :</p>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ⚡ {estimatedTime}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Récapitulatif Final */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-border p-3.5 space-y-1 bg-card">
                  <p className="font-bold text-[#1B3D87] uppercase">Destinataire</p>
                  <p className="font-black text-foreground">{formData.recipientName || 'Mohamed Ben Ali'}</p>
                  <p className="text-muted-foreground">📞 {formData.recipientPhone || '+216 22 000 000'}</p>
                  <p className="text-muted-foreground">
                    📍 {formData.recipientAddress || 'Nouvelle Médina, Ben Arous'}
                  </p>
                </div>

                <div className="rounded-xl border border-border p-3.5 space-y-1 bg-card">
                  <p className="font-bold text-[#1B3D87] uppercase">Marchandise</p>
                  <p className="font-black text-foreground">
                    {formData.description || 'Chaussures Sport ZIHAN Runner Pro'}
                  </p>
                  <p className="text-muted-foreground">Quantité : {formData.quantity}</p>
                  {formData.isFragile && <p className="text-[#EA4E52] font-bold">⚠️ Colis fragile</p>}
                </div>
              </div>

              {/* Total Calculation Box */}
              <div className="rounded-xl border-2 border-[#1B3D87] p-4 bg-[#1B3D87] text-white space-y-2">
                <div className="flex justify-between text-xs text-white/80">
                  <span>Montant de la marchandise :</span>
                  <span className="font-bold font-mono">{formData.goodsAmount.toFixed(3)} DT</span>
                </div>
                <div className="flex justify-between text-xs text-white/80">
                  <span>Frais de livraison ZIHAN :</span>
                  <span className="font-bold font-mono">{deliveryFee.toFixed(3)} DT</span>
                </div>
                <div className="border-t border-white/20 pt-2 flex items-center justify-between">
                  <span className="font-black text-sm uppercase tracking-wide">
                    TOTAL À ENCAISSER (COD) :
                  </span>
                  <span className="text-xl font-black text-amber-300 font-mono">
                    {totalToCollect.toFixed(3)} DT
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Précédent
              </Button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <Button
                variant="default"
                size="sm"
                onClick={handleNext}
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Suivant
              </Button>
            ) : (
              <Button
                variant="accent"
                size="lg"
                isLoading={isSubmitting}
                onClick={handleFinalSubmit}
                leftIcon={<Sparkles className="h-5 w-5" />}
              >
                Créer mon bon de livraison
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Success Modal after Creation (Section 32) */}
      <Modal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
        size="md"
        title="Expédition ZIHAN Créée avec Succès !"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSuccessModalOpen(false)}
            >
              Fermer
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setIsSuccessModalOpen(false);
                if (onOpenDocumentPreview) onOpenDocumentPreview();
              }}
              leftIcon={<Printer className="h-4 w-4" />}
            >
              Imprimer le Bon de Livraison
            </Button>
          </div>
        }
      >
        <div className="text-center py-4 space-y-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto shadow-sm animate-bounce">
            <CheckCircle2 className="h-10 w-10" />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">
              Numéro de bon & de suivi attribué
            </p>
            <h3 className="text-2xl font-black tracking-widest text-[#1B3D87] font-mono">
              {createdParcelId || 'ZH000153'}
            </h3>
          </div>

          <div className="rounded-xl bg-[#EEF3F9] p-3 text-xs text-[#162033] space-y-1">
            <p>
              Destinataire : <span className="font-bold">{formData.recipientName || 'Mohamed Ben Ali'}</span>
            </p>
            <p>
              Montant à encaisser :{' '}
              <span className="font-black text-[#1B3D87]">{totalToCollect.toFixed(3)} DT</span>
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
