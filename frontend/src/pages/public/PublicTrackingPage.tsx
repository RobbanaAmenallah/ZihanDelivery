import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Package,
  CheckCircle,
  Truck,
  UserCheck,
  PackageCheck,
  CheckCircle2,
  ArrowLeft,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';

export const PublicTrackingPage: React.FC = () => {
  const { trackingNumber } = useParams<{ trackingNumber: string }>();
  const id = trackingNumber || 'ZH000153';

  // 6-step public logistics timeline (Section 31)
  const timelineSteps = [
    {
      step: 1,
      title: 'Bon créé',
      desc: 'Enregistré dans le système ZIHAN Express',
      date: '21 Août 2026, 09:30',
      done: true,
      icon: Package,
    },
    {
      step: 2,
      title: 'Accepté par ZIHAN',
      desc: 'Validé et pris en charge au Hub Central Nouvelle Médina',
      date: '21 Août 2026, 11:15',
      done: true,
      icon: CheckCircle,
    },
    {
      step: 3,
      title: 'Attribué au livreur',
      desc: 'Intégré à la tournée de distribution locale',
      date: '21 Août 2026, 13:00',
      done: true,
      icon: UserCheck,
    },
    {
      step: 4,
      title: 'Colis récupéré',
      desc: 'Chargé à bord du véhicule de livraison',
      date: '21 Août 2026, 14:10',
      done: true,
      icon: PackageCheck,
    },
    {
      step: 5,
      title: 'En cours de livraison',
      desc: 'Le livreur approche de votre adresse de destination',
      date: '21 Août 2026, 15:45',
      done: true,
      current: true,
      icon: Truck,
    },
    {
      step: 6,
      title: 'Livré',
      desc: 'Remis au destinataire',
      date: 'Estimation : Aujourd\'hui avant 18:00',
      done: false,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-slate-950 text-foreground flex flex-col font-sans">
      {/* Public Tracking Header */}
      <header className="border-b border-border/60 bg-white dark:bg-slate-900 shadow-xs">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/">
            <ZihanOfficialLogo size="md" variant="horizontal" showTagline={true} />
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Retour à l'accueil
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 max-w-3xl space-y-6">
        {/* Tracking Header Card */}
        <Card className="border-2 border-[#1B3D87]/20 shadow-card">
          <CardHeader className="bg-[#EEF3F9] dark:bg-slate-800/80 border-b border-border/60 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                  Suivi de Colis en Temps Réel
                </p>
                <h1 className="text-2xl sm:text-3xl font-black text-[#1B3D87] dark:text-blue-400 font-mono">
                  {id}
                </h1>
              </div>

              <div>
                <StatusBadge status="in_transit" size="lg" showDot pulse />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Quick Public Details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground block">Destination</span>
                <span className="font-bold text-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5 text-[#EA4E52]" />
                  Nouvelle Médina, Ben Arous
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Service</span>
                <span className="font-bold text-foreground block mt-0.5">
                  ZIHAN Super Express
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Dernière mise à jour</span>
                <span className="font-bold text-foreground block mt-0.5">
                  21 Août 2026, 15:45
                </span>
              </div>
            </div>

            {/* 6-Stage Timeline (Section 31) */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Chronologie d'Acheminement
              </h3>

              <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#DCE3EC] dark:before:bg-slate-800">
                {timelineSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.step} className="relative group">
                      {/* Step Dot Icon */}
                      <div
                        className={`absolute -left-8 top-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all ${
                          step.done
                            ? 'bg-[#1B3D87] border-[#1B3D87] text-white shadow-xs'
                            : 'bg-card border-border text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4
                            className={`text-sm font-bold ${
                              step.current
                                ? 'text-[#1B3D87] dark:text-blue-400 font-black'
                                : 'text-foreground'
                            }`}
                          >
                            {step.title}
                          </h4>
                          {step.current && (
                            <span className="text-[10px] font-black uppercase bg-[#EA4E52] text-white px-2 py-0.2 rounded-full animate-pulse">
                              En cours
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{step.desc}</p>
                        <p className="text-[10px] text-muted-foreground/80 font-mono">
                          {step.date}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Privacy & Security Guarantee */}
            <div className="rounded-xl bg-[#EEF3F9] dark:bg-slate-800/60 p-3.5 border border-[#DCE3EC] dark:border-slate-700/60 flex items-center gap-3 text-xs">
              <ShieldCheck className="h-5 w-5 text-[#1B3D87] dark:text-blue-400 shrink-0" />
              <p className="text-muted-foreground leading-relaxed">
                Ce suivi public garantit la confidentialité des données financières et coordonnées privées de l'expéditeur et du destinataire.
              </p>
            </div>

            {/* Support Help Block */}
            <div className="text-center pt-2 text-xs text-muted-foreground space-y-1">
              <p>Une question sur votre livraison ? Contactez le service client ZIHAN :</p>
              <p className="font-semibold text-foreground">
                📞 27 394 418 / 27 394 137 &nbsp;•&nbsp; 💬 WhatsApp :{' '}
                <a href="https://wa.me/21627394418" target="_blank" rel="noopener noreferrer" className="text-emerald-600 font-bold hover:underline">
                  +216 27 394 418
                </a>
                &nbsp;•&nbsp; ✉️ samiAyed1965@gmail.com
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};
