import * as pdfjsLib from 'pdfjs-dist';
import './pdf-worker';

export interface PDFData {
  title: string;
  author: string;
  numPages: number;
  coverImageBlob: Blob;
  file: File;
  text: string;
  info: {
    Title?: string;
    Author?: string;
    [key: string]: any;
  };
}

export const CANVAS_OPTIONS = {
  viewportScale: 2.0,
  quality: 0.95,
  type: 'image/png',
  format: 'png'
} as const;

export async function extractPDFData(file: File): Promise<PDFData> {
  // Load the PDF document
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  // Get metadata
  const metadata = await pdf.getMetadata();
  const info = metadata.info as { Title?: string; Author?: string };
  
  // Extract text from the first few pages
  const maxPagesToRead = Math.min(5, pdf.numPages);
  let text = '';
  
  for (let i = 1; i <= maxPagesToRead; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    text += pageText + ' ';
  }

  // Get first page for cover
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: CANVAS_OPTIONS.viewportScale });
  
  // Create canvas and context
  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d') as any;
  
  if (!context) {
    throw new Error('Failed to get canvas context');
  }

  // Render page to canvas
  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  // Convert canvas to blob
  const blob = await canvas.convertToBlob({
    type: `image/${CANVAS_OPTIONS.format}`,
    quality: CANVAS_OPTIONS.quality
  });

  // Clean up the filename to get the title
  const cleanTitle = file.name
    .replace(/\.pdf$/i, '') // Remove .pdf extension
    .replace(/[_-]/g, ' ') // Replace underscores and hyphens with spaces
    .trim(); // Remove any leading/trailing spaces

  return {
    title: info.Title || cleanTitle,
    author: info.Author || 'Unknown',
    numPages: pdf.numPages,
    coverImageBlob: blob,
    file,
    text,
    info
  };
} 