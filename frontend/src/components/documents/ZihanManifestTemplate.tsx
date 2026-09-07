import React from 'react';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { Barcode } from './Barcode';

export interface ManifestItem {
  trackingNumber: string;
  recipientName: string;
  phone: string;
  city: string;
  amountToCollect: number;
  paymentType: 'COD' | 'PAID';
  status: string;
}

export interface ManifestData {
  manifestNumber: string;
  date: string;
  driver: {
    name: string;
    phone: string;
    vehicle: string;
    zone: string;
  };
  items: ManifestItem[];
  totalToCollect: number;
  totalDeliveryFees: number;
}

// eslint-disable-next-line react-refresh/only-export-components
export const sampleManifestData: ManifestData = {
  manifestNumber: 'MAN-ZH-2026-0819',
  date: '21/08/2026 - Tournée Matin',
  driver: {
    name: 'Karim Mansouri',
    phone: '+216 98 777 666',
    vehicle: 'Citroën Berlingo (194 TUN 8840)',
    zone: 'Secteur Nouvelle Médina / Ben Arous',
  },
  items: [
    {
      trackingNumber: 'ZH000001',
      recipientName: 'Mohamed Ben Ali',
      phone: '22 000 000',
      city: 'Nouvelle Médina',
      amountToCollect: 80.0,
      paymentType: 'COD',
      status: 'En cours',
    },
    {
      trackingNumber: 'ZH000002',
      recipientName: 'Sonia Trabelsi',
      phone: '55 123 456',
      city: 'Radès Plage',
      amountToCollect: 45.5,
      paymentType: 'COD',
      status: 'En cours',
    },
    {
      trackingNumber: 'ZH000003',
      recipientName: 'Boutique Élite Sport',
      phone: '98 444 333',
      city: 'Ezzahra',
      amountToCollect: 120.0,
      paymentType: 'COD',
      status: 'En cours',
    },
    {
      trackingNumber: 'ZH000004',
      recipientName: 'Cabinet Dr. Ferjani',
      phone: '71 222 111',
      city: 'Mégrine',
      amountToCollect: 0.0,
      paymentType: 'PAID',
      status: 'En cours',
    },
    {
      trackingNumber: 'ZH000005',
      recipientName: 'Khaled Ayari',
      phone: '20 999 888',
      city: 'Hammam Lif',
      amountToCollect: 65.0,
      paymentType: 'COD',
      status: 'En cours',
    },
  ],
  totalToCollect: 310.5,
  totalDeliveryFees: 38.0,
};

interface ZihanManifestTemplateProps {
  data?: ManifestData;
}

