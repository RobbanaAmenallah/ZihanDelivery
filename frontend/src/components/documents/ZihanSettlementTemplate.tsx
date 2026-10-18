import React from 'react';
import logoImg from '@/assets/logo1.jpg';

export interface SettlementParcelItem {
  index: number;
  id: string;
  trackingNumber: string;
  recipientName: string;
  recipientPhone?: string;
  recipientGovernorate?: string;
  deliveryDate: string;
  goodsAmount: number; // Montant TND
  isSettled: boolean;
  settledAt?: string | null;
  settlementMethod?: string | null;
}

export interface DaySettlementGroup {
  date: string;
  dateLabel: string;
  parcelsCount: number;
  totalDayAmount: number;
  isAllSettled: boolean;
  items: SettlementParcelItem[];
}

export interface ClientSettlementData {
  settlementNumber: string;
  settlementDate: string;
  settlementMethod: 'cheque' | 'especes' | string;
  settlementReference?: string;
  client: {
    name: string;
    company?: string;
    phone: string;
    email?: string;
    address?: string;
    city?: string;
    governorate?: string;
  };
  totalSettledAmount: number;
  totalPendingAmount: number;
  totalDeliveredCount: number;
  groups: DaySettlementGroup[];
}

interface ZihanSettlementTemplateProps {
  data: ClientSettlementData;
}

const BLUE = '#1B3D87';
const RED = '#EA4E52';
const DARK = '#0F172A';
const MUTED = '#475569';
const LIGHT = '#64748B';
const BORDER = '#CBD5E1';
const BG = '#F8FAFC';

