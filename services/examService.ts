import { GoogleGenAI, Type } from "@google/genai";
import { 
  ExamRequest, 
  ExamResponse, 
  ExamQuestion, 
  VietProblemType, 
  DifficultyLevel,
  ProcessedQuestion
} from "../types";

// Mock Teacher Bank (In real app, this would be a database call)
const MOCK_TEACHER_BANK: ProcessedQuestion[] = [
  {
    id: "tb_1",
    raw_text: "...",
    cleaned_content: "Cho phương trình $x^2 - 5x + 6 = 0$. Tính tổng và tích hai nghiệm.",
    detected_equation: "x^2 - 5x + 6 = 0",
    sub_topic: VietProblemType.BASIC_SUM_PRODUCT,
    difficulty_score: 0.2,
    difficulty_level: 'EASY',
    has_parameter: false,
    is_multi_step: false,
    estimated_time_seconds: 120,
    is_valid_viet: true,
    status: 'PUBLISHED',
    created_at: Date.now(),
    source_file: "bank.pdf"
  },
  {
    id: "tb_2",
    raw_text: "...",
    cleaned_content: "Cho phương trình $x^2 - 2(m+1)x + m^2 = 0$. Tìm m để phương trình có hai nghiệm phân biệt.",
    detected_equation: "x^2 - 2(m+1)x + m^2 = 0",
    sub_topic: VietProblemType.FIND_M_CONDITION,
    difficulty_score: 0.6,
    difficulty_level: 'MEDIUM',
    has_parameter: true,
    is_multi_step: true,
    estimated_time_seconds: 300,
    is_valid_viet: true,
    status: 'PUBLISHED',
    created_at: Date.now(),
    source_file: "bank.pdf"
  }
];

class ExamService {
  private genAI: GoogleGenAI | null = null;
  private modelId: string = "gemini-2.5-flash-latest";

  constructor() {
    // Lazy initialization
  }

