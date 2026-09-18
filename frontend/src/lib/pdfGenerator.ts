import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads a DOM element as a pixel-perfect, unscaled high-quality PDF document (A4 or A6).
 * 
 * @param sourceElement HTMLElement to render into PDF
 * @param filename File name for the downloaded PDF
 * @param format 'a4' (210x297mm) or 'a6' (105x148mm)
 */
export async function downloadElementAsPdf(
  sourceElement: HTMLElement,
  filename: string = 'Document_ZIHAN.pdf',
  format: 'a4' | 'a6' = 'a4'
): Promise<void> {
  const isA6 = format === 'a6';
  const targetElement = (sourceElement.firstElementChild as HTMLElement) || sourceElement;

  try {
    // 1. Render directly to high-DPI canvas from the live rendered DOM element
    const canvas = await html2canvas(targetElement, {
      scale: 3, // 3x resolution for razor-sharp barcodes, QR codes, borders and text
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
    });

    const imgData = canvas.toDataURL('image/png', 1.0);

    // 2. Target Page Dimensions in mm
    const pageWidth = isA6 ? 105 : 210;
    const pageHeight = isA6 ? 148 : 297;

    const canvasRatio = canvas.width / canvas.height;

    // Calculate fitted dimensions preserving exact aspect ratio without distortion or clipping
    let renderWidth = pageWidth;
    let renderHeight = pageWidth / canvasRatio;

    if (renderHeight > pageHeight) {
      renderHeight = pageHeight;
      renderWidth = pageHeight * canvasRatio;
    }

    const xOffset = (pageWidth - renderWidth) / 2;
    const yOffset = (pageHeight - renderHeight) / 2;

    // 3. Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isA6 ? 'a6' : 'a4',
      compress: true,
    });

    // 4. Place image centered and fitted
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');

    // 5. Trigger download
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
  } catch (err) {
    console.error('Erreur de génération PDF:', err);
    throw err;
  }
}
