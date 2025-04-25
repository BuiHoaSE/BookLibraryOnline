declare module 'pdf2json' {
  interface PDFText {
    R: Array<{ T: string }>;
  }

  interface PDFPage {
    Texts: PDFText[];
  }

  interface PDFData {
    Pages: PDFPage[];
  }

  class PDFParser {
    constructor();
    on(event: 'pdfParser_dataReady', callback: (data: PDFData) => void): void;
    on(event: 'pdfParser_dataError', callback: (error: Error) => void): void;
    parseBuffer(buffer: Buffer): void;
  }

  export = PDFParser;
} 