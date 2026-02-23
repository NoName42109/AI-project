import { pdfVisualService } from "./pdfVisualService";
import { aiLayer } from "./layers/aiLayer";
import { ProcessedQuestion, ProcessingStatus, DetectedBlock } from "../types";

/**
 * VISUAL PIPELINE ORCHESTRATOR
 * Flow: Upload -> Render Pages -> Cluster Blocks -> Analyze Blocks -> Crop Images
 */
export const pipelineOrchestrator = {
  run: async (
    file: File, 
    onStatusUpdate: (status: ProcessingStatus) => void
  ): Promise<ProcessedQuestion[]> => {
    
    // --- STEP 1: LOAD PDF & RENDER ---
    onStatusUpdate({ step: 'RENDERING', message: 'Đang đọc và render tài liệu...', progress: 5 });
    
    // Helper to get PDF doc (Assuming window.pdfjsLib is available per index.html)
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = window.pdfjsLib.getDocument(new Uint8Array(arrayBuffer));
    const pdf = await loadingTask.promise;

    let allBlocks: DetectedBlock[] = [];

    // Process pages sequentially to save memory
    for (let i = 1; i <= pdf.numPages; i++) {
      onStatusUpdate({ 
        step: 'RENDERING', 
        message: `Đang xử lý hình ảnh trang ${i}/${pdf.numPages}...`, 
        progress: 5 + Math.round((i / pdf.numPages) * 20) 
      });

      const page = await pdf.getPage(i);
      const { imageBlob, blocks } = await pdfVisualService.processPage(page, i);
      allBlocks = [...allBlocks, ...blocks];
    }

    if (allBlocks.length === 0) throw new Error("Không tìm thấy nội dung văn bản trong PDF.");

    // --- STEP 2: AI ANALYSIS LOOP ---
    const processedResults: ProcessedQuestion[] = [];
    const totalBlocks = allBlocks.length;
    let processedCount = 0;
    let validCount = 0;
    let rejectedCount = 0;

    for (const block of allBlocks) {
      processedCount++;
      const currentProgress = 25 + Math.round((processedCount / totalBlocks) * 70); // 25% -> 95%

      onStatusUpdate({
        step: 'AI_ANALYZING',
        message: `Đang phân loại nội dung: ${processedCount}/${totalBlocks}`,
        progress: currentProgress,
        details: {
          processedBlocks: processedCount,
          totalBlocks: totalBlocks,
          validCount,
          rejectedCount
        }
      });

      // 1. Analyze
      const analysis = await aiLayer.analyzeBlock(block);

      // 2. If Valid, Crop Image
      if (analysis.is_valid_viet && block.pageImageRef) {
         try {
           const croppedUrl = await pdfVisualService.cropImage(block.pageImageRef, block.boundingBox);
           analysis.image_url = croppedUrl;
           validCount++;
         } catch (e) {
           console.warn("Cropping failed for block", block.id);
         }
      } else {
        rejectedCount++;
      }

      processedResults.push(analysis);
    }

    // --- STEP 3: FINALIZE ---
    onStatusUpdate({ 
      step: 'COMPLETE', 
      message: 'Hoàn tất xử lý!', 
      progress: 100,
      details: { processedBlocks: totalBlocks, totalBlocks, validCount, rejectedCount }
    });

    return processedResults;
  }
};