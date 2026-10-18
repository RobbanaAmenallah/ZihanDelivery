import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Downloads a DOM element as a pixel-perfect, unscaled high-quality PDF document (A4 or Thermal 100x150mm).
 * 
 * @param sourceElement HTMLElement to render into PDF
 * @param filename File name for the downloaded PDF
 * @param format 'a4' (210x297mm) or 'a6' (100x150mm standard thermal shipping format)
 */
export async function downloadElementAsPdf(
  sourceElement: HTMLElement,
  filename: string = 'Document_ZIHAN.pdf',
  format: 'a4' | 'a6' = 'a4'
): Promise<void> {
  const isLabel = format === 'a6';
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

    // 2. Target Page Dimensions in mm (100x150mm for direct thermal, 210x297mm for A4)
    const pageWidth = isLabel ? 100 : 210;
    const pageHeight = isLabel ? 150 : 297;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isLabel ? [100, 150] : 'a4',
      compress: true,
    });

    if (isLabel) {
      // Direct thermal label (single page fitted)
      const canvasRatio = canvas.width / canvas.height;
      let renderWidth = pageWidth;
      let renderHeight = pageWidth / canvasRatio;
      if (renderHeight > pageHeight) {
        renderHeight = pageHeight;
        renderWidth = pageHeight * canvasRatio;
      }
      const xOffset = (pageWidth - renderWidth) / 2;
      const yOffset = (pageHeight - renderHeight) / 2;
      pdf.addImage(imgData, 'PNG', xOffset, yOffset, renderWidth, renderHeight, undefined, 'FAST');
    } else {
      // Standard A4 document (Multi-page slicing so long documents aren't squeezed into 1 page)
      const pxPerPage = Math.floor((canvas.width * pageHeight) / pageWidth);
      const totalPages = Math.ceil(canvas.height / pxPerPage);

      if (totalPages <= 1) {
        const renderHeight = (canvas.height * pageWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, renderHeight, undefined, 'FAST');
      } else {
        for (let i = 0; i < totalPages; i++) {
          const sliceHeight = Math.min(pxPerPage, canvas.height - i * pxPerPage);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeight;
          const ctx = pageCanvas.getContext('2d');

          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            ctx.drawImage(
              canvas,
              0,
              i * pxPerPage,
              canvas.width,
              sliceHeight,
              0,
              0,
              canvas.width,
              sliceHeight
            );
            const pageData = pageCanvas.toDataURL('image/png', 1.0);
            const heightMm = (sliceHeight * pageWidth) / canvas.width;

            if (i > 0) {
              pdf.addPage();
            }
            pdf.addImage(pageData, 'PNG', 0, 0, pageWidth, heightMm, undefined, 'FAST');
          }
        }
      }
    }

    // 3. Trigger download
    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);
  } catch (err) {
    console.error('Erreur de génération PDF:', err);
    throw err;
  }
}

