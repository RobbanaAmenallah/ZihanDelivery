import React from 'react';
import { Barcode } from './Barcode';
import { QrCode } from './QrCode';
import { MapPin, Phone, Clock } from 'lucide-react';

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
  const isGrandTunis = ['Tunis', 'Ariana', 'Ben Arous', 'Manouba'].some(
    (g) => g.toLowerCase() === (data.recipient.governorate || '').toLowerCase()
  );

  const formattedDate =
    data.createdAt ||
    new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div
      className="bg-white text-[#162033] shadow-xl print:shadow-none overflow-hidden flex flex-col font-sans select-none"
      style={{
        width: '794px',
        minHeight: '1123px',
        boxSizing: 'border-box',
        backgroundColor: '#ffffff',
        color: '#162033',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}
    >
      {/* ── BANDEAU SUPÉRIEUR BLEU & ROUGE ZIHAN ───────────────────────────── */}
      <div style={{ backgroundColor: '#1B3D87', color: '#ffffff', padding: '16px 28px 14px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                color: '#1B3D87',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '20px',
              }}
            >
              Z
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 900, letterSpacing: '0.04em', margin: 0, textTransform: 'uppercase' }}>
                ZIHAN SUPER DELIVERY EXPRESS
              </h2>
              <p style={{ fontSize: '10.5px', color: '#CBD5E1', margin: '2px 0 0 0', fontWeight: 500 }}>
                Plateforme Logistique & Transport Express en Tunisie
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span
              style={{
                backgroundColor: '#EA4E52',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '9999px',
                letterSpacing: '0.05em',
              }}
            >
              BON DE COMMANDE OFFICIEL
            </span>
            <span style={{ fontSize: '11px', color: '#E2E8F0', marginTop: '4px', fontWeight: 600 }}>
              Service Express Standard (COD)
            </span>
          </div>
        </div>
      </div>

      {/* Ligne d'accent Rouge */}
      <div style={{ height: '4px', backgroundColor: '#EA4E52', width: '100%' }} />

      {/* ── CONTENU DU DOCUMENT A4 ────────────────────────────────────────── */}
      <div style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '18px', flex: 1 }}>
        
        {/* Entête Numéro de Suivi & Code-barres */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>
                DOCUMENT N° :
              </span>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#1B3D87', fontFamily: 'monospace' }}>
                {data.noteNumber}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: '#64748B', margin: '3px 0 0 0' }}>
              Conservez ce bon pour tout suivi ou réclamation auprès du service client ZIHAN.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <Barcode value={data.trackingNumber} width={160} height={36} />
            <span style={{ fontSize: '9px', color: '#94A3B8', fontFamily: 'monospace' }}>{data.trackingNumber}</span>
          </div>
        </div>

        {/* Barre d'Informations Réelles (Date & Heure d'Émission) */}
        <div
          style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '10px',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '11.5px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock style={{ width: '15px', height: '15px', color: '#1B3D87' }} />
              <span style={{ color: '#64748B', fontWeight: 600 }}>Date & Heure d'Émission :</span>
              <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>{formattedDate}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#64748B', fontWeight: 600 }}>Zone :</span>
              <span style={{ fontWeight: 800, color: isGrandTunis ? '#1D4ED8' : '#7E22CE' }}>
                {isGrandTunis ? 'Grand Tunis (Tarif 7.000 DT)' : 'Régionale (Tarif 10.000 DT)'}
              </span>
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#1B3D87',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#4ADE80' }} />
            <span>CONFIRMÉ</span>
          </div>
        </div>

        {/* Grille Expéditeur & Destinataire */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          
          {/* Bloc Expéditeur */}
          <div
            style={{
              border: '1px solid #CBD5E1',
              borderRadius: '12px',
              padding: '14px',
              backgroundColor: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingBottom: '8px',
                borderBottom: '1px solid #E2E8F0',
                color: '#1B3D87',
                fontWeight: 800,
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <MapPin style={{ width: '14px', height: '14px' }} />
              <span>1. Expéditeur (Boutique / Vendeur)</span>
            </div>
            
            <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '13px', color: '#0F172A' }}>{data.sender.name}</p>
              <p style={{ margin: 0, color: '#475569' }}>{data.sender.address}</p>
              <p style={{ margin: 0, color: '#475569' }}>
                {data.sender.city}, {data.sender.governorate} {data.sender.postalCode && `(${data.sender.postalCode})`}
              </p>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#EFF6FF',
                    color: '#1D4ED8',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    fontSize: '11px',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <Phone style={{ width: '12px', height: '12px' }} /> {data.sender.phone}
                </span>
              </div>
            </div>
          </div>

          {/* Bloc Destinataire */}
          <div
            style={{
              border: '2px solid #1B3D87',
              borderRadius: '12px',
              padding: '14px',
              backgroundColor: '#F8FAFC',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '8px',
                borderBottom: '1px solid #CBD5E1',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#1B3D87',
                  fontWeight: 900,
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <MapPin style={{ width: '14px', height: '14px', color: '#EA4E52' }} />
                <span>2. Destinataire (Client Final)</span>
              </div>
              <span
                style={{
                  backgroundColor: '#EA4E52',
                  color: '#ffffff',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  textTransform: 'uppercase',
                }}
              >
                Prioritaire
              </span>
            </div>

            <div style={{ fontSize: '11.5px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <p style={{ margin: 0, fontWeight: 900, fontSize: '14px', color: '#0F172A' }}>{data.recipient.name}</p>
              <p style={{ margin: 0, fontWeight: 600, color: '#1E293B', lineHeight: '1.3' }}>
                📍 {data.recipient.address}
              </p>
              <p style={{ margin: 0, color: '#475569', fontWeight: 600 }}>
                {data.recipient.city} — <span style={{ color: '#1B3D87', fontWeight: 800 }}>{data.recipient.governorate}</span> {data.recipient.postalCode && `(${data.recipient.postalCode})`}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 800,
                    fontSize: '11.5px',
                    border: '1px solid #A7F3D0',
                    fontFamily: 'monospace',
                  }}
                >
                  <Phone style={{ width: '12px', height: '12px' }} /> {data.recipient.phone}
                </span>
                {data.recipient.secondaryPhone && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      backgroundColor: '#EFF6FF',
                      color: '#1E40AF',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontWeight: 700,
                      fontSize: '11px',
                      border: '1px solid #BFDBFE',
                      fontFamily: 'monospace',
                    }}
                  >
                    <Phone style={{ width: '12px', height: '12px' }} /> {data.recipient.secondaryPhone}
                  </span>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Tableau des Articles */}
        <div style={{ borderRadius: '10px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#1B3D87', color: '#ffffff', fontWeight: 800, fontSize: '11px' }}>
                <th style={{ padding: '10px 14px' }}>Désignation des Articles</th>
                <th style={{ padding: '10px 14px', textAlign: 'center', width: '70px' }}>Qté</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', width: '100px' }}>Prix Unit.</th>
                <th style={{ padding: '10px 14px', textAlign: 'right', width: '110px' }}>Total (DT)</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                  }}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#0F172A' }}>
                    {item.designation}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800 }}>{item.quantity}</td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#475569' }}>
                    {item.unitPrice.toFixed(3)} DT
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, color: '#1B3D87' }}>
                    {item.total.toFixed(3)} DT
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Récapitulatif Financier & QR Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '5fr 7fr', gap: '16px', alignItems: 'center' }}>
          
          {/* QR Code de Suivi */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              border: '1px solid #E2E8F0',
              borderRadius: '10px',
              backgroundColor: '#ffffff',
            }}
          >
            <QrCode value={`https://app.zihan.tn/tracking/${data.trackingNumber}`} size={64} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#1B3D87', textTransform: 'uppercase' }}>
                Suivi Mobile en Direct
              </span>
              <span style={{ fontSize: '9px', color: '#64748B', lineHeight: '1.3' }}>
                Scannez le QR Code pour vérifier l'état ou confirmer la réception du colis.
              </span>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#EA4E52', fontFamily: 'monospace' }}>
                app.zihan.tn/tracking/{data.trackingNumber}
              </span>
            </div>
          </div>

          {/* Encadré Total à Encaisser (COD) */}
          <div
            style={{
              padding: '14px',
              borderRadius: '10px',
              backgroundColor: '#F8FAFC',
              border: '1px solid #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
              <span>Montant Marchandise (Articles) :</span>
              <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{data.parcelValue.toFixed(3)} DT</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#475569' }}>
              <span>Frais de Livraison ZIHAN ({isGrandTunis ? 'Grand Tunis 7 DT' : 'Hors Grand Tunis 10 DT'}) :</span>
              <span style={{ fontWeight: 700, color: '#0F172A', fontFamily: 'monospace' }}>{data.deliveryFee.toFixed(3)} DT</span>
            </div>

            {/* Total à Encaisser Grand Format */}
            <div
              style={{
                marginTop: '4px',
                padding: '10px 14px',
                backgroundColor: '#1B3D87',
                borderRadius: '8px',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                TOTAL À ENCAISSER (COD) :
              </span>
              <span style={{ fontSize: '17px', fontWeight: 900, fontFamily: 'monospace', color: '#FDE047' }}>
                {data.totalToCollect.toFixed(3)} DT
              </span>
            </div>
          </div>

        </div>

        {/* Consignes Spéciales (si présentes) */}
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
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontWeight: 900, textTransform: 'uppercase', color: '#92400E' }}>Remarque / Consigne :</span>
            <span style={{ fontWeight: 600 }}>{data.notes}</span>
          </div>
        )}

        {/* Cadres de Signatures Officiels */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
          <div
            style={{
              border: '1px dashed #94A3B8',
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              height: '75px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#1B3D87', textTransform: 'uppercase' }}>
              Signature & Cachet Expéditeur / Hub ZIHAN
            </span>
            <span style={{ fontSize: '8.5px', color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: '4px' }}>
              Conforme pour enlèvement et prise en charge
            </span>
          </div>

          <div
            style={{
              border: '1px dashed #94A3B8',
              borderRadius: '10px',
              padding: '12px',
              textAlign: 'center',
              backgroundColor: '#ffffff',
              height: '75px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#1B3D87', textTransform: 'uppercase' }}>
              Signature & Reçu Client Destinataire
            </span>
            <span style={{ fontSize: '8.5px', color: '#94A3B8', borderTop: '1px solid #E2E8F0', paddingTop: '4px' }}>
              Bon pour accord de livraison et paiement COD
            </span>
          </div>
        </div>

      </div>

      {/* ── PIED DE PAGE OFFICIEL ZIHAN ───────────────────────────────────── */}
      <div style={{ borderTop: '2px solid #EA4E52', padding: '12px 30px 16px 30px', backgroundColor: '#F8FAFC' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px', color: '#64748B' }}>
          <div>
            <p style={{ margin: 0, fontWeight: 900, color: '#1B3D87', fontSize: '10px' }}>
              ZIHAN SUPER DELIVERY EXPRESS SARL
            </p>
            <p style={{ margin: '2px 0 0 0' }}>
              Rue des anémones - Nouvelle Médina, Ben Arous, Tunisie
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, color: '#0F172A' }}>
              📞 27 394 418 / 27 394 137 &nbsp;•&nbsp; 💬 WhatsApp : 27 394 418
            </p>
            <p style={{ margin: '2px 0 0 0', fontWeight: 600, color: '#1B3D87' }}>
              ✉️ samiayed1965@gmail.com &nbsp;•&nbsp; MF : 1845239/M/A/000
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 900, color: '#1B3D87', fontSize: '10.5px' }}>
              www.zihan.tn
            </p>
            <p style={{ margin: '2px 0 0 0', color: '#EA4E52', fontWeight: 700 }}>
              Livraison Rapide & Fiable
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
