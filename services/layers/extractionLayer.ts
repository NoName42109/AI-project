// services/layers/extractionLayer.ts

// Interface for global pdfjsLib
interface PDFSource {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPage>;
}
interface PDFPage {
  getTextContent: () => Promise<PDFTextContent>;
}
interface PDFTextContent {
  items: Array<{ str: string }>;
}
declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (data: Uint8Array) => { promise: Promise<PDFSource> };
      GlobalWorkerOptions: { workerSrc: string };
    };
  }
}

export interface PageContent {
  pageIndex: number; // 1-based index
  text: string;
}

/**
 * LAYER 2: Text Extraction
 * Responsibilities:
 * - Extract text per page
 * - Remove Header/Footers (Page numbers) per page
 */
export const extractionLayer = {
  /**
   * Extract text from PDF page by page
   */
  process: async (file: File): Promise<PageContent[]> => {
    try {
      const rawPages = await extractPdfPages(file);
      // Normalize each page immediately
      return rawPages.map(p => ({
        pageIndex: p.pageIndex,
        text: normalizeText(p.text)
      }));
    } catch (error) {
      console.error("[Extraction Layer] Failed:", error);
      throw new Error("Không thể đọc file PDF. Vui lòng kiểm tra định dạng hoặc thử file nhỏ hơn.");
    }
  }
};

const extractPdfPages = async (file: File): Promise<PageContent[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) throw new Error("Read error");
        
        const uint8Array = new Uint8Array(arrayBuffer);
        const loadingTask = window.pdfjsLib.getDocument(uint8Array);
        const pdf = await loadingTask.promise;
        
        const extractedPages: PageContent[] = [];
        
        // Extract all pages
        // Note: For extremely large PDFs (500+ pages), we might want to do this lazily, 
        // but for < 100 pages, extracting all strings to memory is safe.
        const promises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          promises.push(
            pdf.getPage(i).then(async page => {
              const content = await page.getTextContent();
              const text = content.items.map(item => item.str).join(' ');
              return { pageIndex: i, text };
            })
          );
        }
        
        const results = await Promise.all(promises);
        // Sort by page index to ensure order
        results.sort((a, b) => a.pageIndex - b.pageIndex);
        
        resolve(results);
      } catch (e) { reject(e); }
    };
    reader.readAsArrayBuffer(file);
  });
};

const normalizeText = (text: string): string => {
  // 1. Remove Page Numbers (e.g., "Trang 1", "Page 5", or just standalone numbers at start/end)
  let clean = text.replace(/(?:Trang|Page)\s*\d+|^\d+\s*$/gim, '');
  
  // 2. Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  
  // 3. Fix common math encoding errors
  clean = clean.replace(/−/g, '-'); // Fix minus sign
  
  return clean;
};