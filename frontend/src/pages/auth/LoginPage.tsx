import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/routes/paths';
import { type UserRole } from '@/types';

export const LoginPage: React.FC = () => {
  const { user, role, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Where to redirect after login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const getRoleRedirect = (r: UserRole): string => {
    if (r === 'driver') return ROUTES.DRIVER;
    if (r === 'client') return ROUTES.CLIENT;
    return ROUTES.ADMIN;
  };

  // Purge any leftover demo/fake localStorage session on page load
  useEffect(() => {
    localStorage.removeItem('zihan_demo_user');
  }, []);

  // Auto redirect if user is already authenticated via Supabase
  useEffect(() => {
    if (user && role) {
      navigate(from ?? getRoleRedirect(role), { replace: true });
    }
  }, [user, role, from, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setIsLoading(true);
    const { error, role: resolvedRole } = await signIn(email.trim(), password);
    setIsLoading(false);

    if (error) {
      if (
        error.message.includes('Invalid login credentials') ||
        error.message.includes('invalid_credentials')
      ) {
        setErrorMsg('Email ou mot de passe incorrect. Vérifiez vos identifiants.');
      } else if (error.message.includes('Email not confirmed')) {
        setErrorMsg(
          "Votre adresse email n'est pas encore confirmée. Vérifiez votre boîte mail.",
        );
      } else if (error.message.includes('Too many requests')) {
        setErrorMsg('Trop de tentatives. Réessayez dans quelques minutes.');
      } else {
        setErrorMsg(`Erreur Supabase : ${error.message}`);
      }
      return;
    }

    // Direct navigation using resolved role
    const destination = from ?? getRoleRedirect(resolvedRole);
    navigate(destination, { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans">
      {/* ── Left Brand Panel ───────────────────────────────────────────────── */}
      <div className="hidden md:flex md:w-1/2 bg-[#1B3D87] text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#1D5AA5]/40 blur-3xl pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-96 w-96 rounded-full bg-[#EA4E52]/20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10">
          <Link
            to={ROUTES.HOME}
            className="inline-block p-3 bg-white rounded-2xl shadow-md border border-white/20 hover:shadow-lg transition-all"
          >
            <ZihanOfficialLogo size="lg" variant="horizontal" showTagline={true} />
          </Link>
        </div>

        {/* Value proposition */}
        <div className="relative z-10 space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-white border border-white/20">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Portail Sécurisé ZIHAN Logistics</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Pilotez l'ensemble de vos expéditions en toute sérénité.
          </h2>

          <ul className="space-y-3 text-sm text-white/80">
            {[
              'Génération instantanée de bons et étiquettes thermiques',
              'Suivi GPS en direct des chauffeurs et des tournées',
              'Reversement automatisé des encaissements COD sous 24h',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EA4E52] text-white text-[10px] font-bold">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Empty spacing placeholder to keep justify-between layout balanced */}
        <div className="relative z-10" />
      </div>

      {/* ── Right Form Panel ───────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-card">
        {/* Mobile logo */}
        <div className="md:hidden mb-8 text-center flex justify-center">
          <Link
            to={ROUTES.HOME}
            className="inline-block p-2 bg-white rounded-xl shadow-xs border border-border"
          >
            <ZihanOfficialLogo size="md" variant="horizontal" showTagline={true} />
          </Link>
        </div>

        <div className="w-full max-w-md space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight text-[#162033] dark:text-white">
              Connexion à votre espace
            </h2>
            <p className="text-sm text-muted-foreground">
              Entrez vos identifiants pour accéder à votre tableau de bord ZIHAN.
            </p>
          </div>

          {/* Error banner */}
          {errorMsg && (
            <div className="flex items-start gap-3 rounded-xl border border-[#EA4E52]/40 bg-[#FEECEC] p-3.5 text-xs text-[#EA4E52]">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-semibold leading-snug">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Adresse Email Professionnelle"
              type="email"
              placeholder="contact@entreprise.tn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="h-4 w-4" />}
              disabled={isLoading}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Mot de passe"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-[38px] text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Portail Super Admin ZIHAN</span>
              <a
                href="#forgot"
                className="font-bold text-[#1B3D87] hover:underline dark:text-blue-400"
              >
                Mot de passe oublié ?
              </a>
            </div>

            <Button
              type="submit"
              variant="default"
              size="lg"
              className="w-full font-bold h-11"
              isLoading={isLoading}
              rightIcon={!isLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              {isLoading ? 'Connexion en cours…' : 'Se connecter'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
