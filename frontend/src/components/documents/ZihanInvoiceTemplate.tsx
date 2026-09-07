import React from 'react';
import { ZihanOfficialLogo } from '@/components/branding/ZihanOfficialLogo';
import { Barcode } from './Barcode';

export interface InvoiceData {
  invoiceNumber: string; // ex: "FAC-ZH-2026-000001"
  date: string;
  dueDate: string;
  client: {
    name: string;
    company?: string;
    vatNumber?: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    governorate: string;
    postalCode: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unitPriceHT: number;
    totalHT: number;
  }>;
  subtotalHT: number;
  vatRate: number; // ex: 19 for 19%
  vatAmount: number;
  totalTTC: number;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'PENDING' | 'OVERDUE';
}

// eslint-disable-next-line react-refresh/only-export-components
export const sampleInvoiceData: InvoiceData = {
  invoiceNumber: 'FAC-ZH-2026-000001',
  date: '21/08/2026',
  dueDate: '05/09/2026',
  client: {
    name: 'SARL Société Tunisienne de Distribution',
    company: 'Atlas Distribution SARL',
    vatNumber: '1489230/B/N/000',
    phone: '+216 71 450 780',
    email: 'compta@atlasdistribution.tn',
    address: 'Zone Industrielle Charguia 1, Rue des Usines',
    city: 'Tunis',
    governorate: 'Tunis',
    postalCode: '2035',
  },
  items: [
    {
      description: 'Prestation de livraisons express Grand Tunis (Colis standards)',
      quantity: 120,
      unitPriceHT: 5.882,
      totalHT: 705.84,
    },
    {
      description: 'Prestation de livraisons express Hors Grand Tunis (Colis régionaux)',
      quantity: 45,
      unitPriceHT: 8.403,
      totalHT: 378.135,
    },
    {
      description: 'Option Suivi VIP & Preuve de livraison numérique (POD)',
      quantity: 165,
      unitPriceHT: 0.5,
      totalHT: 82.5,
    },
  ],
  subtotalHT: 1166.475,
  vatRate: 19,
  vatAmount: 221.63,
  totalTTC: 1388.105,
  paymentMethod: 'Virement bancaire / Prélèvement',
  paymentStatus: 'PAID',
};

interface ZihanInvoiceTemplateProps {
  data?: InvoiceData;
}

