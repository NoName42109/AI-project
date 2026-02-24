import { GoogleGenAI, Type } from "@google/genai";
import { 
  ExamRequest, 
  ExamResponse, 
  ExamQuestion, 
  VietProblemType, 
  DifficultyLevel,
  ProcessedQuestion,
  StudentExam
} from "../types";
import { questionBankService } from "./questionBankService";
import { collection, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";

class ExamService {
  private genAI: GoogleGenAI | null = null;
  private modelId: string = "gemini-3-flash-preview";

  constructor() {
    // Lazy initialization
  }

  private getGenAI(): GoogleGenAI {
    if (!this.genAI) {
      const apiKey = process.env.GEMINI_API_KEY || "";
      if (!apiKey) {
        console.warn("Gemini API Key is missing!");
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

    // Step 1: Determine structure based on duration (if provided) or question count
    // For now, assume request.questionCount is the target
    const targetCount = request.questionCount;
    
    // Simple distribution logic: 40% Easy, 40% Medium, 20% Hard
    const easyCount = Math.floor(targetCount * 0.4);
    const mediumCount = Math.floor(targetCount * 0.4);
    const hardCount = targetCount - easyCount - mediumCount;

    // Step 2: Fetch from Bank
    const [easyQ, mediumQ, hardQ] = await Promise.all([
      questionBankService.getQuestionsByDifficulty('EASY', easyCount),
      questionBankService.getQuestionsByDifficulty('MEDIUM', mediumCount),
      questionBankService.getQuestionsByDifficulty('HARD', hardCount),
    ]);

    let finalQuestions: ExamQuestion[] = [];
    let source: "teacher_bank" | "ai_generated" | "mixed" = "teacher_bank";

    // Step 3: Fill missing with AI
    const missingEasy = easyCount - easyQ.length;
    const missingMedium = mediumCount - mediumQ.length;
    const missingHard = hardCount - hardQ.length;

    if (missingEasy > 0 || missingMedium > 0 || missingHard > 0) {
      source = (easyQ.length + mediumQ.length + hardQ.length) > 0 ? "mixed" : "ai_generated";
      
      const generatedEasy = missingEasy > 0 ? await this.generateAiQuestions(missingEasy, 'EASY') : [];
      const generatedMedium = missingMedium > 0 ? await this.generateAiQuestions(missingMedium, 'MEDIUM') : [];
      const generatedHard = missingHard > 0 ? await this.generateAiQuestions(missingHard, 'HARD') : [];

      finalQuestions = [
        ...easyQ.map(this.mapToExamQuestion),
        ...generatedEasy,
        ...mediumQ.map(this.mapToExamQuestion),
        ...generatedMedium,
        ...hardQ.map(this.mapToExamQuestion),
        ...generatedHard
      ];
    } else {
      finalQuestions = [
        ...easyQ.map(this.mapToExamQuestion),
        ...mediumQ.map(this.mapToExamQuestion),
        ...hardQ.map(this.mapToExamQuestion)
      ];
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

  private mapToExamQuestion(q: any): ExamQuestion {
    return {
      id: q.id,
      content: q.content_latex || q.cleaned_content,
      difficulty: q.difficulty || q.difficulty_level,
      type: (q.sub_topic as VietProblemType) || VietProblemType.OTHER,
      isAiGenerated: false
    };
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
        difficulty: difficulty,
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

  /**
   * Create a mock exam session in Firestore
   */
  async startExamSession(studentId: string, duration: number): Promise<StudentExam> {
    const questionCount = duration === 15 ? 5 : duration === 30 ? 8 : 12;
    
    // Generate questions
    const examResponse = await this.generateExam({
      topic: "VIET",
      difficultyLevel: 'MEDIUM', // Default to medium for mixed exam
      questionCount: questionCount,
      studentId
    });

    const examData: Omit<StudentExam, "id"> = {
      studentId,
      config: {
        timeOption: duration,
        totalQuestions: questionCount
      },
      questions: examResponse.questions.map(q => ({
        id: q.id,
        content: q.content,
        difficulty: q.difficulty
      })),
      answers: {},
      startedAt: Date.now()
    };

    try {
      const docRef = await addDoc(collection(db, "exam_sessions"), examData);
      return { id: docRef.id, ...examData };
    } catch (error) {
      console.error("Error starting exam session:", error);
      throw error;
    }
  }

  /**
   * Submit exam results
   */
  async submitExamSession(examId: string, results: any): Promise<void> {
    try {
      const examRef = doc(db, "exam_sessions", examId);
      await updateDoc(examRef, {
        result: results,
        submittedAt: Date.now()
      });
    } catch (error) {
      console.error("Error submitting exam session:", error);
      throw error;
    }
  }
}

export const examService = new ExamService();
