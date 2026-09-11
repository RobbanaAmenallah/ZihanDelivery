import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Truck,
  Shield,
  Layers,
  Sparkles,
  Eye,
  SlidersHorizontal,
  FileText,
  Receipt,
  Tag,
  Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DocumentViewerModal, DocumentType } from '@/components/documents/DocumentViewerModal';
import { PARCEL_STATUSES, ParcelStatus } from '@/lib/statusConfig';
import { useTheme } from '@/components/ThemeProvider';
import { ROUTES } from '@/routes/paths';

export const HomePage: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useTheme();

  // State
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [activeDocType, setActiveDocType] = useState<DocumentType>('delivery_note');
  const [showSkeletons, setShowSkeletons] = useState<boolean>(false);

  const handleOpenDoc = (type: DocumentType) => {
    setActiveDocType(type);
    setIsDocModalOpen(true);
  };

  const allStatuses = Object.keys(PARCEL_STATUSES) as ParcelStatus[];


  return (
    <div className="space-y-10 pb-16 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#DCE3EC] bg-[#EEF3F9] dark:bg-slate-800 dark:border-slate-700 px-3.5 py-0.5 text-xs font-bold text-[#1B3D87] dark:text-blue-400">
            <Sparkles className="h-3.5 w-3.5 text-[#EA4E52]" />
            <span>Design System & Identité Visuelle Officielle ZIHAN</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#162033] dark:text-white">
            Guide de Styles, Tokens & Documents Officiels
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Bibliothèque complète de composants, matrice des 13 statuts logistiques, et templates d'impression A4/A6 conformes à la marque.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSkeletons(!showSkeletons)}
            leftIcon={<SlidersHorizontal className="h-4 w-4" />}
          >
            {showSkeletons ? 'Mode Normal' : 'Mode Skeletons'}
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={toggleTheme}
            leftIcon={<Eye className="h-4 w-4" />}
          >
            Thème : {resolvedTheme === 'dark' ? 'Sombre' : 'Clair'}
          </Button>
        </div>
      </div>

      {/* Quick Navigation Cards to Portals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card hoverEffect className="border-2 border-[#1B3D87]/20">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#1B3D87] uppercase">Vue Admin</span>
              <Compass className="h-5 w-5 text-[#1B3D87]" />
            </div>
            <div>
              <h3 className="font-black text-base">Dashboard Administrateur</h3>
              <p className="text-xs text-muted-foreground">KPIs, graphique d'évolution, top livreurs et dispatch.</p>
            </div>
            <Button asChild variant="default" size="sm" className="w-full">
              <Link to={ROUTES.ADMIN}>Ouvrir Admin</Link>
            </Button>
          </CardContent>
        </Card>

        <Card hoverEffect className="border-2 border-emerald-600/20">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700 uppercase">Vue Client</span>
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-black text-base">Espace Client (Wizard)</h3>
              <p className="text-xs text-muted-foreground">Création de bon en 5 étapes et tarification 7DT / 10DT.</p>
            </div>
            <Button asChild variant="default" size="sm" className="w-full bg-emerald-700 hover:bg-emerald-800">
              <Link to={ROUTES.CLIENT}>Ouvrir Espace Client</Link>
            </Button>
          </CardContent>
        </Card>

        <Card hoverEffect className="border-2 border-sky-600/20">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700 uppercase">Vue Livreur</span>
              <Truck className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h3 className="font-black text-base">Interface Livreur Mobile</h3>
              <p className="text-xs text-muted-foreground">Cartes tactiles, appel, WhatsApp, itinéraire et statut.</p>
            </div>
            <Button asChild variant="default" size="sm" className="w-full bg-sky-700 hover:bg-sky-800">
              <Link to={ROUTES.DRIVER}>Ouvrir Interface Livreur</Link>
            </Button>
          </CardContent>
        </Card>

        <Card hoverEffect className="border-2 border-[#EA4E52]/20">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#EA4E52] uppercase">Portail Public</span>
              <Sparkles className="h-5 w-5 text-[#EA4E52]" />
            </div>
            <div>
              <h3 className="font-black text-base">Landing & Suivi Public</h3>
              <p className="text-xs text-muted-foreground">Recherche instantanée et timeline d'acheminement sécurisée.</p>
            </div>
            <Button asChild variant="accent" size="sm" className="w-full">
              <Link to={ROUTES.HOME}>Ouvrir Landing Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Official Documents Generator Showcase */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-[#1B3D87] dark:text-blue-400" />
            <h2 className="text-lg font-bold tracking-tight">
              Générateur de Documents Officiels ZIHAN (PDF & Impression)
            </h2>
          </div>
          <span className="text-xs text-muted-foreground">Bande latérale bleue & ligne rouge distinctive</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card hoverEffect>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <FileText className="h-6 w-6 text-[#1B3D87]" />
                <span className="text-[10px] font-black uppercase bg-[#1B3D87] text-white px-2 py-0.5 rounded">
                  Format A4
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm">Bon de Livraison ZIHAN</h4>
                <p className="text-xs text-muted-foreground">
                  Modèle officiel avec bande verticale bleue, QR code, Code128 et montant à encaisser.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold"
                onClick={() => handleOpenDoc('delivery_note')}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Prévisualiser / Imprimer
              </Button>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Receipt className="h-6 w-6 text-[#1B3D87]" />
                <span className="text-[10px] font-black uppercase bg-[#1B3D87] text-white px-2 py-0.5 rounded">
                  Format A4
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm">Facture Client</h4>
                <p className="text-xs text-muted-foreground">
                  Facture conforme aux normes comptables avec calcul automatique de la TVA (19%).
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold"
                onClick={() => handleOpenDoc('invoice')}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Prévisualiser / Imprimer
              </Button>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Truck className="h-6 w-6 text-[#1B3D87]" />
                <span className="text-[10px] font-black uppercase bg-[#1B3D87] text-white px-2 py-0.5 rounded">
                  Format A4
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm">Bordereau de Tournée</h4>
                <p className="text-xs text-muted-foreground">
                  Liste des colis assignés, émargements et total des montants COD à collecter.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold"
                onClick={() => handleOpenDoc('manifest')}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Prévisualiser / Imprimer
              </Button>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Tag className="h-6 w-6 text-[#1B3D87]" />
                <span className="text-[10px] font-black uppercase bg-[#EA4E52] text-white px-2 py-0.5 rounded">
                  Format A6
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm">Étiquette Thermique Colis</h4>
                <p className="text-xs text-muted-foreground">
                  Format compact 100x150mm autocollant avec grand code-barres et mention COD en gras.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold"
                onClick={() => handleOpenDoc('label')}
                leftIcon={<Eye className="h-4 w-4" />}
              >
                Prévisualiser / Imprimer
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Matrice des 13 Statuts Logistiques (Section 19) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-[#1B3D87] dark:text-blue-400" />
          <h2 className="text-lg font-bold tracking-tight">
            Matrice Complète des 13 Statuts Logistiques (Section 19)
          </h2>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {allStatuses.map((st) => (
                <div
                  key={st}
                  className="rounded-xl border border-border p-3 space-y-1.5 bg-background shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <StatusBadge status={st} size="sm" showDot />
                    <span className="font-mono text-[9px] text-muted-foreground uppercase">{st}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {PARCEL_STATUSES[st].description}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Official Brand Logo Variations (Section 14) */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#1B3D87] dark:text-blue-400" />
          <h2 className="text-lg font-bold tracking-tight">
            Déclinaisons Officielles du Logo ZIHAN (Bouclier + Ailes + Lettre Z)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <ZihanOfficialLogo size="lg" variant="horizontal" showTagline={true} />
            <p className="text-[11px] font-bold text-muted-foreground">Version Horizontale Standard</p>
          </Card>

          <Card className="flex flex-col items-center justify-center p-6 text-center space-y-3">
            <ZihanOfficialLogo size="xl" variant="full" showTagline={true} />
            <p className="text-[11px] font-bold text-muted-foreground">Version Complète Empilée</p>
          </Card>

          <Card className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-[#1B3D87] text-white">
            <div className="p-2.5 bg-white rounded-xl shadow-md">
              <ZihanOfficialLogo size="lg" variant="horizontal" showTagline={true} />
            </div>
            <p className="text-[11px] font-bold text-white/80">Support Fond Bleu Foncé</p>
          </Card>
        </div>
      </section>

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        initialType={activeDocType}
      />
    </div>
  );
};
