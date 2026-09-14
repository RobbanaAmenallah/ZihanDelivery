import React from 'react';
import { Barcode } from './Barcode';
import logoImg from '@/assets/logo1.jpg';

export interface InvoiceParcelItem {
  trackingNumber: string;
  recipientName: string;
  governorate: string;
  date: string;
  status: 'delivered' | 'returned' | string;
  deliveryFee: number;
  rateApplied: number; // 1.0 (100%) or 0.5 (50%)
  billedAmount: number;
}

export interface ClientInvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  periodLabel: string;
  client: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    governorate?: string;
  };
  deliveredCount: number;
  deliveredFeesTotal: number;
  returnedCount: number;
  returnedFeesTotal: number; // at 50%
  totalDeliveriesCount: number;
  totalAmountToPay: number;
  items: InvoiceParcelItem[];
  paymentStatus: 'PAID' | 'PENDING';
}

// Sample fallback data
// eslint-disable-next-line react-refresh/only-export-components
export const sampleInvoiceData: ClientInvoiceData = {
  invoiceNumber: 'FAC-ZH-2026-0001',
  date: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  dueDate: 'À réception',
  periodLabel: 'Mois en cours',
  client: {
    name: 'Boutique Express Mode',
    company: 'Boutique Express Mode',
    phone: '+216 71 888 999',
    email: 'contact@expressmode.tn',
    address: '12 Rue des Entrepreneurs, Charguia 2',
    city: 'Tunis',
    governorate: 'Tunis',
  },
  deliveredCount: 14,
  deliveredFeesTotal: 112.0, // 14 * 8.0
  returnedCount: 4,
  returnedFeesTotal: 16.0, // 4 * (8.0 / 2) = 16.0 DT
  totalDeliveriesCount: 18,
  totalAmountToPay: 128.0, // 112.0 + 16.0
  items: [
    {
      trackingNumber: 'ZH000150',
      recipientName: 'Mohamed Ben Ali',
      governorate: 'Ben Arous',
      date: '10/09/2026',
      status: 'delivered',
      deliveryFee: 8.0,
      rateApplied: 1.0,
      billedAmount: 8.0,
    },
    {
      trackingNumber: 'ZH000151',
      recipientName: 'Sonia Trabelsi',
      governorate: 'Ariana',
      date: '11/09/2026',
      status: 'delivered',
      deliveryFee: 8.0,
      rateApplied: 1.0,
      billedAmount: 8.0,
    },
    {
      trackingNumber: 'ZH000152',
      recipientName: 'Anis Gharbi',
      governorate: 'Sousse',
      date: '12/09/2026',
      status: 'returned',
      deliveryFee: 8.0,
      rateApplied: 0.5,
      billedAmount: 4.0,
    },
  ],
  paymentStatus: 'PENDING',
};

interface ZihanInvoiceTemplateProps {
  data?: ClientInvoiceData;
}

const BLUE = '#1B3D87';
const RED = '#EA4E52';
const DARK = '#0F172A';
const MUTED = '#475569';
const LIGHT = '#64748B';
const BORDER = '#CBD5E1';
const BG = '#F8FAFC';

