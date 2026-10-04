import jsPDF from 'jspdf';
import type { Parcel } from '@/types';

// Status label mapping (French)
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepte',
  assigned: 'Assigne',
  picked_up: 'Recupere',
  in_transit: 'En cours',
  contacted: 'Contacte',
  delivered: 'Livre',
  rescheduled: 'Reporte',
  customer_absent: 'Client absent',
  wrong_address: 'Mauvaise adresse',
  failed: 'Echoue',
  returned: 'Retourne',
  cancelled: 'Annule',
  refused: 'Refuse',
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function generateDriverPlanningPdf(allParcels: Parcel[], driverName: string): void {
  // Filtrer uniquement les colis en cours / en attente de livraison pour la tournée du jour
  const parcels = allParcels.filter(
    (p) => !['delivered', 'returned', 'refused', 'cancelled'].includes(p.status)
  );

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Palette de couleurs
  const BLUE_DARK: [number, number, number] = [27, 61, 135];
  const BLUE_LIGHT: [number, number, number] = [238, 243, 249];
  const ROW_ALT: [number, number, number] = [248, 250, 252];
  const WHITE: [number, number, number] = [255, 255, 255];
  const TEXT_DARK: [number, number, number] = [22, 32, 51];
  const TEXT_MUTED: [number, number, number] = [102, 112, 133];
  const AMBER: [number, number, number] = [217, 119, 6];

  // En-tête principal
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('ZIHAN SUPER DELIVERY - FEUILLE DE ROUTE / TOURNEE DU JOUR', margin, 10);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Livreur : ${driverName}   |   Date : ${today}   |   Total a distribuer : ${parcels.length} colis`,
    margin,
    18
  );

  // Statistiques financières de la tournée active
  const totalCOD = parcels.reduce((s, p) => s + (p.total_amount || 0), 0);
  const totalArticles = parcels.reduce((s, p) => s + (p.goods_amount || 0), 0);

  const boxes = [
    { label: 'Colis a Livrer', value: `${parcels.length} colis`, color: AMBER },
    { label: 'Valeur Marchandises', value: `${totalArticles.toFixed(3)} DT`, color: TEXT_DARK },
    { label: 'Total COD a Encaisser', value: `${totalCOD.toFixed(3)} DT`, color: BLUE_DARK },
  ];

  const boxW = 55;
  const boxH = 12;
  const boxY = 27;
  const boxGap = 5;
  let boxX = margin;

  for (const box of boxes) {
    doc.setFillColor(...BLUE_LIGHT);
    doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'F');
    doc.setTextColor(...(box.color as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(box.value, boxX + 4, boxY + 5.5);
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(box.label, boxX + 4, boxY + 9.5);
    boxX += boxW + boxGap;
  }

  // Configuration du tableau optimisé pour impression papier / terrain
  const tableY = boxY + boxH + 4;

  const cols = [
    { header: '#', key: 'idx', w: 8 },
    { header: 'N Suivi', key: 'tracking', w: 26 },
    { header: 'Destinataire', key: 'recipient', w: 34 },
    { header: 'Telephone', key: 'phone', w: 30 },
    { header: 'Adresse Complete / Ville', key: 'address', w: 66 },
    { header: 'Description / Qte', key: 'description', w: 42 },
    { header: 'Statut', key: 'status', w: 22 },
    { header: 'A Encaisser', key: 'amount', w: 25 },
    { header: 'Signature Client', key: 'signature', w: 24 },
  ];

  const rowH = 11;
  const headerH = 8;

  function drawTableHeader(startY: number) {
    let cx = margin;
    doc.setFillColor(...BLUE_DARK);
    doc.rect(margin, startY, pageWidth - margin * 2, headerH, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    for (const col of cols) {
      doc.text(col.header, cx + 2, startY + 5.5);
      cx += col.w;
    }
    return startY + headerH;
  }

  let y = drawTableHeader(tableY);
  let pageNum = 1;

  if (parcels.length === 0) {
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Aucun colis en attente de livraison pour cette tournee.', pageWidth / 2, y + 15, {
      align: 'center',
    });
  }

  for (let i = 0; i < parcels.length; i++) {
    if (y + rowH > pageHeight - 14) {
      // Pied de page
      doc.setFillColor(...BLUE_LIGHT);
      doc.rect(0, pageHeight - 9, pageWidth, 9, 'F');
      doc.setTextColor(...TEXT_MUTED);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.text(
        `ZIHAN Express - Tournee de ${driverName} - Page ${pageNum} - Contact Direction: 27 394 418 / 27 394 137`,
        pageWidth / 2,
        pageHeight - 3,
        { align: 'center' }
      );

      doc.addPage();
      pageNum++;

      doc.setFillColor(...BLUE_DARK);
      doc.rect(0, 0, pageWidth, 11, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(`ZIHAN Express - Tournee de ${driverName} (suite, page ${pageNum})`, margin, 7.5);

      y = drawTableHeader(14);
    }

    const p = parcels[i];
    const isEven = i % 2 === 0;

    doc.setFillColor(...(isEven ? WHITE : ROW_ALT));
    doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F');

    // Lignes de séparation
    doc.setDrawColor(215, 222, 230);
    doc.line(margin, y + rowH, pageWidth - margin, y + rowH);

    // Données cellules
    const tel = p.recipient_secondary_phone
      ? `${p.recipient_phone} / ${p.recipient_secondary_phone}`
      : p.recipient_phone;

    const adr = `${p.recipient_governorate}${p.recipient_delegation ? ' - ' + p.recipient_delegation : ''}, ${p.recipient_address}`;

    const values = [
      String(i + 1),
      p.tracking_number,
      p.recipient_name.length > 22 ? p.recipient_name.slice(0, 20) + '...' : p.recipient_name,
      tel.length > 20 ? tel.slice(0, 18) + '...' : tel,
      adr.length > 46 ? adr.slice(0, 44) + '...' : adr,
      `${p.description.length > 22 ? p.description.slice(0, 20) + '...' : p.description} (x${p.quantity})`,
      getStatusLabel(p.status),
      `${p.total_amount.toFixed(3)} DT`,
      '', // Zone signature
    ];

    let cx = margin;
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      doc.setFontSize(6.5);

      if (col.key === 'tracking') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE_DARK);
      } else if (col.key === 'amount') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 80, 20);
      } else if (col.key === 'phone') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT_DARK);
      } else if (col.key === 'signature') {
        // Boite vide pour signature papier du client
        doc.setDrawColor(180, 190, 205);
        doc.rect(cx + 2, y + 1.5, col.w - 4, rowH - 3);
        doc.setTextColor(...TEXT_MUTED);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_DARK);
      }

      if (col.key !== 'signature') {
        doc.text(values[c], cx + 2, y + 6.5);
      }

      cx += col.w;
    }

    y += rowH;
  }

  // Pied de page sur la dernière page
  doc.setFillColor(...BLUE_LIGHT);
  doc.rect(0, pageHeight - 9, pageWidth, 9, 'F');
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.text(
    `ZIHAN Super Delivery - Tournee de ${driverName} - Page ${pageNum} - Genere le ${new Date().toLocaleString('fr-FR')} - Support: 27 394 418 / 27 394 137`,
    pageWidth / 2,
    pageHeight - 3,
    { align: 'center' }
  );

  const fileName = `tournee_active_${driverName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
