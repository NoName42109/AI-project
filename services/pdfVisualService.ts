import { DetectedBlock, BoundingBox } from "../types";

// Setup types for PDF.js
interface PDFPageViewport {
  width: number;
  height: number;
  scale: number;
  viewBox: number[];
}

interface TextItem {
  str: string;
  transform: number[]; // [scaleX, skewY, skewX, scaleY, tx, ty]
  width: number;
  height: number;
}

/**
 * PDF VISUAL SERVICE
 * Handles rendering PDF pages to images and extracting text with coordinates.
 */
export const pdfVisualService = {
  
  /**
   * Process a single page: Render to Canvas + Extract Text Blocks
   */
  processPage: async (
    page: any, 
    pageIndex: number, 
    scale = 2.0
  ): Promise<{ imageBlob: string, blocks: DetectedBlock[] }> => {
    
    // 1. Render Page to High-Res Canvas
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({ canvasContext: context, viewport }).promise;
    const imageBlob = canvas.toDataURL('image/jpeg', 0.8);

    // 2. Extract Text Items with Coordinates
    const textContent = await page.getTextContent();
    const items: TextItem[] = textContent.items;

    // 3. Cluster Items into Logical Blocks (Questions)
    const blocks = clusterTextItems(items, viewport, pageIndex, imageBlob);

    return { imageBlob, blocks };
  },

  /**
   * Crop a specific region from a base64 page image
   */
  cropImage: async (base64Image: string, box: BoundingBox, scale = 2.0): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Add some padding
        const padding = 20;
        
        // Coordinates in the scaled image
        // Note: The box comes from PDF coordinates which might need scaling logic depending on how we extracted them.
        // But here, we assume box is already in the coordinate space of the base64Image (which is scaled by `scale`).
        
        const x = Math.max(0, box.x - padding);
        const y = Math.max(0, box.y - padding);
        const w = Math.min(img.width - x, box.width + (padding * 2));
        const h = Math.min(img.height - y, box.height + (padding * 2));

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = "#FFFFFF";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(base64Image); // Fallback
        }
      };
      img.src = base64Image;
    });
  }
};

/**
 * Heuristic Algorithm to Group Text Lines into Blocks (Questions)
 */
const clusterTextItems = (
  items: TextItem[], 
  viewport: PDFPageViewport, 
  pageIndex: number,
  pageImageRef: string
): DetectedBlock[] => {
  const blocks: DetectedBlock[] = [];
  let currentBlockItems: { str: string, x: number, y: number, w: number, h: number }[] = [];
  
  // PDF.js coordinates: (0,0) is bottom-left. Canvas: (0,0) is top-left.
  // We need to flip Y.
  const transformY = (y: number) => viewport.height - y;

  // Sort items by Y (top to bottom), then X (left to right)
  // Note: In PDF coords, higher Y is higher on page usually, but let's assume standard coord system mapping
  // Actually PDF.js `transform[5]` is usually from bottom-left. 
  // Let's rely on visual line grouping.
  
  const mappedItems = items.map(item => {
    // Transform PDF point to Viewport point
    // transform is [scaleX, skewY, skewX, scaleY, tx, ty]
    // We strictly care about tx, ty
    // But verify against viewport.transform
    
    // Simplified mapping based on scale
    // If PDF point is (tx, ty), Viewport pixel is roughly (tx * scale, (pdfHeight - ty) * scale)
    // But viewport.convertToViewportPoint handles this precisely
    const tx = item.transform[4];
    const ty = item.transform[5];
    
    // const [vx, vy] = viewport.convertToViewportPoint(tx, ty); 
    // PDF.js types are tricky in TS, doing manual calc based on standard behavior
    const vx = tx * (viewport.width / viewport.viewBox[2]); // approx
    const vy = viewport.height - (ty * (viewport.height / viewport.viewBox[3])); // flip Y

    return {
      str: item.str,
      x: vx,
      y: vy,
      w: item.width * (viewport.width / viewport.viewBox[2]),
      h: item.height || 20 // fallback height
    };
  });

  // Sort top-down
  mappedItems.sort((a, b) => a.y - b.y);

  // Grouping Logic
  const SEPARATION_THRESHOLD = 60; // pixel gap to consider new block
  const QUESTION_REGEX = /^(Câu|Bài)\s+\d+/i;

  mappedItems.forEach((item, index) => {
    const isNewQuestion = QUESTION_REGEX.test(item.str);
    const prevItem = mappedItems[index - 1];
    
    // Check if we should start a new block
    let shouldBreak = false;
    
    if (index === 0) shouldBreak = true;
    else if (isNewQuestion) shouldBreak = true;
    else if (prevItem && (item.y - prevItem.y > SEPARATION_THRESHOLD)) shouldBreak = true;

    if (shouldBreak) {
      // Save previous block
      if (currentBlockItems.length > 0) {
        blocks.push(createBlockFromItems(currentBlockItems, pageIndex, pageImageRef));
      }
      currentBlockItems = [item];
    } else {
      currentBlockItems.push(item);
    }
  });

  // Push last block
  if (currentBlockItems.length > 0) {
    blocks.push(createBlockFromItems(currentBlockItems, pageIndex, pageImageRef));
  }

  return blocks;
};

const createBlockFromItems = (
  items: { str: string, x: number, y: number, w: number, h: number }[],
  pageIndex: number,
  pageImageRef: string
): DetectedBlock => {
  const text = items.map(i => i.str).join(' ').trim();
  
  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  items.forEach(i => {
    minX = Math.min(minX, i.x);
    minY = Math.min(minY, i.y - i.h); // i.y is usually baseline
    maxX = Math.max(maxX, i.x + i.w);
    maxY = Math.max(maxY, i.y);
  });

  return {
    id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    pageIndex,
    pageImageRef,
    boundingBox: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      page: pageIndex
    }
  };
};