export const ZihanInvoiceTemplate: React.FC<ZihanInvoiceTemplateProps> = ({
  data = sampleInvoiceData,
}) => {
  return (
    <div
      style={{
        width: '794px',
        minHeight: '1123px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: DARK,
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── BANDEAU BLEU HEADER ────────────────────────────────────────────── */}
      <div style={{ backgroundColor: BLUE, padding: '16px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img
              src={logoImg}
              alt="ZIHAN Super Delivery Express"
              style={{
                height: '46px',
                width: 'auto',
                objectFit: 'contain',
                borderRadius: '6px',
                background: '#fff',
                padding: '3px 6px',
              }}
            />
            <div>
              <p style={{ margin: 0, fontSize: '10px', color: '#CBD5E1', fontWeight: 500 }}>
                Direction Financière &amp; Gestion des Prestations de Livraison
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: RED,
                color: '#fff',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
              }}
            >
              FACTURE OFFICIELLE
            </span>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#E2E8F0', fontWeight: 600 }}>
              Prestations Logistiques ZIHAN
            </p>
          </div>
        </div>
      </div>

      {/* Ligne accent rouge */}
      <div style={{ height: '4px', backgroundColor: RED, flexShrink: 0 }} />

      {/* ── CORPS FACTURE ─────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

        {/* Entête numéro & code-barres */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '2px solid #EEF2F6',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: LIGHT, textTransform: 'uppercase' }}>
                FACTURE N° :
              </span>
              <span style={{ fontSize: '22px', fontWeight: 900, color: BLUE, fontFamily: 'monospace' }}>
                {data.invoiceNumber}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '10.5px', color: LIGHT }}>
              Période : <span style={{ fontWeight: 700, color: DARK }}>{data.periodLabel}</span> • Date d'émission : {data.date}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <Barcode value={data.invoiceNumber} width={150} height={32} />
            <span style={{ fontSize: '9px', color: '#94A3B8', fontFamily: 'monospace' }}>{data.invoiceNumber}</span>
          </div>
        </div>

        {/* Grille Émetteur / Client Facturé */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {/* Émetteur ZIHAN */}
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '14px', backgroundColor: '#fff' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '10.5px', fontWeight: 800, color: BLUE, textTransform: 'uppercase' }}>
              Émetteur (Transporteur)
            </p>
            <p style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: '13px', color: DARK }}>
              ZIHAN SUPER DELIVERY EXPRESS
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: MUTED }}>
              Rue des anémones - Nouvelle Médina, Ben Arous
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: MUTED }}>
              📞 27 394 418 / 27 394 137 • ✉️ samiayed1965@gmail.com
            </p>
          </div>

          {/* Client Facturé */}
          <div style={{ border: `2px solid ${BLUE}`, borderRadius: '12px', padding: '14px', backgroundColor: BG }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <p style={{ margin: 0, fontSize: '10.5px', fontWeight: 800, color: BLUE, textTransform: 'uppercase' }}>
                Facturé À (Client)
              </p>
              <span
                style={{
                  backgroundColor: data.paymentStatus === 'PAID' ? '#059669' : '#D97706',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                }}
              >
                {data.paymentStatus === 'PAID' ? '✓ Payée' : 'En attente'}
              </span>
            </div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: '14px', color: DARK }}>
              {data.client.company || data.client.name}
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: MUTED }}>
              {data.client.address || 'Adresse non spécifiée'}
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: MUTED }}>
              📞 {data.client.phone} {data.client.email && `• ✉️ ${data.client.email}`}
            </p>
          </div>
        </div>

        {/* ── TABLEAU RÉCAPITULATIF DES PRESTATIONS (AVEC RÈGLE 50% RETOUR) ── */}
        <div style={{ borderRadius: '10px', border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
            <thead>
              <tr style={{ backgroundColor: BLUE, color: '#fff' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '11px' }}>
                  Nature de la Prestation
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: '11px', width: '80px' }}>
                  Colis
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: '11px', width: '120px' }}>
                  Règle Tarifaire
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '11px', width: '130px' }}>
                  Total Dû (DT)
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Ligne Livraisons réussies */}
              <tr style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: DARK }}>
                  📦 Livraisons Effectuées avec Succès
                  <span style={{ display: 'block', fontSize: '10px', color: LIGHT, fontWeight: 500 }}>
                    Colis livrés et encaissés au destinataire
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: '13px', color: '#059669' }}>
                  {data.deliveredCount}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: BLUE }}>
                  100% Tarif de Port
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: DARK, fontSize: '13px' }}>
                  {data.deliveredFeesTotal.toFixed(3)} DT
                </td>
              </tr>

              {/* Ligne Retours facturés à moitié */}
              <tr style={{ backgroundColor: BG, borderBottom: '1px solid #E2E8F0' }}>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: DARK }}>
                  🔄 Colis Retournés (Frais de Gestion Retour)
                  <span style={{ display: 'block', fontSize: '10px', color: LIGHT, fontWeight: 500 }}>
                    Colis non aboutis retournés à la boutique
                  </span>
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, fontSize: '13px', color: RED }}>
                  {data.returnedCount}
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: RED }}>
                  50% Tarif de Port (Moitié)
                </td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: RED, fontSize: '13px' }}>
                  {data.returnedFeesTotal.toFixed(3)} DT
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── DÉTAIL DES COLIS FACTURÉS (si items fournis) ───────────────── */}
        {data.items && data.items.length > 0 && (
          <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', backgroundColor: '#EEF2F6', fontWeight: 800, fontSize: '10.5px', color: BLUE, textTransform: 'uppercase' }}>
              Détail des {data.items.length} Colis de la Facture
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: LIGHT }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>N° Suivi</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Destinataire</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Gouv.</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Statut</th>
                  <th style={{ padding: '6px 10px', textAlign: 'center' }}>Taux</th>
                  <th style={{ padding: '6px 10px', textAlign: 'right' }}>Montant Facturé</th>
                </tr>
              </thead>
              <tbody>
                {data.items.slice(0, 15).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9', backgroundColor: idx % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontWeight: 700, color: BLUE }}>
                      {item.trackingNumber}
                    </td>
                    <td style={{ padding: '6px 10px', color: DARK }}>{item.recipientName}</td>
                    <td style={{ padding: '6px 10px', color: MUTED }}>{item.governorate}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: item.status === 'delivered' ? '#ECFDF5' : '#FEF2F2',
                          color: item.status === 'delivered' ? '#065F46' : '#991B1B',
                        }}
                      >
                        {item.status === 'delivered' ? 'Livré' : 'Retourné'}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: item.rateApplied === 1 ? BLUE : RED }}>
                      {item.rateApplied === 1 ? '100%' : '50%'}
                    </td>
                    <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800 }}>
                      {item.billedAmount.toFixed(3)} DT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── ENCADRÉ TOTAL À PAYER ────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
          <div
            style={{
              width: '320px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: BG,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: MUTED }}>
              <span>Total Livraisons ({data.deliveredCount}) :</span>
              <span style={{ fontWeight: 700, color: DARK, fontFamily: 'monospace' }}>
                {data.deliveredFeesTotal.toFixed(3)} DT
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: MUTED }}>
              <span>Total Retours à 50% ({data.returnedCount}) :</span>
              <span style={{ fontWeight: 700, color: RED, fontFamily: 'monospace' }}>
                {data.returnedFeesTotal.toFixed(3)} DT
              </span>
            </div>

            {/* Total Grand Format */}
            <div
              style={{
                marginTop: '6px',
                padding: '12px 14px',
                backgroundColor: BLUE,
                borderRadius: '8px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL À PAYER :
              </span>
              <span style={{ fontSize: '20px', fontWeight: 900, fontFamily: 'monospace', color: '#FDE047' }}>
                {data.totalAmountToPay.toFixed(3)} DT
              </span>
            </div>
          </div>
        </div>

        {/* Signature */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '10px' }}>
          <div style={{ fontSize: '10px', color: LIGHT }}>
            <p style={{ margin: 0 }}>Règlement par virement bancaire ou espèces contre décharge officielle.</p>
          </div>
          <div
            style={{
              border: '1px dashed #94A3B8',
              borderRadius: '8px',
              padding: '10px 20px',
              textAlign: 'center',
              width: '220px',
              height: '60px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '9.5px', fontWeight: 800, color: BLUE, textTransform: 'uppercase' }}>
              Cachet &amp; Signature ZIHAN
            </span>
            <span style={{ fontSize: '8px', color: '#94A3B8' }}>Pour acquit</span>
          </div>
        </div>

      </div>

      {/* ── PIED DE PAGE OFFICIEL (PAS DE FAUSSE MF) ───────────────────────── */}
      <div style={{ borderTop: `2px solid ${RED}`, padding: '10px 30px 14px 30px', backgroundColor: BG, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', color: LIGHT }}>
          <div>
            <p style={{ margin: 0, fontWeight: 900, color: BLUE, fontSize: '10px' }}>
              ZIHAN SUPER DELIVERY EXPRESS SARL
            </p>
            <p style={{ margin: '2px 0 0 0' }}>
              Rue des anémones - Nouvelle Médina, Ben Arous, Tunisie
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, color: DARK }}>
              📞 27 394 418 / 27 394 137 &nbsp;•&nbsp; 💬 WhatsApp : 27 394 418
            </p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: BLUE }}>
              ✉️ samiayed1965@gmail.com
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 900, color: BLUE, fontSize: '10.5px' }}>
              www.zihan.tn
            </p>
            <p style={{ margin: '2px 0 0 0', color: RED, fontWeight: 700 }}>
              Facturation Professionnelle &amp; Transparente
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
