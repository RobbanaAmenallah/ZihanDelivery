import React from 'react';
import {
  Clock,
  CheckCircle,
  UserCheck,
  PackageCheck,
  Truck,
  PhoneCall,
  CheckCircle2,
  CalendarClock,
  UserX,
  MapPinOff,
  AlertTriangle,
  RotateCcw,
  XCircle,
  ShieldAlert,
} from 'lucide-react';

export type ParcelStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'contacted'
  | 'delivered'
  | 'rescheduled'
  | 'customer_absent'
  | 'wrong_address'
  | 'failed'
  | 'returned'
  | 'cancelled'
  | 'refused';

export interface StatusMeta {
  key: ParcelStatus;
  label: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
  icon: React.ElementType;
  description: string;
}

export const PARCEL_STATUSES: Record<ParcelStatus, StatusMeta> = {
  pending: {
    key: 'pending',
    label: 'En attente',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    textColor: 'text-amber-700 dark:text-amber-300',
    borderColor: 'border-amber-200 dark:border-amber-800',
    dotColor: 'bg-amber-500',
    icon: Clock,
    description: 'Bon créé, en attente de validation par ZIHAN',
  },
  accepted: {
    key: 'accepted',
    label: 'Accepté',
    badgeBg: 'bg-blue-50 dark:bg-blue-950/40',
    textColor: 'text-[#1B3D87] dark:text-blue-300',
    borderColor: 'border-blue-200 dark:border-blue-800',
    dotColor: 'bg-[#1B3D87]',
    icon: CheckCircle,
    description: 'Colis validé et pris en charge par le hub ZIHAN',
  },
  assigned: {
    key: 'assigned',
    label: 'Attribué',
    badgeBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    textColor: 'text-indigo-700 dark:text-indigo-300',
    borderColor: 'border-indigo-200 dark:border-indigo-800',
    dotColor: 'bg-indigo-600',
    icon: UserCheck,
    description: 'Assigné à la tournée d\'un livreur',
  },
  picked_up: {
    key: 'picked_up',
    label: 'Récupéré',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/40',
    textColor: 'text-purple-700 dark:text-purple-300',
    borderColor: 'border-purple-200 dark:border-purple-800',
    dotColor: 'bg-purple-600',
    icon: PackageCheck,
    description: 'Colis récupéré chez l\'expéditeur',
  },
  in_transit: {
    key: 'in_transit',
    label: 'En route',
    badgeBg: 'bg-sky-50 dark:bg-sky-950/40',
    textColor: 'text-sky-700 dark:text-sky-300',
    borderColor: 'border-sky-200 dark:border-sky-800',
    dotColor: 'bg-sky-500',
    icon: Truck,
    description: 'En cours d\'acheminement vers le destinataire',
  },
  contacted: {
    key: 'contacted',
    label: 'Client contacté',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    dotColor: 'bg-cyan-500',
    icon: PhoneCall,
    description: 'Destinataire joint pour confirmer l\'adresse et l\'heure',
  },
  delivered: {
    key: 'delivered',
    label: 'Livré',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: CheckCircle2,
    description: 'Colis livré et montant collecté avec succès',
  },
  rescheduled: {
    key: 'rescheduled',
    label: 'Reporté',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    textColor: 'text-orange-700 dark:text-orange-300',
    borderColor: 'border-orange-200 dark:border-orange-800',
    dotColor: 'bg-orange-500',
    icon: CalendarClock,
    description: 'Livraison reportée à la demande du client',
  },
  customer_absent: {
    key: 'customer_absent',
    label: 'Client absent',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/40',
    textColor: 'text-amber-800 dark:text-amber-200',
    borderColor: 'border-amber-300 dark:border-amber-700',
    dotColor: 'bg-amber-600',
    icon: UserX,
    description: 'Le destinataire n\'était pas joignable ou présent',
  },
  wrong_address: {
    key: 'wrong_address',
    label: 'Adresse incorrecte',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    textColor: 'text-rose-700 dark:text-rose-300',
    borderColor: 'border-rose-200 dark:border-rose-800',
    dotColor: 'bg-rose-500',
    icon: MapPinOff,
    description: 'Adresse incomplète ou introuvable',
  },
  failed: {
    key: 'failed',
    label: 'Livraison échouée',
    badgeBg: 'bg-red-50 dark:bg-red-950/40',
    textColor: 'text-red-700 dark:text-red-300',
    borderColor: 'border-red-200 dark:border-red-800',
    dotColor: 'bg-red-500',
    icon: AlertTriangle,
    description: 'Échec de la tentative de livraison',
  },
  returned: {
    key: 'returned',
    label: 'Retourné',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    textColor: 'text-slate-700 dark:text-slate-300',
    borderColor: 'border-slate-300 dark:border-slate-700',
    dotColor: 'bg-slate-600',
    icon: RotateCcw,
    description: 'Colis retourné au centre ou à l\'expéditeur',
  },
  cancelled: {
    key: 'cancelled',
    label: 'Annulé',
    badgeBg: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
    borderColor: 'border-gray-300 dark:border-gray-700',
    dotColor: 'bg-gray-400',
    icon: XCircle,
    description: 'Expédition annulée par le client',
  },
  refused: {
    key: 'refused',
    label: 'Refusé',
    badgeBg: 'bg-[#FEECEC] dark:bg-red-950/50',
    textColor: 'text-[#EA4E52] dark:text-[#EF4D52]',
    borderColor: 'border-[#FCD4D4] dark:border-red-900',
    dotColor: 'bg-[#EA4E52]',
    icon: ShieldAlert,
    description: 'Colis refusé par le destinataire',
  },
};
