import { GoogleGenAI, Type } from "@google/genai";
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { mathOcrService } from './mathOcrService';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

// Helper to generate a simple hash (MD5 equivalent for client-side cache)
async function generateHash(message: string) {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Split processing service to optimize token usage between Llama Cloud and Gemini.
 * 1. Llama Cloud: OCR -> LaTeX (No logic analysis, just extraction)
 * 2. Local Preprocessing: Split into questions using Regex (0 tokens)
 * 3. Cache Check: Check if question was already analyzed (0 tokens)
 * 4. Gemini: Only analyze the specific question to determine math type and Vi-ét (Minimal tokens)
 */
export const splitProcessingService = {
  
  // Local rule-based splitting (0 tokens)
  splitIntoQuestions(latexDocument: string): string[] {
    // Basic regex to split by "Câu 1:", "Bài 1:", "Câu 1.", etc.
    const questionRegex = /(?:Câu|Bài)\s*\d+[\.:\)]/gi;
    
    const parts = latexDocument.split(questionRegex);
    const matches = latexDocument.match(questionRegex) || [];
    
    if (matches.length === 0) {
      // If no clear questions found, return the whole document as one question
      // or split by paragraphs. For now, return as one.
      return [latexDocument.trim()];
    }

    const questions: string[] = [];
    // parts[0] is usually the intro text before the first question
    for (let i = 0; i < matches.length; i++) {
      const qText = matches[i] + (parts[i + 1] || "");
      if (qText.trim()) {
        questions.push(qText.trim());
      }
    }
    
    return questions;
  },

  async analyzeQuestionWithGemini(questionText: string) {
    const prompt = `
      Phân tích câu hỏi toán lớp 9 sau:
      "${questionText}"
      
      Bước 1: Xác định dạng toán (chọn 1 trong các dạng: "giai_pt_bac_hai", "tham_so_m", "tong_tich_nghiem", "lap_pt", "he_pt", "khac").
      Bước 2: Dựa vào dạng toán và nội dung, xác định xem câu hỏi này có sử dụng Hệ thức Vi-ét hay không? (true/false).
      Bước 3: Đánh giá độ khó từ 0.0 đến 1.0.
      
      Trả về kết quả dưới dạng JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: {
              type: Type.STRING,
              description: "Dạng toán: giai_pt_bac_hai, tham_so_m, tong_tich_nghiem, lap_pt, he_pt, khac"
            },
            is_viet: {
              type: Type.BOOLEAN,
              description: "Có sử dụng hệ thức Vi-ét không"
            },
            difficulty: {
              type: Type.NUMBER,
              description: "Độ khó từ 0.0 đến 1.0"
            }
          },
          required: ["type", "is_viet", "difficulty"]
        }
      }
    });

    try {
      return JSON.parse(response.text || "{}");
    } catch (e) {
      console.error("Failed to parse Gemini response", e);
      return { type: "khac", is_viet: false, difficulty: 0.5 };
    }
  },

  async processUploadedExam(file: File, teacherId: string) {
    console.log("1. Starting Llama Cloud OCR...");
    // 1. Llama Cloud OCR (Extraction only)
    const ocrResult = await mathOcrService.scanDocument(file);
    
    console.log("2. Splitting document into questions locally...");
    // 2. Local Preprocessing (0 tokens)
    const rawQuestions = this.splitIntoQuestions(ocrResult.full_latex_document);
    
    const processedQuestions = [];
    let tokenSavedCount = 0;

    console.log(`Found ${rawQuestions.length} questions. Starting analysis...`);
    
    for (const qText of rawQuestions) {
      // 3. Generate Hash for Cache
      const qHash = await generateHash(qText);
      
      try {
        // Check Firestore Cache
        const cacheRef = doc(db, 'question_cache', qHash);
        const cachedDoc = await getDoc(cacheRef);
        
        if (cachedDoc.exists()) {
          console.log(`Cache HIT for question: ${qHash.substring(0, 8)}...`);
          tokenSavedCount++;
          processedQuestions.push({
            rawText: qText,
            hash: qHash,
            ...cachedDoc.data()
          });
        } else {
          console.log(`Cache MISS for question: ${qHash.substring(0, 8)}... Calling Gemini.`);
          // 4. Call Gemini ONLY for this specific question
          const aiResult = await this.analyzeQuestionWithGemini(qText);
          
          const questionData = {
            rawText: qText,
            hash: qHash,
            type: aiResult.type,
            isViet: aiResult.is_viet,
            difficultyScore: aiResult.difficulty
          };
          
          // Save to cache for future use
          await setDoc(cacheRef, {
            type: aiResult.type,
            isViet: aiResult.is_viet,
            difficultyScore: aiResult.difficulty
          });
          
          processedQuestions.push(questionData);
        }
      } catch (error) {
        console.error("Error processing question:", error);
        // Fallback if DB/AI fails
        processedQuestions.push({
          rawText: qText,
          hash: qHash,
          type: "khac",
          isViet: false,
          difficultyScore: 0.5
        });
      }
    }

    console.log(`Processing complete. Saved tokens for ${tokenSavedCount}/${rawQuestions.length} questions using cache.`);

    return {
      fullDocument: ocrResult.full_latex_document,
      questions: processedQuestions,
      stats: {
        total: rawQuestions.length,
        vietCount: processedQuestions.filter(q => q.isViet).length,
        cacheHits: tokenSavedCount
      }
    };
  }
};
