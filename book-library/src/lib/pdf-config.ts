import * as pdfjsLib from 'pdfjs-dist';

// Get the exact version we're using
const PDFJS_VERSION = '4.8.69';

// Use local worker file with correct extension
export const PDFJS_WORKER_URL = '/pdfjs-dist/pdf.worker.min.mjs';

// Shared PDF options
export const PDF_OPTIONS = {
  workerSrc: PDFJS_WORKER_URL,
  disableWorker: false,
  disableRange: false,
  disableStream: false,
  disableAutoFetch: true,
  isEvalSupported: true,
  maxImageSize: 1024 * 1024 * 10,
};

// Canvas rendering options
export const CANVAS_OPTIONS = {
  scale: 1.5,
  quality: 1,
  background: '#FFFFFF',
}; 