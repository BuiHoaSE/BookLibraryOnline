import * as pdfjsLib from 'pdfjs-dist';

// Configure pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export const initPDFWorker = () => {
  // Worker is already configured
  return pdfjsLib.GlobalWorkerOptions.workerSrc;
}; 