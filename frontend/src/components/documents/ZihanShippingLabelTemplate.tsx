import React from 'react';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { Barcode } from './Barcode';
import { QrCode } from './QrCode';
import { MapPin, AlertCircle } from 'lucide-react';

export interface LabelData {
  trackingNumber: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  secondaryPhone?: string;
  address: string;
  city: string;
  governorate: string;
  postalCode?: string;
  amountToCollect: number;
  deliveryFee: number;
  isFragile?: boolean;
  notes?: string;
  date: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const sampleLabelData: LabelData = {
  trackingNumber: 'ZH000001',
  senderName: 'Boutique Express Mode',
  senderPhone: '+216 71 888 999',
  recipientName: 'Mohamed Ben Ali',
  recipientPhone: '+216 22 000 000',
  secondaryPhone: '+216 98 111 222',
  address: 'Résidence Ennasr, Bloc B, Apt 14, Avenue Hédi Nouira',
  city: 'Nouvelle Médina',
  governorate: 'Ben Arous',
  postalCode: '2063',
  amountToCollect: 80.0,
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
  return (
    <div className="mx-auto w-[105mm] min-h-[148mm] bg-white text-[#162033] p-4 border-2 border-dashed border-[#162033]/40 rounded-xl shadow-lg print:shadow-none print:border-none print:w-full font-sans text-xs flex flex-col justify-between select-none">
      {/* Header */}
      <div className="space-y-2 border-b-2 border-[#162033] pb-2">
        <div className="flex items-center justify-between">
          <ZihanOfficialLogo size="sm" variant="horizontal" showTagline={false} />
          <span className="text-[10px] font-black uppercase bg-[#1B3D87] text-white px-2 py-0.5 rounded">
            SUPER EXPRESS
          </span>
        </div>

        {/* Large Barcode & Tracking */}
        <div className="text-center py-1 bg-[#EEF3F9] rounded-lg">
          <Barcode value={data.trackingNumber} width={200} height={40} />
          <h2 className="text-lg font-black tracking-widest text-[#1B3D87]">
            {data.trackingNumber}
          </h2>
        </div>
      </div>

      {/* Recipient Section (Large & Highly Legible) */}
      <div className="py-2 space-y-1.5 border-b border-[#162033]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-[#667085] uppercase tracking-wider flex items-center gap-1">
            <MapPin className="h-3 w-3 text-[#EA4E52]" />
            DESTINATAIRE
          </span>
          <span className="text-xs font-black uppercase text-[#1B3D87]">
            {data.governorate} — {data.city}
          </span>
        </div>

        <p className="text-sm font-black text-[#162033] leading-tight">
          {data.recipientName}
        </p>

        <p className="text-xs font-semibold text-[#162033] leading-snug">
          📍 {data.address}
        </p>

        {/* Big Phone Box */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs font-black bg-[#162033] text-white px-2 py-0.5 rounded">
            📞 {data.recipientPhone}
          </span>
          {data.secondaryPhone && (
            <span className="text-xs font-bold border border-[#162033] px-2 py-0.5 rounded">
              📱 {data.secondaryPhone}
            </span>
          )}
        </div>
      </div>

      {/* Sender & Parcel Info */}
      <div className="grid grid-cols-2 gap-2 py-1.5 text-[10px] border-b border-[#DCE3EC]">
        <div>
          <span className="text-[#667085] font-bold block uppercase">EXPÉDITEUR</span>
          <p className="font-bold text-[#162033] truncate">{data.senderName}</p>
          <p className="text-[#667085]">{data.senderPhone}</p>
        </div>
        <div className="text-right">
          <span className="text-[#667085] font-bold block uppercase">DATE & FRAIS</span>
          <p className="font-bold text-[#162033]">{data.date}</p>
          <p className="text-[#667085]">Port : {data.deliveryFee.toFixed(3)} DT</p>
        </div>
      </div>

      {/* Prominent COD Amount Box */}
      <div className="my-2 rounded-lg bg-[#1B3D87] text-white p-2.5 px-3 flex items-center justify-between border border-[#162033]">
        <div className="space-y-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider block text-white/90">
            PAIEMENT À LA LIVRAISON (COD)
          </span>
          <span className="text-xs font-bold text-amber-300">À ENCAISSER :</span>
        </div>
        <span className="text-lg font-black tracking-tight font-mono text-amber-300">
          {data.amountToCollect.toFixed(3)} DT
        </span>
      </div>

      {/* Footer / QR code & Notes */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <div className="space-y-1 flex-1">
          {data.isFragile && (
            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase bg-[#EA4E52] text-white px-2 py-0.5 rounded">
              <AlertCircle className="h-3 w-3" />
              Colis Fragile
            </span>
          )}
          {data.notes && (
            <p className="text-[9px] text-[#667085] italic truncate max-w-[180px]">
              Note : {data.notes}
            </p>
          )}
          <p className="text-[8px] text-[#667085]">ZIHAN Logistics — app.zihan.tn</p>
        </div>

        <QrCode
          value={`https://app.zihan.tn/tracking/${data.trackingNumber}`}
          size={50}
        />
      </div>
    </div>
  );
};
