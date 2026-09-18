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
  description: 'Chaussures Sport ZIHAN Runner Pro (Taille 42)',
  quantity: 1,
  weight: 1.2,
  amountToCollect: 80.0,
  goodsAmount: 70.0,
  deliveryFee: 10.0,
  isFragile: true,
  notes: 'Appeler 15 min avant arrivée. Laisser chez le gardien si absent.',
  date: '18/09/2026 14:30',
};

interface ZihanShippingLabelTemplateProps {
  data?: LabelData;
}

export const ZihanShippingLabelTemplate: React.FC<ZihanShippingLabelTemplateProps> = ({
  data = sampleLabelData,
}) => {
  const isCOD = Number(data.amountToCollect) > 0;

  return (
    <div
      className="w-[100mm] h-[150mm] max-w-[100mm] max-h-[150mm] min-w-[100mm] min-h-[150mm] box-border bg-white text-black font-sans text-[10.5px] leading-tight select-none border-[2.5px] border-black rounded-none shadow-md print:shadow-none print:border-[2.5px] print:border-black print:m-0 mx-auto flex flex-col justify-between overflow-hidden relative"
      style={{
        width: '100mm',
        height: '150mm',
        maxWidth: '100mm',
        maxHeight: '150mm',
        boxSizing: 'border-box',
      }}
    >
      {/* ── 1. Header Bar: Brand + Service Type + Date ───────────────────── */}
      <div className="px-2 py-1.5 border-b-2 border-black flex items-center justify-between gap-2 shrink-0 bg-white">
        <div className="flex items-center gap-2">
          <ZihanOfficialLogo size="sm" variant="horizontal" showTagline={false} />
        </div>
        <div className="text-right">
          <div className="inline-block bg-black text-white text-[9px] font-black uppercase px-2 py-0.5 tracking-wider">
            EXPRESS 24H
          </div>
          <p className="text-[8.5px] font-bold text-gray-800 mt-0.5 font-mono">
            {data.date}
          </p>
        </div>
      </div>

      {/* ── 2. Destination Hub Banner ──────────────────────────────────────── */}
      <div className="bg-black text-white py-1 px-2 text-center border-b-2 border-black shrink-0">
        <p className="text-[8px] font-extrabold tracking-widest uppercase text-gray-300">
          DESTINATION GOUVERNORAT &amp; VILLE
        </p>
        <p className="text-[14px] font-black uppercase tracking-wide leading-tight mt-0.5 break-words">
          {data.governorate || 'TUNIS'} {data.city ? `• ${data.city}` : ''}
        </p>
      </div>

      {/* ── 3. Barcode & Tracking Identifier ─────────────────────────────────── */}
      <div className="py-1 px-2 text-center border-b-2 border-black bg-white shrink-0 flex flex-col items-center justify-center">
        <Barcode
          value={data.trackingNumber}
          width={220}
          height={38}
          showText={false}
          className="bg-transparent p-0 m-0"
        />
        <div className="flex items-center justify-between w-full px-1 mt-0.5">
          <span className="text-[8.5px] font-bold text-gray-700 font-mono">
            Qté: {data.quantity || 1}
          </span>
          <span className="font-mono text-[13px] font-black tracking-widest text-black">
            *{data.trackingNumber}*
          </span>
          <span className="text-[8.5px] font-bold text-gray-700 font-mono">
            Poids: {data.weight ? `${data.weight} kg` : '1.0 kg'}
          </span>
        </div>
      </div>

      {/* ── 4. Recipient Details (DESTINATAIRE) ─────────────────────────────── */}
      <div className="px-2 py-1.5 border-b-2 border-black bg-white flex-1 flex flex-col justify-center overflow-hidden">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] font-black uppercase tracking-wider bg-black text-white px-1.5 py-0.5">
            DESTINATAIRE
          </span>
          <span className="text-[9px] font-black uppercase text-black font-mono">
            {data.governorate} {data.postalCode ? `(${data.postalCode})` : ''}
          </span>
        </div>

        <p className="text-[12px] font-black text-black uppercase leading-tight break-words">
          {data.recipientName}
        </p>

        <p className="text-[9.5px] font-semibold text-gray-900 leading-snug my-0.5 break-words">
          {data.address}
          {data.city && <span className="font-bold">, {data.city}</span>}
          {data.delegation && data.delegation !== data.city && (
            <span className="text-gray-700"> ({data.delegation})</span>
          )}
        </p>

        {/* High-visibility Phone Pill */}
        <div className="flex flex-wrap items-center gap-1 pt-0.5">
          <div className="inline-flex items-center gap-1 bg-black text-white px-1.5 py-0.5 font-mono text-[10.5px] font-black">
            <Phone className="h-2.5 w-2.5 text-white" />
            <span>{data.recipientPhone}</span>
          </div>
          {data.secondaryPhone && (
            <div className="inline-flex items-center gap-1 bg-gray-100 text-black border border-black px-1.5 py-0.5 font-mono text-[10px] font-bold">
              <span className="text-[8px] text-gray-600 font-sans">TÉL 2:</span>
              <span>{data.secondaryPhone}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── 5. Sender & Parcel Details (2-Column Grid) ────────────────────── */}
      <div className="grid grid-cols-2 border-b-2 border-black text-[9px] shrink-0 bg-white">
        {/* Expéditeur */}
        <div className="p-1.5 border-r border-black space-y-0.5 overflow-hidden">
          <span className="text-[7.5px] font-black uppercase text-gray-600 block">
            EXPÉDITEUR
          </span>
          <p className="font-extrabold text-black break-words leading-tight">{data.senderName}</p>
          <p className="font-mono text-gray-800 font-bold">{data.senderPhone}</p>
          {data.senderAddress && (
            <p className="text-[8px] text-gray-600 break-words leading-tight">{data.senderAddress}</p>
          )}
        </div>

        {/* Colis / Marchandise */}
        <div className="p-1.5 bg-gray-50/80 space-y-0.5 overflow-hidden">
          <span className="text-[7.5px] font-black uppercase text-gray-600 block">
            CONTENU &amp; CONSIGNES
          </span>
          <p className="font-bold text-black break-words leading-tight">
            {data.description || 'Marchandise'}
          </p>
          <div className="flex items-center gap-1 pt-0.5">
            {data.isFragile && (
              <span className="inline-flex items-center gap-0.5 text-[7.5px] font-black uppercase bg-black text-white px-1 py-0.5 border border-black">
                <AlertTriangle className="h-2 w-2 text-white" /> FRAGILE
              </span>
            )}
            <span className="text-[8px] text-gray-700 font-mono font-bold">
              Nb: {data.quantity || 1}
            </span>
          </div>
        </div>
      </div>

      {/* ── 6. Montant à Encaisser (COD) ──────────────────────────────────── */}
      <div className="px-2 py-1.5 border-b-2 border-black bg-black text-white flex items-center justify-between shrink-0">
        <div>
          <span className="text-[8px] font-black uppercase tracking-wider block text-gray-300">
            {isCOD ? 'MONTANT TOTAL À ENCAISSER (COD)' : 'STATUT DU RÈGLEMENT'}
          </span>
          <span className="text-[8.5px] font-bold text-gray-300">
            {isCOD ? 'Espèces à la livraison' : 'Déjà Réglé / Sans encaissement'}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[16px] font-black font-mono tracking-tight text-white">
            {isCOD ? `${Number(data.amountToCollect).toFixed(3)} DT` : '0.000 DT'}
          </span>
        </div>
      </div>

      {/* ── 7. Footer: Instructions, Signature & QR Code ──────────────────── */}
      <div className="px-2 py-1.5 flex items-center justify-between gap-1.5 bg-white shrink-0">
        <div className="flex-1 space-y-0.5">
          {data.notes ? (
            <p className="text-[8px] font-bold text-black italic leading-tight break-words">
              Note: {data.notes}
            </p>
          ) : (
            <p className="text-[7.5px] text-gray-600">
              Acheminé par ZIHAN Logistics Express • www.zihan.tn
            </p>
          )}
          <div className="pt-0.5">
            <p className="text-[7.5px] font-bold text-gray-700">
              Signature client : _____________________
            </p>
          </div>
        </div>

        <div className="shrink-0 p-0.5 border border-black bg-white">
          <QrCode
            value={`https://app.zihan.tn/tracking/${data.trackingNumber}`}
            size={36}
            showLogo={false}
            className="p-0 border-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
};
