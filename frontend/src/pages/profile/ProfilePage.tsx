import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  AlertCircle,
  Truck,
  Package,
  Shield,
  MapPin,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient, getActiveSupabaseConfig } from '@/services/supabase';
import { type UserProfile } from '@/types';

// ─── Role badge config ────────────────────────────────────────────────────────

const roleConfig = {
  admin: { label: 'Administrateur', icon: Shield, color: 'text-[#1B3D87] bg-blue-50 border-blue-200' },
  driver: { label: 'Livreur', icon: Truck, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  client: { label: 'Client Expéditeur', icon: Package, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

export const ProfilePage: React.FC = () => {
  const { user, profile, updateUserProfile } = useAuth();

  // Profile form state
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [zone, setZone] = useState(profile?.zone ?? '');
  const [vehicle, setVehicle] = useState(profile?.vehicle ?? '');
  const [companyName, setCompanyName] = useState(profile?.company_name ?? '');

  // Synchronize with loaded profile
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? '');
      setPhone(profile.phone ?? '');
      setZone(profile.zone ?? '');
      setVehicle(profile.vehicle ?? '');
      setCompanyName(profile.company_name ?? '');
    }
  }, [profile]);

  // Password form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const role = profile?.role ?? 'client';
  const cfg = roleConfig[role];
  const RoleIcon = cfg.icon;

  const initials = (profile?.full_name ?? 'ZI')
    .split(' ')
    .map((n) => n[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // ── Save profile info (Real-time DB sync) ──────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg(null);

    try {
      const updates: Partial<UserProfile> = {
        full_name: fullName.trim(),
        phone: phone.trim(),
      };
      if (role === 'driver') {
        updates.zone = zone.trim();
        updates.vehicle = vehicle.trim();
      }
      if (role === 'client') {
        updates.company_name = companyName.trim();
      }

      const res = await updateUserProfile(updates);
      if (res.success) {
        setProfileMsg({ type: 'success', text: '✅ Profil mis à jour en temps réel dans la base de données !' });
      } else {
        setProfileMsg({ type: 'error', text: res.error || 'Erreur lors de la mise à jour du profil' });
      }
    } catch (err) {
      setProfileMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSavingProfile(false);
      setTimeout(() => setProfileMsg(null), 4000);
    }
  };

  // ── Change password ─────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Le mot de passe doit faire au moins 8 caractères.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setIsSavingPassword(true);

    const { isConfigured } = getActiveSupabaseConfig();
    const client = getSupabaseClient();

    if (isConfigured) {
      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordMsg({ type: 'error', text: `Erreur : ${error.message}` });
      } else {
        setPasswordMsg({ type: 'success', text: 'Mot de passe changé avec succès !' });
        setNewPassword('');
        setConfirmPassword('');
      }
    } else {
      setPasswordMsg({ type: 'success', text: 'Mot de passe changé (mode démo — non persisté).' });
    }

    setIsSavingPassword(false);
    setTimeout(() => setPasswordMsg(null), 5000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-4">
        <h1 className="text-2xl font-black tracking-tight text-[#162033] dark:text-white">Mon Profil</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Gérez vos informations personnelles et votre sécurité.</p>
      </div>

      {/* Avatar + Identity Card */}
      <Card className="shadow-sm">
        <CardContent className="p-5 flex items-center gap-4">
          {/* Avatar */}
          <div className="h-16 w-16 rounded-full bg-[#1B3D87] flex items-center justify-center text-white text-2xl font-black shrink-0 ring-4 ring-[#1B3D87]/20">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-foreground truncate">{profile?.full_name || 'Utilisateur'}</h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <div className="mt-1.5">
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                <RoleIcon className="h-3.5 w-3.5" />
                {cfg.label}
              </span>
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground hidden sm:block">
            <p className="font-semibold">Membre depuis</p>
            <p>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : '—'}</p>
          </div>
        </CardContent>
      </Card>

      {/* Profile Info Form */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-black text-[#1B3D87] uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            Informations Personnelles
          </h3>

          <form onSubmit={handleSaveProfile} className="space-y-3">
            {/* Status message */}
            {profileMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-semibold ${
                profileMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {profileMsg.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                }
                {profileMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nom Complet *"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                leftIcon={<User className="h-4 w-4" />}
              />
              <Input
                label="Numéro de Téléphone *"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                leftIcon={<Phone className="h-4 w-4" />}
                placeholder="+216 XX XXX XXX"
              />
            </div>

            {/* Driver-specific fields */}
            {role === 'driver' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <Input
                  label="Zone Géographique"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  leftIcon={<MapPin className="h-4 w-4" />}
                  placeholder="Ex: Grand Tunis — Ben Arous"
                />
                <Input
                  label="Véhicule"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  leftIcon={<Car className="h-4 w-4" />}
                  placeholder="Ex: Citroën Berlingo (194 TUN 8840)"
                />
              </div>
            )}

            {/* Client-specific fields */}
            {role === 'client' && (
              <Input
                label="Raison Sociale / Nom Boutique"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                leftIcon={<Package className="h-4 w-4" />}
                placeholder="Ex: Boutique Mode Express"
              />
            )}

            {/* Read-only email */}
            <div>
              <label className="text-xs font-bold text-foreground mb-1 block">Adresse Email (non modifiable)</label>
              <div className="h-9 px-3 flex items-center rounded-lg border border-border bg-muted/40 text-xs text-muted-foreground font-mono">
                {user?.email ?? '—'}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                isLoading={isSavingProfile}
                className="bg-[#1B3D87] hover:bg-[#1D5AA5] text-white font-bold"
                leftIcon={<Save className="h-4 w-4" />}
              >
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password Change Form */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <h3 className="text-sm font-black text-[#EA4E52] uppercase tracking-wider mb-4 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Changer le Mot de Passe
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3">
            {/* Status message */}
            {passwordMsg && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-xs font-semibold ${
                passwordMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {passwordMsg.type === 'success'
                  ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                }
                {passwordMsg.text}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* New Password */}
              <div className="relative">
                <Input
                  label="Nouveau Mot de Passe *"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  leftIcon={<Lock className="h-4 w-4" />}
                  placeholder="Min. 8 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <Input
                  label="Confirmer le Nouveau Mot de Passe *"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  leftIcon={<Lock className="h-4 w-4" />}
                  placeholder="Répétez le mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-8 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Password strength indicator */}
            {newPassword && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[8, 12, 16].map((len, i) => (
                    <div
                      key={len}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= len
                          ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-emerald-500'
                          : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {newPassword.length < 8 ? 'Trop court' : newPassword.length < 12 ? 'Acceptable' : newPassword.length < 16 ? 'Bien' : 'Très sécurisé'}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                isLoading={isSavingPassword}
                variant="outline"
                className="border-[#EA4E52] text-[#EA4E52] hover:bg-red-50 font-bold"
                leftIcon={<Lock className="h-4 w-4" />}
              >
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
