import { parentPort, workerData } from 'worker_threads';
import { jsPDF } from 'jspdf';

interface PdfWorkerData {
  pngBase64: string;
  width: number;
  height: number;
  dpi: number;
  widthMm: number;
  heightMm: number;
  orientation: 'portrait' | 'landscape';
  artistName?: string;
  copyrightText?: string;
  imageTitle?: string;
  imageDescription?: string;
}

function generatePdf(data: PdfWorkerData): Buffer {
  const { pngBase64, widthMm, heightMm, orientation, artistName, copyrightText, imageTitle, imageDescription } = data;
  
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: [widthMm, heightMm]
  });
  
  pdf.setProperties({
    title: imageTitle || 'Shape Editor Export',
    author: artistName || 'Shape Editor',
    creator: 'Shape Editor - Replit',
    subject: imageDescription || 'Generated artwork',
    keywords: copyrightText ? `Copyright: ${copyrightText}` : undefined
  });
  
  const pngDataUrl = `data:image/png;base64,${pngBase64}`;
  
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, widthMm, heightMm, undefined, 'FAST');
  
  const pdfArrayBuffer = pdf.output('arraybuffer');
  return Buffer.from(pdfArrayBuffer);
}

if (parentPort) {
  try {
    const pdfBuffer = generatePdf(workerData as PdfWorkerData);
    parentPort.postMessage({ success: true, buffer: pdfBuffer });
  } catch (error) {
    parentPort.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'PDF generation failed' 
    });
  }
}
