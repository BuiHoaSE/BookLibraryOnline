declare module 'pdf-parse' {
  interface PDFData {
    text: string;
    numpages: number;
    info: any;
  }

  interface PDFOptions {
    max?: number;
    version?: string;
    pagerender?: (pageData: any) => Promise<string> | string;
  }
  
  function parse(buffer: Buffer, options?: PDFOptions): Promise<PDFData>;
  export = parse;
}

declare module 'pdf-parse/lib/pdf-parse.js' {
  import parse = require('pdf-parse');
  export = parse;
} 