export enum VietProblemType {
  BASIC_SUM_PRODUCT = "Tính tổng tích",
  FIND_M_CONDITION = "Tìm tham số m",
  SYMMETRIC_EXPRESSION = "Biểu thức đối xứng",
  ASYMMETRIC_EXPRESSION = "Biểu thức không đối xứng",
  INTEGER_SOLUTION = "Nghiệm nguyên",
  RELATION_INDEPENDENT_M = "Hệ thức độc lập m"
}

export interface ProcessedQuestion {
  id: string;
  raw_text: string;
  cleaned_content: string;
  detected_equation: string | null;
  difficulty_score: number; // 0.0 to 1.0
  type: VietProblemType | string;
  original_page?: number;
}

export interface ProcessingStatus {
  step: 'IDLE' | 'READING_PDF' | 'ANALYZING_AI' | 'COMPLETE' | 'ERROR';
  message: string;
  progress: number;
}

export interface UploadedFile {
  name: string;
  size: number;
  textParams: string[];
}