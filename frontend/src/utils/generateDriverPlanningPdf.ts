import jsPDF from 'jspdf';
import type { Parcel } from '@/types';

// Status label mapping (French)
const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  accepted: 'Accepte',
  assigned: 'Assigne',
  picked_up: 'Recupere',
  in_transit: 'En transit',
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

export function generateDriverPlanningPdf(parcels: Parcel[], driverName: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Color palette
  const BLUE_DARK: [number, number, number] = [27, 61, 135];
  const BLUE_LIGHT: [number, number, number] = [238, 243, 249];
  const ROW_ALT: [number, number, number] = [248, 250, 252];
  const WHITE: [number, number, number] = [255, 255, 255];
  const TEXT_DARK: [number, number, number] = [22, 32, 51];
  const TEXT_MUTED: [number, number, number] = [102, 112, 133];
  const GREEN: [number, number, number] = [5, 150, 105];
  const AMBER: [number, number, number] = [217, 119, 6];
  const RED: [number, number, number] = [220, 38, 38];

  // Header banner
  doc.setFillColor(...BLUE_DARK);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Zihan Delivery - Planning Livreur', margin, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Livreur : ${driverName}   |   Date : ${today}   |   Total : ${parcels.length} colis`, margin, 20);

  // Summary boxes
  const delivered = parcels.filter((p) => p.status === 'delivered').length;
  const active = parcels.filter((p) => !['delivered', 'returned', 'refused', 'cancelled'].includes(p.status)).length;
  const issues = parcels.filter((p) => ['returned', 'refused', 'wrong_address', 'customer_absent'].includes(p.status)).length;
  const totalCOD = parcels
    .filter((p) => !['returned', 'refused'].includes(p.status))
    .reduce((s, p) => s + (p.total_amount || 0), 0);

  const boxes = [
    { label: 'A Livrer', value: String(active), color: AMBER },
    { label: 'Livres', value: String(delivered), color: GREEN },
    { label: 'Retours / Alertes', value: String(issues), color: RED },
    { label: 'Total COD', value: `${totalCOD.toFixed(3)} DT`, color: BLUE_DARK },
  ];

  const boxW = 48;
  const boxH = 14;
  const boxY = 30;
  const boxGap = 4;
  const totalBoxWidth = boxes.length * boxW + (boxes.length - 1) * boxGap;
  let boxX = (pageWidth - totalBoxWidth) / 2;

  for (const box of boxes) {
    doc.setFillColor(...BLUE_LIGHT);
    doc.roundedRect(boxX, boxY, boxW, boxH, 2, 2, 'F');
    doc.setTextColor(...(box.color as [number, number, number]));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(box.value, boxX + boxW / 2, boxY + 6, { align: 'center' });
    doc.setTextColor(...TEXT_MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(box.label, boxX + boxW / 2, boxY + 11, { align: 'center' });
    boxX += boxW + boxGap;
  }

  // Table setup
  const tableY = boxY + boxH + 6;

  const cols = [
    { header: '#', key: 'idx', w: 8 },
    { header: 'N Suivi', key: 'tracking', w: 32 },
    { header: 'Destinataire', key: 'recipient', w: 38 },
    { header: 'Telephone', key: 'phone', w: 28 },
    { header: 'Adresse / Gouvernorat', key: 'address', w: 52 },
    { header: 'Article (qte)', key: 'description', w: 38 },
    { header: 'Statut', key: 'status', w: 26 },
    { header: 'A Encaisser', key: 'amount', w: 28 },
  ];

  const rowH = 9;
  const headerH = 10;

  function drawTableHeader(startY: number) {
    let cx = margin;
    doc.setFillColor(...BLUE_DARK);
    doc.rect(margin, startY, pageWidth - margin * 2, headerH, 'F');
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    for (const col of cols) {
      doc.text(col.header, cx + 2, startY + 7);
      cx += col.w;
    }
    return startY + headerH;
  }

  let y = drawTableHeader(tableY);

  let pageNum = 1;

  for (let i = 0; i < parcels.length; i++) {
    if (y + rowH > pageHeight - 14) {
      // Footer current page
      doc.setFillColor(...BLUE_LIGHT);
      doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
      doc.setTextColor(...TEXT_MUTED);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.text(
        `Zihan Delivery - Document genere le ${new Date().toLocaleString('fr-FR')} - Page ${pageNum}`,
        pageWidth / 2,
        pageHeight - 3,
        { align: 'center' }
      );

      doc.addPage();
      pageNum++;

      doc.setFillColor(...BLUE_DARK);
      doc.rect(0, 0, pageWidth, 12, 'F');
      doc.setTextColor(...WHITE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`Zihan Delivery - Planning de ${driverName} (suite, page ${pageNum})`, margin, 8);

      y = drawTableHeader(18);
    }

    const p = parcels[i];
    const isEven = i % 2 === 0;

    doc.setFillColor(...(isEven ? WHITE : ROW_ALT));
    doc.rect(margin, y, pageWidth - margin * 2, rowH, 'F');

    doc.setDrawColor(220, 226, 234);
    doc.line(margin, y + rowH, pageWidth - margin, y + rowH);

    const values = [
      String(i + 1),
      p.tracking_number,
      p.recipient_name.length > 20 ? p.recipient_name.slice(0, 18) + '...' : p.recipient_name,
      p.recipient_phone,
      `${p.recipient_governorate}${p.recipient_delegation ? ' - ' + p.recipient_delegation : ''}`,
      `${p.description.length > 18 ? p.description.slice(0, 16) + '...' : p.description} (x${p.quantity})`,
      getStatusLabel(p.status),
      `${p.total_amount.toFixed(3)} DT`,
    ];

    let cx = margin;
    for (let c = 0; c < cols.length; c++) {
      const col = cols[c];
      doc.setFontSize(7);

      if (col.key === 'status') {
        if (p.status === 'delivered') doc.setTextColor(...GREEN);
        else if (['returned', 'refused', 'wrong_address', 'customer_absent', 'failed'].includes(p.status)) doc.setTextColor(...RED);
        else if (['rescheduled', 'pending', 'accepted'].includes(p.status)) doc.setTextColor(...AMBER);
        else doc.setTextColor(...TEXT_DARK);
        doc.setFont('helvetica', 'bold');
      } else if (col.key === 'tracking') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...BLUE_DARK);
      } else if (col.key === 'amount') {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT_DARK);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TEXT_DARK);
      }

      doc.text(values[c], cx + 2, y + 6);
      cx += col.w;
    }

    y += rowH;
  }

  // Footer on last page
  doc.setFillColor(...BLUE_LIGHT);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  doc.setTextColor(...TEXT_MUTED);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.text(
    `Zihan Delivery - Document genere le ${new Date().toLocaleString('fr-FR')} - Page ${pageNum}`,
    pageWidth / 2,
    pageHeight - 3,
    { align: 'center' }
  );

  const fileName = `planning_${driverName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