export const ZihanManifestTemplate: React.FC<ZihanManifestTemplateProps> = ({
  data = sampleManifestData,
}) => {
  return (
    <div className="relative mx-auto w-[210mm] min-h-[297mm] bg-white text-[#162033] shadow-2xl print:shadow-none print:w-full overflow-hidden flex flex-row font-sans text-xs select-none">
      {/* 1. Left Vertical Blue Band */}
      <div
        className="w-[14mm] bg-[#1B3D87] text-white flex flex-col items-center justify-between py-6 shrink-0 relative"
        style={{ backgroundColor: '#1B3D87' }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1B3D87] font-black text-xs">
          Z
        </div>
        <div className="writing-mode-vertical tracking-widest text-[11px] font-black uppercase text-white/90 whitespace-nowrap rotate-180 select-none">
          ZIHAN — BORDEREAU DE TOURNÉE LIVREUR
        </div>
        <div className="h-6 w-1 rounded-full bg-[#EA4E52]" />
      </div>

      {/* 2. Main Content */}
      <div className="flex-1 flex flex-col justify-between p-8 pl-6 relative">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#1B3D87]/10 pb-4">
            <ZihanOfficialLogo size="md" variant="horizontal" showTagline={true} />
            <div className="text-right space-y-1">
              <div className="inline-block rounded-lg bg-[#EEF3F9] px-3 py-1.5 border border-[#DCE3EC]">
                <h1 className="text-base font-black tracking-tight text-[#1B3D87]">
                  BORDEREAU DE TOURNÉE N° : {data.manifestNumber}
                </h1>
              </div>
              <div className="flex justify-end">
                <Barcode value={data.manifestNumber} width={150} height={28} />
              </div>
            </div>
          </div>

          {/* Driver & Tour Summary Box */}
          <div className="grid grid-cols-4 gap-3 rounded-xl bg-[#EEF3F9] p-3.5 border border-[#DCE3EC] text-[11px]">
            <div>
              <span className="text-[#667085] block">Livreur Assigné</span>
              <span className="font-bold text-[#162033]">{data.driver.name}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Téléphone / Véhicule</span>
              <span className="font-bold text-[#162033]">{data.driver.phone}</span>
              <span className="text-[10px] text-[#667085] block">{data.driver.vehicle}</span>
            </div>
            <div>
              <span className="text-[#667085] block">Date & Secteur</span>
              <span className="font-bold text-[#162033]">{data.date}</span>
              <span className="text-[10px] text-[#1B3D87] font-semibold block">{data.driver.zone}</span>
            </div>
            <div className="text-right">
              <span className="text-[#667085] block">Colis à Livrer</span>
              <span className="text-base font-black text-[#1B3D87]">{data.items.length} colis</span>
            </div>
          </div>

          {/* Parcels Manifest Table */}
          <div className="rounded-xl border border-[#DCE3EC] overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1B3D87] text-white font-bold text-[11px]">
                  <th className="py-2 px-2.5 w-12 text-center">N°</th>
                  <th className="py-2 px-2.5">Tracking</th>
                  <th className="py-2 px-2.5">Destinataire</th>
                  <th className="py-2 px-2.5">Téléphone</th>
                  <th className="py-2 px-2.5">Ville</th>
                  <th className="py-2 px-2.5 text-right">À Encaisser</th>
                  <th className="py-2 px-2.5 text-center w-20">Émargement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {data.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-[#EEF3F9]/40'}
                  >
                    <td className="py-2 px-2.5 text-center font-bold text-[#667085]">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-[#1B3D87]">
                      {item.trackingNumber}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-[#162033]">
                      {item.recipientName}
                    </td>
                    <td className="py-2 px-2.5 text-[#162033] font-bold">
                      {item.phone}
                    </td>
                    <td className="py-2 px-2.5 text-[#667085]">{item.city}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-black text-[#162033]">
                      {item.amountToCollect > 0 ? (
                        <span className="text-[#1B3D87]">
                          {item.amountToCollect.toFixed(3)} DT
                        </span>
                      ) : (
                        <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                          Payé en ligne
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <div className="h-6 w-14 border border-dashed border-[#DCE3EC] rounded mx-auto" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-96 rounded-xl border border-[#DCE3EC] p-4 bg-[#EEF3F9] space-y-2">
              <div className="flex justify-between text-xs text-[#667085]">
                <span>Total colis remis en tournée :</span>
                <span className="font-bold text-[#162033]">{data.items.length} colis</span>
              </div>
              <div className="flex justify-between text-xs text-[#667085]">
                <span>Total frais de transport ZIHAN :</span>
                <span className="font-bold text-[#162033] font-mono">
                  {data.totalDeliveryFees.toFixed(3)} DT
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-[#1B3D87] p-2.5 px-3 text-white">
                <span className="font-black text-xs uppercase">
                  TOTAL ESPÈCES À COLLECTER (COD) :
                </span>
                <span className="font-black text-base font-mono text-amber-300">
                  {data.totalToCollect.toFixed(3)} DT
                </span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-6 pt-4">
            <div className="rounded-xl border border-dashed border-[#DCE3EC] p-4 text-center space-y-8 bg-white">
              <p className="text-[11px] font-bold text-[#1B3D87] uppercase">
                Signature Livreur (Prise en charge)
              </p>
              <div className="text-[9px] text-[#667085] border-t border-[#DCE3EC] pt-1">
                Certifie avoir reçu les colis et les fonds indiqués
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-[#DCE3EC] p-4 text-center space-y-8 bg-white">
              <p className="text-[11px] font-bold text-[#1B3D87] uppercase">
                Signature & Cachet Responsable Dispatch
              </p>
              <div className="text-[9px] text-[#667085] border-t border-[#DCE3EC] pt-1">
                Contrôlé et validé au départ du Hub
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 space-y-2">
          <div className="h-0.5 w-full bg-[#EA4E52]" />
          <div className="flex items-center justify-between text-[9px] text-[#667085] pt-1">
            <p className="font-black text-[#1B3D87]">
              ZIHAN SUPER DELIVERY EXPRESS — Rue des anémones - Nouvelle Médina • 📞 27 394 418 / 27 394 137 • ✉️ samiAyed1965@gmail.com
            </p>
            <p>Page 1/1</p>
          </div>
        </div>
      </div>
    </div>
  );
};
