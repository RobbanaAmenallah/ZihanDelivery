import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads a DOM element as a pixel-perfect, unscaled high-quality A4 PDF document.
 * 
 * @param sourceElement HTMLElement to render into PDF
 * @param filename File name for the downloaded PDF (ex: 'Bon_de_Commande_ZH000153.pdf')
 */
export async function downloadElementAsPdf(
  sourceElement: HTMLElement,
  filename: string = 'Bon_de_Commande_ZIHAN.pdf',
  format: 'a4' | 'a6' = 'a4'
): Promise<void> {
  const isA6 = format === 'a6';

  // 1. Create an isolated off-screen clone with exact dimensions and NO parent transforms
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  
  // Strip any parent CSS transforms or scale
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.width = isA6 ? '397px' : '794px';
  clone.style.minHeight = isA6 ? '560px' : '1123px';
  clone.style.boxShadow = 'none';
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#162033';
  clone.style.position = 'absolute';
  clone.style.left = '-9999px';
  clone.style.top = '0';

  document.body.appendChild(clone);

  try {
    // 2. Render to high-DPI canvas
    const canvas = await html2canvas(clone, {
      scale: 2, // 2x resolution for razor-sharp barcodes, QR codes and text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: isA6 ? 397 : 794,
      windowWidth: isA6 ? 600 : 1200,
    });

    const imgData = canvas.toDataURL('image/png');

    // 3. Create PDF (A4: 210mm x 297mm, A6: 105mm x 148mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isA6 ? 'a6' : 'a4',
      compress: true,
    });

    const pdfWidth = isA6 ? 105 : 210;
    const maxHeight = isA6 ? 148 : 297;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // 4. Fit cleanly within boundaries
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, maxHeight));

    // 5. Trigger download
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
  } finally {
    // 6. Clean up off-screen clone
    if (document.body.contains(clone)) {
      document.body.removeChild(clone);
    }
  }
}