export const ZihanSettlementTemplate: React.FC<ZihanSettlementTemplateProps> = ({ data }) => {
  return (
    <div
      style={{
        width: '210mm',
        minHeight: '270mm',
        padding: '16mm 18mm',
        backgroundColor: '#FFFFFF',
        fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
        color: DARK,
        fontSize: '11px',
        lineHeight: 1.45,
        boxSizing: 'border-box',
        margin: '0 auto',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: `2.5px solid ${BLUE}`, paddingBottom: '14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img src={logoImg} alt="ZIHAN DELIVERY" style={{ height: '54px', objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: BLUE, letterSpacing: '0.5px' }}>
              ZIHAN DELIVERY
            </div>
            <div style={{ fontSize: '10px', color: RED, fontWeight: 700, letterSpacing: '0.3px' }}>
              SERVICES DE LIVRAISON EXPRESS & ENCAISSEMENT COD
            </div>
            <div style={{ fontSize: '9px', color: LIGHT, marginTop: '2px' }}>
              Tunisie • Tél: +216 29 177 004 • contact@zihandelivery.tn
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'inline-block', backgroundColor: BLUE, color: '#FFFFFF', padding: '4px 12px', borderRadius: '4px', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px' }}>
            BORDEREAU DE RÈGLEMENT
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: DARK, marginTop: '5px' }}>
            N° : {data.settlementNumber}
          </div>
          <div style={{ fontSize: '10px', color: MUTED }}>
            Date émission : {data.settlementDate}
          </div>
        </div>
      </div>

      {/* ── CLIENT & SETTLEMENT INFO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '18px' }}>
        {/* Expéditeur / Boutique */}
        <div style={{ border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '12px', backgroundColor: BG }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Boutique & Expéditeur (Bénéficiaire)
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: DARK }}>
            {data.client.company || data.client.name}
          </div>
          {data.client.company && data.client.name !== data.client.company && (
            <div style={{ fontSize: '10px', color: MUTED }}>Contact: {data.client.name}</div>
          )}
          <div style={{ fontSize: '10px', color: MUTED, marginTop: '2px' }}>
            Tél : <span style={{ fontWeight: 600, color: DARK }}>{data.client.phone || '—'}</span>
          </div>
          {data.client.address && (
            <div style={{ fontSize: '10px', color: MUTED }}>
              Adresse : {data.client.address} {data.client.city ? `, ${data.client.city}` : ''} {data.client.governorate ? `(${data.client.governorate})` : ''}
            </div>
          )}
        </div>

        {/* Détails du règlement */}
        <div style={{ border: `1.5px solid ${BLUE}`, borderRadius: '6px', padding: '12px', backgroundColor: '#F0F4FF' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
            Informations de Règlement (Fonds Reversés)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px' }}>
            <div>
              <span style={{ color: LIGHT }}>Mode de règlement :</span>
              <div style={{ fontWeight: 800, color: DARK, fontSize: '11px' }}>Espèces (Cash) 💵</div>
            </div>
            <div>
              <span style={{ color: LIGHT }}>Date de règlement :</span>
              <div style={{ fontWeight: 700, color: DARK, fontSize: '11px' }}>{data.settlementDate}</div>
            </div>
          </div>

          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px dashed ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: DARK }}>Montant Total Réglé :</span>
            <span style={{ fontSize: '16px', fontWeight: 900, color: BLUE }}>
              {data.totalSettledAmount.toFixed(3)} <span style={{ fontSize: '10px' }}>TND</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── RÉCAPITULATIF STATS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
        <div style={{ backgroundColor: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '8px 12px' }}>
          <div style={{ fontSize: '9px', color: LIGHT, textTransform: 'uppercase', fontWeight: 700 }}>Total Colis Livrés</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: DARK }}>{data.totalDeliveredCount} colis</div>
        </div>
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '8px 12px' }}>
          <div style={{ fontSize: '9px', color: '#166534', textTransform: 'uppercase', fontWeight: 700 }}>Total Réglé (Payé)</div>
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#15803D' }}>
            {data.totalSettledAmount.toFixed(3)} TND
          </div>
        </div>
        <div style={{ backgroundColor: data.totalPendingAmount > 0 ? '#FFFBEB' : '#F8FAFC', border: data.totalPendingAmount > 0 ? '1px solid #FDE68A' : `1px solid ${BORDER}`, borderRadius: '6px', padding: '8px 12px' }}>
          <div style={{ fontSize: '9px', color: data.totalPendingAmount > 0 ? '#92400E' : LIGHT, textTransform: 'uppercase', fontWeight: 700 }}>En attente de versement</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: data.totalPendingAmount > 0 ? '#B45309' : MUTED }}>
            {data.totalPendingAmount.toFixed(3)} TND
          </div>
        </div>
      </div>

      {/* ── SECTION DÉTAIL DES COLIS PAR ÉTAT DE RÈGLEMENT ── */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 800, color: BLUE, textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: `1.5px solid ${BLUE}`, paddingBottom: '4px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>1. Détail des Colis Livrés & Sommes par Jour</span>
          <span style={{ fontSize: '10px', color: LIGHT, fontWeight: 500, textTransform: 'none' }}>
            Regroupement par date de livraison
          </span>
        </div>

        {data.groups.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: MUTED, border: `1px dashed ${BORDER}`, borderRadius: '6px' }}>
            Aucun colis livré sur cette période.
          </div>
        ) : (
          data.groups.map((grp) => (
            <div key={grp.date} style={{ marginBottom: '16px', border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'hidden' }}>
              {/* Entête du Jour / Date avec la Somme par Jour */}
              <div
                style={{
                  backgroundColor: '#F1F5F9',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, color: DARK, fontSize: '11px' }}>
                    📅 {grp.dateLabel}
                  </span>
                  <span style={{ fontSize: '10px', color: MUTED, backgroundColor: '#E2E8F0', padding: '1px 6px', borderRadius: '10px' }}>
                    {grp.parcelsCount} {grp.parcelsCount > 1 ? 'colis' : 'colis'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '10px', color: MUTED, fontWeight: 600 }}>Somme du jour :</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: grp.isAllSettled ? '#15803D' : BLUE }}>
                    {grp.totalDayAmount.toFixed(3)} TND
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 700,
                      backgroundColor: grp.isAllSettled ? '#DCFCE7' : '#FEF3C7',
                      color: grp.isAllSettled ? '#166534' : '#92400E',
                    }}
                  >
                    {grp.isAllSettled ? 'Réglé' : 'En attente'}
                  </span>
                </div>
              </div>

              {/* Tableau des colis du jour */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#FAFAFA', borderBottom: `1px solid ${BORDER}`, color: MUTED, textAlign: 'left' }}>
                    <th style={{ padding: '6px 8px', width: '35px' }}>N°</th>
                    <th style={{ padding: '6px 8px', width: '100px' }}>N° Suivi</th>
                    <th style={{ padding: '6px 8px' }}>Destinataire</th>
                    <th style={{ padding: '6px 8px', width: '90px' }}>Gouvernorat</th>
                    <th style={{ padding: '6px 8px', width: '100px' }}>Date Livraison</th>
                    <th style={{ padding: '6px 8px', width: '90px', textAlign: 'right' }}>Montant (TND)</th>
                    <th style={{ padding: '6px 8px', width: '80px', textAlign: 'center' }}>État</th>
                  </tr>
                </thead>
                <tbody>
                  {grp.items.map((item) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: `1px solid ${BORDER}`,
                        backgroundColor: item.isSettled ? '#FFFFFF' : '#FFFDF5',
                      }}
                    >
                      <td style={{ padding: '6px 8px', fontWeight: 700, color: MUTED }}>{item.index}</td>
                      <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 700, color: BLUE }}>
                        {item.trackingNumber}
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ fontWeight: 600, color: DARK }}>{item.recipientName}</div>
                        {item.recipientPhone && (
                          <div style={{ fontSize: '9px', color: LIGHT }}>{item.recipientPhone}</div>
                        )}
                      </td>
                      <td style={{ padding: '6px 8px', color: MUTED }}>{item.recipientGovernorate || '—'}</td>
                      <td style={{ padding: '6px 8px', color: MUTED, whiteSpace: 'nowrap' }}>
                        {item.deliveryDate}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 800, color: DARK }}>
                        {item.goodsAmount.toFixed(3)}
                      </td>
                      <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            fontSize: '8px',
                            fontWeight: 700,
                            backgroundColor: item.isSettled ? '#DCFCE7' : '#FEF3C7',
                            color: item.isSettled ? '#166534' : '#92400E',
                          }}
                        >
                          {item.isSettled ? 'RÉGLÉ' : 'EN COURS'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>

      {/* ── SIGNATURES & CACHET ── */}
      <div style={{ marginTop: '24px', borderTop: `1px solid ${BORDER}`, paddingTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div style={{ border: `1px dashed ${BORDER}`, borderRadius: '6px', padding: '10px', minHeight: '90px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: MUTED, textTransform: 'uppercase' }}>
            Signature & Décharge du Client / Bénéficiaire :
          </div>
          <div style={{ fontSize: '9px', color: LIGHT, marginTop: '2px' }}>
            Reconnaît avoir reçu le montant total de {data.totalSettledAmount.toFixed(3)} TND en Espèces (Cash).
          </div>
        </div>

        <div style={{ border: `1px dashed ${BORDER}`, borderRadius: '6px', padding: '10px', minHeight: '90px', textAlign: 'right' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: BLUE, textTransform: 'uppercase' }}>
            Cachet & Signature ZIHAN DELIVERY :
          </div>
          <div style={{ fontSize: '9px', color: LIGHT, marginTop: '2px' }}>
            Document officiel de règlement COD
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '8.5px', color: LIGHT, borderTop: `1px solid ${BORDER}`, paddingTop: '8px' }}>
        ZIHAN DELIVERY — Société de services logistiques & transport express • R.C: En cours • Tél: +216 29 177 004 • Email: contact@zihandelivery.tn
      </div>
    </div>
  );
};
