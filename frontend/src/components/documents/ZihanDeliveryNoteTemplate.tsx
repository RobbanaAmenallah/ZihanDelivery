import React from 'react';
import { Barcode } from './Barcode';
import { QrCode } from './QrCode';
import { MapPin, Phone, Clock } from 'lucide-react';
import logoImg from '@/assets/logo1.jpg';

export interface DeliveryNoteData {
  noteNumber: string; // ex: "ZH000153"
  trackingNumber: string; // ex: "ZH000153"
  createdAt: string; // ex: "27/08/2026 19:25"
  sender: {
    name: string;
    phone: string;
    address: string;
    city: string;
    governorate: string;
    postalCode: string;
  };
  recipient: {
    name: string;
    phone: string;
    secondaryPhone?: string;
    address: string;
    city: string;
    governorate: string;
    postalCode: string;
  };
  items: Array<{
    designation: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  parcelValue: number;
  deliveryFee: number;
  totalToCollect: number;
  status: string;
  notes?: string;
}

// eslint-disable-next-line react-refresh/only-export-components
export const sampleDeliveryNoteData: DeliveryNoteData = {
  noteNumber: 'ZH000153',
  trackingNumber: 'ZH000153',
  createdAt: new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
  sender: {
    name: 'Boutique Express Mode',
    phone: '+216 71 888 999',
    address: '12 Rue des Entrepreneurs, Charguia 2',
    city: 'Tunis',
    governorate: 'Tunis',
    postalCode: '2035',
  },
  recipient: {
    name: 'Mohamed Ben Ali',
    phone: '+216 22 000 000',
    secondaryPhone: '+216 98 111 222',
    address: 'Résidence Ennasr, Bloc B, Apt 14, Avenue Hédi Nouira',
    city: 'Nouvelle Médina',
    governorate: 'Ben Arous',
    postalCode: '2063',
  },
  items: [
    {
      designation: 'Chaussures Sport ZIHAN Runner Pro (Taille 42)',
      quantity: 1,
      unitPrice: 70.0,
      total: 70.0,
    },
  ],
  parcelValue: 70.0,
  deliveryFee: 7.0,
  totalToCollect: 77.0,
  status: 'EN ATTENTE DE LIVRAISON',
  notes: 'Appeler le destinataire avant la livraison. Colis fragile.',
};

interface ZihanDeliveryNoteTemplateProps {
  data?: DeliveryNoteData;
}

export const ZihanDeliveryNoteTemplate: React.FC<ZihanDeliveryNoteTemplateProps> = ({
  data = sampleDeliveryNoteData,
}) => {
  const BLUE   = '#1B3D87';
  const RED    = '#EA4E52';
  const DARK   = '#0F172A';
  const MID    = '#1E293B';
  const MUTED  = '#475569';
  const LIGHT  = '#64748B';
  const BORDER = '#CBD5E1';
  const BG     = '#F8FAFC';

  const formattedDate =
    data.createdAt ||
    new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

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
      {/* ── BANDEAU BLEU ────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: BLUE, padding: '16px 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo officiel */}
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
            <p style={{ margin: 0, fontSize: '10px', color: '#CBD5E1', fontWeight: 500 }}>
              Plateforme Logistique &amp; Transport Express en Tunisie
            </p>
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
              BON DE LIVRAISON
            </span>
            <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#E2E8F0', fontWeight: 600 }}>
              Service Express Standard (COD)
            </p>
          </div>
        </div>
      </div>

      {/* Ligne accent rouge */}
      <div style={{ height: '4px', backgroundColor: RED, flexShrink: 0 }} />

      {/* ── CORPS DU DOCUMENT ──────────────────────────────────────────── */}
      <div style={{ padding: '20px 30px', display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

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
                DOCUMENT N° :
              </span>
              <span style={{ fontSize: '22px', fontWeight: 900, color: BLUE, fontFamily: 'monospace' }}>
                {data.noteNumber}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '10.5px', color: LIGHT }}>
              Conservez ce bon pour tout suivi ou réclamation auprès du service client ZIHAN.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <Barcode value={data.trackingNumber} width={160} height={36} />
            <span style={{ fontSize: '9px', color: '#94A3B8', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
              {data.trackingNumber}
            </span>
          </div>
        </div>

        {/* Barre date — sans mention Zone tarifaire */}
        <div
          style={{
            backgroundColor: BG,
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock style={{ width: '14px', height: '14px', color: BLUE, flexShrink: 0 }} />
            <span style={{ fontSize: '11px', color: LIGHT, fontWeight: 600 }}>
              Date &amp; Heure d'Émission :
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: DARK, fontFamily: 'monospace' }}>
              {formattedDate}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: BLUE,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '4px 12px',
              borderRadius: '9999px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#4ADE80',
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            CONFIRMÉ
          </div>
        </div>

        {/* Grille Expéditeur / Destinataire */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

          {/* Expéditeur */}
          <div
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: '12px',
              padding: '14px',
              backgroundColor: '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingBottom: '8px',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: '10px',
                color: BLUE,
                fontWeight: 800,
                fontSize: '10.5px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <MapPin style={{ width: '13px', height: '13px', flexShrink: 0 }} />
              <span>1. Expéditeur (Boutique / Vendeur)</span>
            </div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '13px', color: DARK, lineHeight: 1.3 }}>
              {data.sender.name}
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>
              {data.sender.address}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: MUTED, lineHeight: 1.5 }}>
              {data.sender.city}
              {data.sender.governorate ? `, ${data.sender.governorate}` : ''}
              {data.sender.postalCode ? ` (${data.sender.postalCode})` : ''}
            </p>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: '#EFF6FF',
                color: '#1D4ED8',
                padding: '3px 10px',
                borderRadius: '6px',
                fontWeight: 700,
                fontSize: '11px',
                border: '1px solid #BFDBFE',
                fontFamily: 'monospace',
              }}
            >
              <Phone style={{ width: '11px', height: '11px' }} />
              {data.sender.phone}
            </span>
          </div>

          {/* Destinataire */}
          <div
            style={{
              border: `2px solid ${BLUE}`,
              borderRadius: '12px',
              padding: '14px',
              backgroundColor: BG,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: `1px solid ${BORDER}`,
                marginBottom: '10px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: BLUE,
                  fontWeight: 900,
                  fontSize: '10.5px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <MapPin style={{ width: '13px', height: '13px', color: RED, flexShrink: 0 }} />
                <span>2. Destinataire (Client Final)</span>
              </div>
              <span
                style={{
                  backgroundColor: RED,
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}
              >
                Prioritaire
              </span>
            </div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 900, fontSize: '14px', color: DARK, lineHeight: 1.3 }}>
              {data.recipient.name}
            </p>
            <p style={{ margin: '0 0 2px 0', fontSize: '11px', fontWeight: 600, color: MID, lineHeight: 1.5 }}>
              📍 {data.recipient.address}
            </p>
            <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: MUTED, fontWeight: 600, lineHeight: 1.5 }}>
              {data.recipient.city}
              {data.recipient.governorate && (
                <> — <span style={{ color: BLUE, fontWeight: 800 }}>{data.recipient.governorate}</span></>
              )}
              {data.recipient.postalCode && ` (${data.recipient.postalCode})`}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  backgroundColor: '#ECFDF5',
                  color: '#065F46',
                  padding: '3px 10px',
                  borderRadius: '6px',
                  fontWeight: 800,
                  fontSize: '11.5px',
                  border: '1px solid #A7F3D0',
                  fontFamily: 'monospace',
                }}
              >
                <Phone style={{ width: '11px', height: '11px' }} />
                {data.recipient.phone}
              </span>
              {data.recipient.secondaryPhone && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#EFF6FF',
                    color: '#1E40AF',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    border: '1px solid #BFDBFE',
                    fontFamily: 'monospace',
                  }}
                >
                  <Phone style={{ width: '11px', height: '11px' }} />
                  {data.recipient.secondaryPhone}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
            <thead>
              <tr style={{ backgroundColor: BLUE, color: '#fff' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 800, fontSize: '11px' }}>
                  Désignation des Articles
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, fontSize: '11px', width: '70px' }}>
                  Qté
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '11px', width: '110px' }}>
                  Prix Unit.
                </th>
                <th style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 800, fontSize: '11px', width: '120px' }}>
                  Total (DT)
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#fff' : BG,
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: DARK, lineHeight: 1.4 }}>
                    {item.designation}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: DARK }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: MUTED }}>
                    {item.unitPrice.toFixed(3)} DT
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: BLUE }}>
                    {item.total.toFixed(3)} DT
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Récapitulatif financier & QR code */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '14px', alignItems: 'stretch' }}>
          {/* QR */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              backgroundColor: '#fff',
            }}
          >
            <QrCode value={`https://app.zihan.tn/tracking/${data.trackingNumber}`} size={64} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span
                style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: BLUE,
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                }}
              >
                Suivi Mobile en Direct
              </span>
              <span style={{ fontSize: '9px', color: LIGHT, lineHeight: 1.5 }}>
                Scannez le QR Code pour vérifier l'état ou confirmer la réception.
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: RED, fontFamily: 'monospace' }}>
                app.zihan.tn/tracking/{data.trackingNumber}
              </span>
            </div>
          </div>

          {/* Totaux */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: BG,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
              }}
            >
              <span style={{ color: MUTED }}>Montant Marchandise :</span>
              <span style={{ fontWeight: 700, color: DARK, fontFamily: 'monospace' }}>
                {data.parcelValue.toFixed(3)} DT
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
              }}
            >
              <span style={{ color: MUTED }}>Frais de Livraison ZIHAN :</span>
              <span style={{ fontWeight: 700, color: DARK, fontFamily: 'monospace' }}>
                {data.deliveryFee.toFixed(3)} DT
              </span>
            </div>
            <div
              style={{
                marginTop: '4px',
                padding: '10px 14px',
                backgroundColor: BLUE,
                borderRadius: '8px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                }}
              >
                TOTAL À ENCAISSER (COD) :
              </span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  color: '#FDE047',
                  lineHeight: 1,
                }}
              >
                {data.totalToCollect.toFixed(3)} DT
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {data.notes && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1px solid #FCD34D',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '10.5px',
              color: '#78350F',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '6px',
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                fontWeight: 900,
                textTransform: 'uppercase',
                color: '#92400E',
                whiteSpace: 'nowrap',
              }}
            >
              Remarque :
            </span>
            <span style={{ fontWeight: 600 }}>{data.notes}</span>
          </div>
        )}

        {/* Signatures */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {[
            {
              label: 'Signature & Cachet Expéditeur / Hub ZIHAN',
              sub: 'Conforme pour enlèvement et prise en charge',
            },
            {
              label: 'Signature & Reçu Client Destinataire',
              sub: 'Bon pour accord de livraison et paiement COD',
            },
          ].map(({ label, sub }, i) => (
            <div
              key={i}
              style={{
                border: '1px dashed #94A3B8',
                borderRadius: '10px',
                padding: '12px 14px',
                textAlign: 'center',
                backgroundColor: '#fff',
                height: '72px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 800,
                  color: BLUE,
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: '8.5px',
                  color: '#94A3B8',
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: '4px',
                  lineHeight: 1.3,
                }}
              >
                {sub}
              </span>
            </div>
          ))}
        </div>

      </div>

      {/* ── PIED DE PAGE OFFICIEL ──────────────────────────────────────── */}
      <div
        style={{
          borderTop: `2px solid ${RED}`,
          padding: '10px 30px 14px 30px',
          backgroundColor: BG,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '9px',
            color: LIGHT,
          }}
        >
          <div>
            <p style={{ margin: 0, fontWeight: 900, color: BLUE, fontSize: '10px', lineHeight: 1.4 }}>
              ZIHAN SUPER DELIVERY EXPRESS SARL
            </p>
            <p style={{ margin: '2px 0 0 0', lineHeight: 1.4 }}>
              Rue des anémones - Nouvelle Médina, Ben Arous, Tunisie
            </p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, color: DARK, lineHeight: 1.5 }}>
              📞 27 394 418 / 27 394 137 &nbsp;•&nbsp; 💬 WhatsApp : 27 394 418
            </p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: BLUE, lineHeight: 1.5 }}>
              ✉️ samiayed1965@gmail.com
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 900, color: BLUE, fontSize: '10.5px', lineHeight: 1.4 }}>
              www.zihan.tn
            </p>
            <p style={{ margin: '2px 0 0 0', color: RED, fontWeight: 700, lineHeight: 1.4 }}>
              Livraison Rapide &amp; Fiable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
