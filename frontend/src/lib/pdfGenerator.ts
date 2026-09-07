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
  filename: string = 'Bon_de_Commande_ZIHAN.pdf'
): Promise<void> {
  // 1. Create an isolated off-screen clone with exact A4 dimensions (794px width) and NO parent transforms
  const clone = sourceElement.cloneNode(true) as HTMLElement;
  
  // Strip any parent CSS transforms or scale
  clone.style.transform = 'none';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.width = '794px';
  clone.style.minHeight = '1123px';
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
      width: 794,
      windowWidth: 1200,
    });

    const imgData = canvas.toDataURL('image/png');

    // 3. Create A4 PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // 4. Fit cleanly within A4 boundaries
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, 297));

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
