// Interface for the global pdfjsLib
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

export const extractTextFromPdf = async (file: File): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target?.result;
        if (!arrayBuffer || !(arrayBuffer instanceof ArrayBuffer)) {
          throw new Error("Failed to read file");
        }

        const uint8Array = new Uint8Array(arrayBuffer);
        const loadingTask = window.pdfjsLib.getDocument(uint8Array);
        const pdf = await loadingTask.promise;

        const pageTextPromises: Promise<string>[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          pageTextPromises.push(
            pdf.getPage(i).then(async (page) => {
              const textContent = await page.getTextContent();
              // Join items with space, but attempt to preserve some structure
              return textContent.items.map((item) => item.str).join(' ');
            })
          );
        }

        const pageTexts = await Promise.all(pageTextPromises);
        resolve(pageTexts);
      } catch (error) {
        console.error("PDF Extraction Error:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};