  private getGenAI(): GoogleGenAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        console.warn("Gemini API Key is missing!");
        // We can throw here or return a dummy if we want to fail gracefully later
        // But throwing here is better than crashing on load
        throw new Error("Gemini API Key is missing. Please set VITE_GEMINI_API_KEY.");
      }
      this.genAI = new GoogleGenAI({ apiKey });
    }
    return this.genAI;
  }

  /**
   * Main entry point to generate an exam.
   */
  async generateExam(request: ExamRequest): Promise<ExamResponse> {
    console.log("Generating exam for:", request);

    // Step 1: Query Teacher Bank
    const bankQuestions = this.queryTeacherBank(request);
    
    let finalQuestions: ExamQuestion[] = [];
    let source: "teacher_bank" | "ai_generated" | "mixed" = "teacher_bank";

    // Step 2: Check if sufficient
    if (bankQuestions.length >= request.questionCount) {
      // Use bank questions
      finalQuestions = bankQuestions.slice(0, request.questionCount).map(q => ({
        id: q.id,
        content: q.cleaned_content, // Assuming cleaned_content is close to LaTeX or raw text
        difficulty: q.difficulty_level,
        type: q.sub_topic as VietProblemType,
        isAiGenerated: false
      }));
    } else {
      // Step 3: Generate missing questions via AI
      const missingCount = request.questionCount - bankQuestions.length;
      source = bankQuestions.length > 0 ? "mixed" : "ai_generated";
      
      // Convert existing bank questions to ExamQuestion format
      const existing = bankQuestions.map(q => ({
        id: q.id,
        content: q.cleaned_content,
        difficulty: q.difficulty_level,
        type: q.sub_topic as VietProblemType,
        isAiGenerated: false
      }));

      // Generate new ones
      const generated = await this.generateAiQuestions(missingCount, request.difficultyLevel);
      
      finalQuestions = [...existing, ...generated];
    }

    // Step 4: Format to LaTeX Exam
    const latexExam = this.formatExamToLatex(finalQuestions, request.difficultyLevel);

    // Calculate stats
    const difficultyDist = {
      EASY: finalQuestions.filter(q => q.difficulty === 'EASY').length,
      MEDIUM: finalQuestions.filter(q => q.difficulty === 'MEDIUM').length,
      HARD: finalQuestions.filter(q => q.difficulty === 'HARD').length,
      EXPERT: finalQuestions.filter(q => q.difficulty === 'EXPERT').length,
    };

    return {
      source,
      difficulty_distribution: difficultyDist,
      latex_exam: latexExam,
      questions: finalQuestions,
      metadata: {
        number_of_questions: finalQuestions.length,
        difficulty_level: request.difficultyLevel,
        estimated_time_minutes: finalQuestions.length * 10 // Rough estimate
      }
    };
  }

  private queryTeacherBank(request: ExamRequest): ProcessedQuestion[] {
    // Mock filtering logic
    return MOCK_TEACHER_BANK.filter(q => {
      // Filter by subtopic if provided
      if (request.subTopics && request.subTopics.length > 0) {
        if (!request.subTopics.includes(q.sub_topic as VietProblemType)) return false;
      }
      // Filter by difficulty (loose match for now)
      // In real app, we might want a range
      return true; 
    });
  }

  private async generateAiQuestions(count: number, difficulty: DifficultyLevel): Promise<ExamQuestion[]> {
    const prompt = `
      Bạn là chuyên gia Toán học THCS (Lớp 9).
      Hãy tạo ${count} câu hỏi trắc nghiệm hoặc tự luận ngắn về chuyên đề "Hệ thức Vi-ét".
      
      Mức độ khó: ${difficulty}
      
      YÊU CẦU QUAN TRỌNG:
      1. Phương trình bậc hai phải có hệ số nguyên, đơn giản, không đánh đố tính toán.
      2. Đảm bảo phương trình CÓ NGHIỆM (Delta >= 0) nếu đề bài yêu cầu tính toán trên nghiệm.
      3. Nội dung bám sát SGK Toán 9.
      4. Định dạng đầu ra JSON.
      
      Cấu trúc JSON mong muốn cho mỗi câu hỏi:
      [
        {
          "content": "Nội dung câu hỏi dạng LaTeX (ví dụ: Cho phương trình $x^2 - 2x - 1 = 0$...)",
          "type": "Loại bài (Tính tổng tích / Tìm m / ...)",
          "difficulty": "${difficulty}"
        }
      ]
    `;

    try {
      const ai = this.getGenAI();
      const response = await ai.models.generateContent({
        model: this.modelId,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                type: { type: Type.STRING },
                difficulty: { type: Type.STRING }
              },
              required: ["content", "type", "difficulty"]
            }
          }
        }
      });

      if (!response.text) return [];
      
      const rawQuestions = JSON.parse(response.text);
      
      return rawQuestions.map((q: any, idx: number) => ({
        id: `ai_${Date.now()}_${idx}`,
        content: q.content,
        difficulty: q.difficulty as DifficultyLevel,
        type: q.type as VietProblemType, // AI might return loose string, cast carefully in real app
        isAiGenerated: true
      }));

    } catch (error) {
      console.error("AI Generation Error:", error);
      // Return fallback questions if AI fails
      return Array(count).fill(null).map((_, idx) => ({
        id: `fallback_${idx}`,
        content: "Cho phương trình $x^2 - 3x + 2 = 0$. Tính $x_1 + x_2$.",
        difficulty: 'EASY',
        type: VietProblemType.BASIC_SUM_PRODUCT,
        isAiGenerated: true
      }));
    }
  }

  private formatExamToLatex(questions: ExamQuestion[], level: DifficultyLevel): string {
    const date = new Date().toLocaleDateString('vi-VN');
    
    let latex = `
\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{vietnam}
\\usepackage{amsmath, amssymb}
\\usepackage{geometry}
\\geometry{top=2cm, bottom=2cm, left=2cm, right=2cm}

\\begin{document}

\\begin{center}
    \\textbf{\\large ĐỀ KIỂM TRA CHUYÊN ĐỀ HỆ THỨC VI-ÉT – LỚP 9} \\\\
    \\textit{Thời gian làm bài: ${questions.length * 10} phút} \\\\
    \\textit{Mức độ: ${level}}
\\end{center}

\\hrule
\\vspace{0.5cm}

`;

    // Group by difficulty roughly to simulate parts
    const easy = questions.filter(q => q.difficulty === 'EASY');
    const medium = questions.filter(q => q.difficulty === 'MEDIUM');
    const hard = questions.filter(q => q.difficulty === 'HARD' || q.difficulty === 'EXPERT');

    let questionNum = 1;

    if (easy.length > 0) {
      latex += `\\section*{Phần I: Cơ bản}\n`;
      easy.forEach(q => {
        latex += `\\textbf{Câu ${questionNum}:} ${this.normalizeContent(q.content)} \\\\ \n`;
        latex += `\\vspace{0.5cm}\n`;
        questionNum++;
      });
    }

    if (medium.length > 0) {
      latex += `\\section*{Phần II: Vận dụng}\n`;
      medium.forEach(q => {
        latex += `\\textbf{Câu ${questionNum}:} ${this.normalizeContent(q.content)} \\\\ \n`;
        latex += `\\vspace{1cm}\n`;
        questionNum++;
      });
    }

    if (hard.length > 0) {
      latex += `\\section*{Phần III: Nâng cao}\n`;
      hard.forEach(q => {
        latex += `\\textbf{Câu ${questionNum}:} ${this.normalizeContent(q.content)} \\\\ \n`;
        latex += `\\vspace{1.5cm}\n`;
        questionNum++;
      });
    }

    latex += `\n\\end{document}`;
    return latex;
  }

  private normalizeContent(content: string): string {
    // Basic normalization to ensure LaTeX math mode is correct
    // Replace raw x^2 with $x^2$ if missing, but be careful not to double wrap
    // For this prototype, assume content is mostly clean or AI generated clean LaTeX
    return content;
  }
}

export const examService = new ExamService();
