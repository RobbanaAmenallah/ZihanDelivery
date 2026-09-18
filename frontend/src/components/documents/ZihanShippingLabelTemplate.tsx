import React from 'react';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { Barcode } from './Barcode';
import { QrCode } from './QrCode';
import { Phone, AlertTriangle } from 'lucide-react';

export interface LabelData {
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  senderAddress?: string;
  recipientName: string;
  recipientPhone: string;
  secondaryPhone?: string;
  address: string;
  city: string;
  governorate: string;
  delegation?: string;
  postalCode?: string;
  description?: string;
  quantity?: number;
  weight?: number;
  amountToCollect: number;
  goodsAmount?: number;
  deliveryFee?: number;
  isFragile?: boolean;
  notes?: string;
  date: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const sampleLabelData: LabelData = {
  trackingNumber: 'ZH000153',
  senderName: 'Boutique Express Mode',
  senderPhone: '+216 71 888 999',
  senderAddress: '12 Rue des Entrepreneurs, Charguia 2',
  recipientName: 'Mohamed Ben Ali',
  recipientPhone: '+216 22 000 000',
  secondaryPhone: '+216 98 111 222',
  address: 'Résidence Ennasr, Bloc B, Apt 14, Avenue Hédi Nouira',
  city: 'Nouvelle Médina',
  governorate: 'Ben Arous',
  delegation: 'Nouvelle Médina',
  postalCode: '2063',
  description: 'Chaussures Sport ZIHAN Runner Pro',
  quantity: 1,
  weight: 1.2,
  amountToCollect: 80.0,
  goodsAmount: 70.0,
  deliveryFee: 10.0,
  isFragile: true,
  notes: 'Appeler 15 min avant arrivée.',
  date: '21/08/2026',
};

interface ZihanShippingLabelTemplateProps {
  data?: LabelData;
}

export const ZihanShippingLabelTemplate: React.FC<ZihanShippingLabelTemplateProps> = ({
  data = sampleLabelData,
}) => {
  const isCOD = Number(data.amountToCollect) > 0;

  return (
    <div className="w-[100mm] sm:w-[105mm] max-w-[105mm] bg-white text-black font-sans text-[11px] leading-tight select-none border-2 border-black rounded-none shadow-md print:shadow-none print:border-2 print:border-black print:m-0 mx-auto box-border">
      {/* ── 1. Header Bar: Brand + Service Type + Date ───────────────────── */}
      <div className="p-2 border-b-2 border-black flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ZihanOfficialLogo size="sm" variant="horizontal" showTagline={false} />
        </div>
        <div className="text-right">
          <div className="inline-block bg-black text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-xs tracking-wider">
            EXPRESS 24H
          </div>
          <p className="text-[9px] font-bold text-gray-700 mt-0.5 font-mono">
            {data.date}
          </p>
        </div>
      </div>

      {/* ── 2. Destination Hub Banner ──────────────────────────────────────── */}
      <div className="bg-black text-white py-1.5 px-2 text-center border-b-2 border-black">
        <p className="text-[10px] font-bold tracking-widest uppercase text-gray-300">
          DESTINATION GOUVERNORAT
        </p>
        <p className="text-base sm:text-lg font-black uppercase tracking-wider">
          {data.governorate || 'TUNIS'} {data.city ? `• ${data.city}` : ''}
        </p>
      </div>

      {/* ── 3. Barcode & Tracking Number ─────────────────────────────────── */}
      <div className="py-2.5 px-2 text-center border-b-2 border-black bg-white flex flex-col items-center justify-center">
        <Barcode
          value={data.trackingNumber}
          width={240}
          height={48}
          showText={false}
          className="bg-transparent p-0"
        />
        <div className="flex items-center justify-between w-full px-2 mt-1">
          <span className="font-mono text-sm sm:text-base font-black tracking-widest text-black">
            *{data.trackingNumber}*
          </span>
          <span className="text-[10px] font-bold text-gray-800 font-mono bg-gray-100 px-1.5 py-0.5 border border-gray-300">
            {data.weight ? `${data.weight} kg` : '1.0 kg'} • Qté: {data.quantity || 1}
          </span>
        </div>
      </div>

      {/* ── 4. Recipient Details (DESTINATAIRE) ─────────────────────────────── */}
      <div className="p-2 border-b-2 border-black bg-white space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider bg-gray-200 px-1.5 py-0.5 border border-gray-400">
            DESTINATAIRE
          </span>
          <span className="text-[10px] font-black uppercase text-black">
            {data.governorate}
          </span>
        </div>

        <p className="text-sm font-black text-black uppercase tracking-wide">
          {data.recipientName}
        </p>

        <p className="text-[11px] font-medium text-gray-900 leading-snug">
          {data.address}
          {data.city && <span className="font-bold">, {data.city}</span>}
          {data.postalCode && <span className="font-mono"> ({data.postalCode})</span>}
        </p>

        {/* High-visibility Phone Pill */}
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <div className="flex items-center gap-1 bg-black text-white px-2 py-0.5 font-mono text-xs font-black">
            <Phone className="h-3 w-3" />
            <span>{data.recipientPhone}</span>
          </div>
          {data.secondaryPhone && (
            <div className="flex items-center gap-1 bg-gray-100 text-black border border-black px-2 py-0.5 font-mono text-xs font-bold">
              <span>{data.secondaryPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Sender & Parcel Details (2-Column Grid) ────────────────────── */}
      <div className="grid grid-cols-2 border-b-2 border-black text-[10px]">
        {/* Expéditeur */}
        <div className="p-2 border-r border-black space-y-0.5">
          <span className="text-[9px] font-black uppercase text-gray-600 block">
            EXPÉDITEUR
          </span>
          <p className="font-bold text-black truncate">{data.senderName}</p>
          <p className="font-mono text-gray-800">{data.senderPhone}</p>
          {data.senderAddress && (
            <p className="text-[9px] text-gray-600 truncate">{data.senderAddress}</p>
          )}
        </div>

        {/* Colis / Marchandise */}
        <div className="p-2 space-y-0.5 bg-gray-50">
          <span className="text-[9px] font-black uppercase text-gray-600 block">
            CONTENU COLIS
          </span>
          <p className="font-bold text-black truncate">
            {data.description || 'Marchandise'}
          </p>
          <div className="flex items-center gap-1 pt-0.5">
            {data.isFragile && (
              <span className="inline-flex items-center gap-0.5 text-[8px] font-black uppercase bg-red-600 text-white px-1 py-0.5">
                <AlertTriangle className="h-2.5 w-2.5" /> FRAGILE
              </span>
            )}
            <span className="text-[9px] text-gray-600 font-mono">
              Nb: {data.quantity || 1}
            </span>
          </div>
        </div>
      </div>

      {/* ── 6. Montant à Encaisser (COD) ──────────────────────────────────── */}
      <div className="p-2.5 border-b-2 border-black bg-black text-white flex items-center justify-between">
        <div>
          <span className="text-[9px] font-black uppercase tracking-wider block text-gray-300">
            {isCOD ? 'MONTANT À ENCAISSER (COD)' : 'STATUT DU RÈGLEMENT'}
          </span>
          <span className="text-[10px] font-bold text-gray-300">
            {isCOD ? 'Espèces à la livraison' : 'Déjà Réglé / Gratuit'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg sm:text-xl font-black font-mono tracking-tight text-white">
            {isCOD ? `${Number(data.amountToCollect).toFixed(3)} DT` : '0.000 DT'}
          </span>
        </div>
      </div>

      {/* ── 7. Footer: Instructions, Signature & QR Code ──────────────────── */}
      <div className="p-2 flex items-center justify-between gap-2 bg-white">
        <div className="flex-1 space-y-1">
          {data.notes ? (
            <p className="text-[9px] font-bold text-black italic leading-tight">
              Note: {data.notes}
            </p>
          ) : (
            <p className="text-[8px] text-gray-600">
              Colis acheminé par ZIHAN Logistics Express • www.zihan.tn
            </p>
          )}
          <div className="pt-1">
            <p className="text-[8px] font-bold text-gray-600">
              Signature client : _____________________
            </p>
          </div>
        </div>

        <div className="shrink-0 p-1 border border-black bg-white">
          <QrCode
            value={`https://app.zihan.tn/tracking/${data.trackingNumber}`}
            size={44}
          />
        </div>
      </div>
    </div>
  );
};
