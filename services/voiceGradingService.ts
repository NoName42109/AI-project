import { GoogleGenAI, Type } from "@google/genai";
import { VoiceSubmissionResult } from "../types";

class VoiceGradingService {
  private genAI: GoogleGenAI | null = null;
  private modelId: string = "gemini-2.5-flash-native-audio-preview-12-2025"; // Using the latest Flash model for speed and multimodal capabilities

  constructor() {
    // Lazy init
  }

  private getGenAI(): GoogleGenAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        console.warn("Gemini API Key is missing!");
        throw new Error("Gemini API Key is missing. Please check your environment variables.");
      }
      this.genAI = new GoogleGenAI({ apiKey });
    }
    return this.genAI;
  }

  /**
   * Converts a Blob to a Base64 string.
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
        const base64Data = result.split(",")[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Process audio submission through the 5-step pipeline.
   */
  async processAudioSubmission(audioBlob: Blob): Promise<VoiceSubmissionResult> {
    try {
      const ai = this.getGenAI();
      const base64Audio = await this.blobToBase64(audioBlob);
      const mimeType = audioBlob.type || "audio/wav";
      
      // Define the schema for the structured output
      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          raw_transcript: { type: Type.STRING, description: "BƯỚC 1: Văn bản tiếng Việt đầy đủ từ file ghi âm." },
          normalized_math_text: { type: Type.STRING, description: "BƯỚC 2: Biểu thức toán học đã chuẩn hóa." },
          structured_solution: { type: Type.STRING, description: "BƯỚC 3: Bài giải được tái cấu trúc theo barem chuẩn." },
          consistency_check: {
            type: Type.OBJECT,
            properties: {
              is_consistent: { type: Type.BOOLEAN },
              errors: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING } 
              }
            },
            required: ["is_consistent", "errors"],
            description: "BƯỚC 4: Kiểm tra tính đồng bộ dữ liệu."
          },
          latex_solution: { type: Type.STRING, description: "BƯỚC 5: Bài giải hoàn chỉnh định dạng LaTeX." },
          grading_summary: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER, description: "Điểm số từ 0-10" },
              error_type: { type: Type.STRING, description: "Loại lỗi chính (nếu có)" },
              feedback: { type: Type.STRING, description: "Nhận xét chi tiết" }
            },
            required: ["score", "error_type", "feedback"]
          }
        },
        required: [
          "raw_transcript", 
          "normalized_math_text", 
          "structured_solution", 
          "consistency_check", 
          "latex_solution", 
          "grading_summary"
        ]
      };

      const prompt = `
        Bạn là một AI chuyên chấm bài toán Hệ thức Vi-ét lớp 9 qua giọng nói.
        Hãy xử lý file âm thanh này theo quy trình 5 bước nghiêm ngặt sau:

        BƯỚC 1: Speech-to-Text
        - Chuyển đổi giọng nói thành văn bản tiếng Việt chính xác từng từ.
        - Không bỏ sót, không tự ý chỉnh sửa.

        BƯỚC 2: Chuẩn hóa Toán học
        - Chuyển các từ ngữ tự nhiên thành ký hiệu toán học:
          "bình phương" -> ^2, "lập phương" -> ^3, "âm" -> -, "căn delta" -> \\sqrt{\\Delta}, v.v.
        - Nhận diện a, b, c, delta, x1, x2.

        BƯỚC 3: Tái cấu trúc (Standardization)
        - Sắp xếp lại bài làm theo trình tự chuẩn SGK Toán 9:
          1. Xác định hệ số a, b, c.
          2. Tính Delta.
          3. Kết luận số nghiệm.
          4. Áp dụng Vi-ét (Tổng & Tích).
          5. Tính toán biểu thức yêu cầu.
          6. Kết luận.

        BƯỚC 4: Kiểm tra Logic (Consistency Check)
        - Kiểm tra tính đúng đắn của từng bước tính toán.
        - So sánh kết quả bước sau với bước trước.
        - Phát hiện lỗi: Sai tính toán, sai dấu, sai công thức, sai logic.

        BƯỚC 5: Xuất bản LaTeX & Chấm điểm
        - Trình bày lời giải đẹp bằng LaTeX.
        - Chấm điểm trên thang 10.
        - Đưa ra nhận xét mang tính xây dựng.

        LƯU Ý QUAN TRỌNG:
        - Chỉ xử lý nội dung liên quan đến Hệ thức Vi-ét lớp 9.
        - Nếu nội dung không liên quan, hãy trả về thông báo lỗi trong phần feedback.
      `;

      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Audio
                }
              },
              { text: prompt }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response from AI service");
      }

      return JSON.parse(resultText) as VoiceSubmissionResult;

    } catch (error) {
      console.error("Voice Grading Error:", error);
      throw error;
    }
  }
}

export const voiceGradingService = new VoiceGradingService();
