import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Truck,
  Zap,
  CheckCircle2,
  Package,
  Phone,
  Mail,
  ArrowRight,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';

export const LandingPage: React.FC = () => {
  const [trackingNumber, setTrackingNumber] = useState<string>('');
  const navigate = useNavigate();

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber.trim()) {
      navigate(`/tracking/${trackingNumber.trim().toUpperCase()}`);
    }
  };

  const steps = [
    {
      num: '01',
      title: 'Création du Bon',
      desc: 'Saisie rapide en 5 étapes et impression instantanée de votre bon de livraison.',
      icon: Package,
    },
    {
      num: '02',
      title: 'Collecte Prioritaire',
      desc: 'Notre livreur récupère vos colis directement à votre adresse ou boutique.',
      icon: Truck,
    },
    {
      num: '03',
      title: 'Acheminement Sécurisé',
      desc: 'Tri optimisé dans notre hub central de Nouvelle Médina et suivi en direct.',
      icon: Zap,
    },
    {
      num: '04',
      title: 'Livraison & Reversement',
      desc: 'Remise au destinataire et virement instantané de vos fonds collectés (COD).',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Public Navbar */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <ZihanOfficialLogo size="md" variant="horizontal" showTagline={true} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-foreground">
            <a href="#how-it-works" className="hover:text-foreground transition-colors">Comment ça marche</a>
            <a href="#services" className="hover:text-foreground transition-colors">Nos Services</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Espace Client</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link to="/admin">Espace Pro</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section (Section 29) */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EEF3F9] via-background to-background dark:from-slate-900/60 dark:via-background dark:to-background py-16 sm:py-24">
        <div className="container mx-auto px-4 sm:px-6 text-center space-y-6 max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white dark:bg-slate-800 px-4 py-1 text-xs font-bold text-[#1B3D87] dark:text-blue-400 shadow-xs">
            <Sparkles className="h-4 w-4 text-[#EA4E52]" />
            <span>Transport Express & Logistique Intelligente en Tunisie</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#162033] dark:text-white leading-tight">
            Vos colis, livrés <span className="text-[#1B3D87] dark:text-blue-400">rapidement</span> et en toute <span className="text-[#EA4E52]">confiance</span>.
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ZIHAN Super Delivery Express simplifie vos expéditions e-commerce et professionnelles partout en Tunisie avec un suivi en temps réel et un reversement express du COD.
          </p>

          {/* Instant Tracking Form embedded in Hero (Section 29) */}
          <div className="max-w-xl mx-auto pt-4">
            <form
              onSubmit={handleTrack}
              className="flex flex-col sm:flex-row gap-2 p-2 rounded-2xl border-2 border-[#1B3D87] bg-card shadow-xl"
            >
              <div className="relative flex-1 flex items-center">
                <Search className="absolute left-3.5 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Entrez votre numéro de suivi (ex: ZH000153)"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="h-12 w-full rounded-xl bg-transparent pl-11 pr-4 text-sm font-semibold placeholder:text-muted-foreground focus-visible:outline-none"
                />
              </div>
              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="h-12 px-6 font-bold"
                rightIcon={<ArrowRight className="h-4 w-4" />}
              >
                Suivre mon colis
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground mt-2">
              Testez avec le numéro de référence : <span className="font-mono font-bold text-[#1B3D87] dark:text-blue-400 cursor-pointer" onClick={() => setTrackingNumber('ZH000153')}>ZH000153</span>
            </p>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section id="how-it-works" className="py-16 border-t border-border/60 bg-card">
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#162033] dark:text-white">
              Comment ça marche ?
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Un processus logistique fluide, automatisé et transparent en 4 étapes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="rounded-2xl border border-border bg-background p-6 space-y-3 relative hover:border-[#1B3D87]/40 transition-colors shadow-xs"
                >
                  <span className="text-3xl font-black text-[#1B3D87]/20 dark:text-blue-400/20 font-mono">
                    {step.num}
                  </span>
                  <div className="h-10 w-10 rounded-xl bg-[#EEF3F9] dark:bg-slate-800 text-[#1B3D87] dark:text-blue-400 flex items-center justify-center font-bold">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-base text-foreground">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section (Section 27 & 29) */}
      <section id="pricing" className="py-16 bg-[#EEF3F9] dark:bg-slate-900/40 border-t border-border/60">
        <div className="container mx-auto px-4 sm:px-6 space-y-12">
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-black text-[#162033] dark:text-white">
              Grille Tarifaire Transparente
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tarification simple, fixe et sans frais cachés pour tous vos envois.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Grand Tunis */}
            <Card className="border-2 border-[#1B3D87] shadow-lg relative overflow-hidden">
              <div className="bg-[#1B3D87] text-white text-[10px] font-black uppercase text-center py-1">
                Zone Urbaine Prioritaire
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-foreground">Grand Tunis</h3>
                  <p className="text-xs text-muted-foreground">
                    Tunis, Ariana, Ben Arous, Manouba
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#1B3D87] dark:text-blue-400 font-mono">
                    7,000
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">DT / colis</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border">
                  <li className="flex items-center gap-2">✓ Livraison 24h chrono (Même jour possible)</li>
                  <li className="flex items-center gap-2">✓ Collecte à domicile gratuite dès 3 colis</li>
                  <li className="flex items-center gap-2">✓ Gestion du paiement à la livraison (COD)</li>
                  <li className="flex items-center gap-2">✓ Suivi par SMS et QR Code</li>
                </ul>
              </CardContent>
            </Card>

            {/* Hors Grand Tunis */}
            <Card className="border border-border shadow-md">
              <div className="bg-[#EEF3F9] dark:bg-slate-800 text-[#162033] dark:text-slate-300 text-[10px] font-black uppercase text-center py-1">
                Toutes Régions de Tunisie
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-black text-foreground">Hors Grand Tunis</h3>
                  <p className="text-xs text-muted-foreground">
                    Sousse, Sfax, Nabeul, Bizerte, Gabès et tous gouvernorats
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-[#162033] dark:text-white font-mono">
                    10,000
                  </span>
                  <span className="text-sm font-bold text-muted-foreground">DT / colis</span>
                </div>
                <ul className="space-y-2 text-xs text-muted-foreground pt-2 border-t border-border">
                  <li className="flex items-center gap-2">✓ Acheminement régional 24h à 48h</li>
                  <li className="flex items-center gap-2">✓ 2 tentatives de livraison incluses</li>
                  <li className="flex items-center gap-2">✓ Gestion et sécurisation du COD</li>
                  <li className="flex items-center gap-2">✓ Preuve de livraison dématérialisée</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="mt-auto border-t border-border/80 bg-card py-12">
        <div className="container mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="space-y-3 max-w-sm">
              <ZihanOfficialLogo size="md" variant="horizontal" showTagline={true} />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Leader du transport express et du service de livraison dernier kilomètre en Tunisie.
              </p>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-bold text-foreground uppercase tracking-wide">Hub Principal & Support</p>
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#EA4E52]" />
                Rue des anémones - Nouvelle Médina, Ben Arous
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-[#1B3D87]" />
                27 394 418 / 27 394 137
              </p>
              <p className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold">💬 WhatsApp :</span>
                <a href="https://wa.me/21627394418" target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold text-emerald-600">
                  +216 27 394 418
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-[#1B3D87]" />
                <a href="mailto:samiayed1965@gmail.com" className="hover:underline">
                  samiayed1965@gmail.com
                </a>
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <p>© {new Date().getFullYear()} ZIHAN Super Delivery Express. Tous droits réservés.</p>
            <p>Matricule Fiscal : 1845239/M/A/000</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