export const ZihanInvoiceTemplate: React.FC<ZihanInvoiceTemplateProps> = ({
  data = sampleInvoiceData,
}) => {
  return (
    <div className="relative mx-auto w-[210mm] min-h-[297mm] bg-white text-[#162033] shadow-2xl print:shadow-none print:w-full overflow-hidden flex flex-row font-sans text-xs select-none">
      {/* 1. Vertical Blue Sidebar */}
      <div
        className="w-[14mm] bg-[#1B3D87] text-white flex flex-col items-center justify-between py-6 shrink-0 relative"
        style={{ backgroundColor: '#1B3D87' }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#1B3D87] font-black text-xs">
          Z
        </div>
        <div className="writing-mode-vertical tracking-widest text-[11px] font-black uppercase text-white/90 whitespace-nowrap rotate-180 select-none">
          ZIHAN SUPER DELIVERY EXPRESS — FACTURATION
        </div>
        <div className="h-6 w-1 rounded-full bg-[#EA4E52]" />
      </div>

      {/* 2. Main Body */}
      <div className="flex-1 flex flex-col justify-between p-8 pl-6 relative">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#1B3D87]/10 pb-4">
            <div className="space-y-1">
              <ZihanOfficialLogo size="md" variant="horizontal" showTagline={true} />
              <p className="text-[10px] text-[#667085] pt-1">
                Direction Financière & Comptabilité Fournisseurs
              </p>
            </div>

            <div className="text-right space-y-1.5">
              <div className="inline-block rounded-lg bg-[#EEF3F9] px-3 py-1.5 border border-[#DCE3EC]">
                <p className="text-[10px] font-bold text-[#667085] uppercase tracking-wider">
                  Document Comptable
                </p>
                <h1 className="text-lg font-black tracking-tight text-[#1B3D87]">
                  FACTURE N° : {data.invoiceNumber}
                </h1>
              </div>
              <div className="flex justify-end">
                <Barcode value={data.invoiceNumber} width={160} height={32} />
              </div>
            </div>
          </div>

          {/* Metadata Bar */}
          <div className="grid grid-cols-3 gap-3 rounded-xl bg-[#EEF3F9] p-3 px-4 border border-[#DCE3EC] text-[11px]">
            <div>
              <span className="text-[#667085]">Date de Facture : </span>
              <span className="font-bold text-[#162033]">{data.date}</span>
            </div>
            <div>
              <span className="text-[#667085]">Échéance : </span>
              <span className="font-bold text-[#162033]">{data.dueDate}</span>
            </div>
            <div className="text-right">
              <span
                className={`font-black uppercase px-2.5 py-0.5 rounded text-[10px] ${
                  data.paymentStatus === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {data.paymentStatus === 'PAID' ? '✓ Facture Réglée' : 'En attente'}
              </span>
            </div>
          </div>

          {/* Client & Issuer Information */}
          <div className="grid grid-cols-2 gap-4">
            {/* Emetteur */}
            <div className="rounded-xl border border-[#DCE3EC] p-4 space-y-1 bg-white">
              <p className="font-bold text-[11px] text-[#1B3D87] uppercase tracking-wider border-b border-[#DCE3EC] pb-1">
                Émetteur
              </p>
              <p className="font-black text-[#162033]">ZIHAN SUPER DELIVERY EXPRESS SARL</p>
              <p className="text-[#667085]">6 Avenue Habib Bourguiba - Nouvelle Médina</p>
              <p className="text-[#667085]">Matricule Fiscal : 1845239/M/A/000</p>
              <p className="text-[#667085]">Email : compta@zihan.tn</p>
            </div>

            {/* Facturé à */}
            <div className="rounded-xl border-2 border-[#1B3D87] p-4 space-y-1 bg-[#EEF3F9]/60">
              <p className="font-bold text-[11px] text-[#1B3D87] uppercase tracking-wider border-b border-[#1B3D87]/20 pb-1">
                Facturé à (Client)
              </p>
              <p className="font-black text-sm text-[#162033]">{data.client.company || data.client.name}</p>
              <p className="text-[#667085]">{data.client.address}</p>
              <p className="text-[#667085]">
                {data.client.city} ({data.client.postalCode}) — {data.client.governorate}
              </p>
              {data.client.vatNumber && (
                <p className="text-[11px] font-mono text-[#1B3D87]">
                  Matricule Fiscal : {data.client.vatNumber}
                </p>
              )}
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-xl border border-[#DCE3EC] overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1B3D87] text-white font-bold text-[11px]">
                  <th className="py-2.5 px-3">Désignation</th>
                  <th className="py-2.5 px-3 text-center w-20">Quantité</th>
                  <th className="py-2.5 px-3 text-right w-28">P.U. HT</th>
                  <th className="py-2.5 px-3 text-right w-28">Total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE3EC]">
                {data.items.map((item, idx) => (
                  <tr
                    key={idx}
                    className={idx % 2 === 0 ? 'bg-white' : 'bg-[#EEF3F9]/40'}
                  >
                    <td className="py-2.5 px-3 font-semibold text-[#162033]">
                      {item.description}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {item.unitPriceHT.toFixed(3)} DT
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#1B3D87]">
                      {item.totalHT.toFixed(3)} DT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financial Calculation Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-80 rounded-xl border border-[#DCE3EC] p-4 bg-[#EEF3F9] space-y-2">
              <div className="flex justify-between text-[11px] text-[#667085]">
                <span>Sous-total HT :</span>
                <span className="font-bold text-[#162033] font-mono">
                  {data.subtotalHT.toFixed(3)} DT
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-[#667085]">
                <span>TVA ({data.vatRate} %) :</span>
                <span className="font-bold text-[#162033] font-mono">
                  {data.vatAmount.toFixed(3)} DT
                </span>
              </div>

              {/* Total TTC */}
              <div className="mt-2 flex items-center justify-between rounded-lg bg-[#1B3D87] p-2.5 px-3 text-white">
                <span className="font-black text-xs uppercase tracking-wide">
                  MONTANT TOTAL TTC :
                </span>
                <span className="font-black text-base tracking-tight font-mono text-amber-300">
                  {data.totalTTC.toFixed(3)} DT
                </span>
              </div>
            </div>
          </div>

          {/* Payment & Bank Details */}
          <div className="rounded-xl border border-dashed border-[#DCE3EC] p-3 text-[10px] space-y-1 bg-white">
            <p className="font-bold text-[#1B3D87] uppercase">Coordonnées Bancaires :</p>
            <p className="text-[#667085]">
              Banque : <span className="font-bold text-[#162033]">BIAT Agence Nouvelle Médina</span> | RIB :{' '}
              <span className="font-mono font-bold text-[#162033]">08 045 0001234567890 44</span>
            </p>
            <p className="text-[#667085]">
              Veuillez mentionner le numéro de facture <span className="font-bold">{data.invoiceNumber}</span> lors de votre virement.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-3 space-y-2">
          <div className="h-0.5 w-full bg-[#EA4E52]" />
          <div className="flex flex-col sm:flex-row items-center justify-between text-[9px] text-[#667085] gap-2 pt-1">
            <p className="font-black text-[#1B3D87]">
              ZIHAN SUPER DELIVERY EXPRESS SARL — R.C. B0145292024 • MF : 1845239/M/A/000
              <br/>Rue des anémones - Nouvelle Médina, Ben Arous
            </p>
            <p>📞 27 394 418 / 27 394 137 • 💬 WhatsApp : 27 394 418 • ✉️ samiAyed1965@gmail.com</p>
            <p className="font-bold text-[#1B3D87]">www.zihan.tn</p>
          </div>
        </div>
      </div>
    </div>
  );
};
