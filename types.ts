export enum VietProblemType {
  BASIC_SUM_PRODUCT = "Tính tổng tích",
  FIND_M_CONDITION = "Tìm tham số m",
  SYMMETRIC_EXPRESSION = "Biểu thức đối xứng",
  ASYMMETRIC_EXPRESSION = "Biểu thức không đối xứng",
  INTEGER_SOLUTION = "Nghiệm nguyên",
  RELATION_INDEPENDENT_M = "Hệ thức độc lập m",
  OTHER = "Khác",
  INVALID = "Không phải Vi-ét"
}

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type QuestionStatus = 'DRAFT' | 'REVIEW_PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';

// Geometry for cropping
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  page: number;
}

// Block of content detected in PDF
export interface DetectedBlock {
  id: string;
  text: string;
  boundingBox: BoundingBox;
  pageIndex: number;
  pageImageRef?: string; // Reference to the full page blob URL (temporary)
}

// The final processed item
export interface ProcessedQuestion {
  id: string;
  source_document_id?: string;
  
  // Content
  raw_text: string;           // Original text
  cleaned_content: string;    // Cleaned text for indexing
  image_url?: string;         // NEW: Cropped image of the question
  
  // AI Analysis
  detected_equation: string | null;
  main_topic?: "VIET";
  sub_topic: VietProblemType | string;
  difficulty_score: number;
  difficulty_level: DifficultyLevel;
  
  // Metadata
  has_parameter: boolean;
  is_multi_step: boolean;
  estimated_time_seconds: number;
  
  // Validation
  is_valid_viet: boolean;
  rejection_reason?: string;  // e.g., "Không có phương trình bậc hai"
  
  // System
  status: QuestionStatus;
  created_at: number;
  source_file: string;
  page_number?: number;
}

export interface ProcessingStatus {
  step: 'IDLE' | 'UPLOADING' | 'RENDERING' | 'SEGMENTING' | 'AI_ANALYZING' | 'COMPLETE' | 'ERROR';
  message: string;
  progress: number;
  details?: {
    processedBlocks: number;
    totalBlocks: number;
    validCount: number;
    rejectedCount: number;
  };
}

// --- VOICE MATH TYPES ---
export interface VoiceMathResult {
  transcript: string;
  latex_expression: string; // The parsed math formula
  calculated_result: string | null; // The final number if calculated (e.g., "1")
  is_correct_syntax: boolean;
  feedback: string;
}

export interface ConsistencyCheck {
  is_consistent: boolean;
  errors: string[];
}

export interface VoiceSubmissionResult {
  raw_transcript: string;
  normalized_math_text: string;
  structured_solution: string;
  consistency_check: ConsistencyCheck;
  latex_solution: string;
  grading_summary: {
    score: number;
    error_type: string;
    feedback: string;
  };
}

// --- REST OF TYPES UNCHANGED ---
export interface PipelineContext {
  file: File;
  fileName: string;
  rawText: string;
  extractedQuestions: ProcessedQuestion[];
  validQuestions: ProcessedQuestion[];
  rejectedQuestions: ProcessedQuestion[];
}

export interface MasteryRecord {
  score: number;
  lastAttemptAt: number;
  totalSolved: number;
}

export interface StudentState {
  studentId: string;
  topicMastery: Record<string, MasteryRecord>; 
  recentAttempts: Array<{
    questionId: string;
    subTopic: string;
    isCorrect: boolean;
    difficultyScore: number;
    timestamp: number;
  }>;
}

export interface QuestionRecommendation {
  targetTopic: VietProblemType;
  minDifficulty: number;
  maxDifficulty: number;
  reason: string;
}

export enum GradingErrorType {
  NONE = "NONE",
  CALCULATION_ERROR = "Lỗi tính toán",
  DELTA_ERROR = "Sai Delta",
  VIETA_ERROR = "Sai hệ thức Vi-ét",
  CONDITION_ERROR = "Thiếu/Sai điều kiện",
  LOGIC_ERROR = "Lỗi logic",
  EMPTY = "Chưa làm bài"
}

export interface GradingResult {
  is_correct: boolean;
  error_type: GradingErrorType;
  score: number;
  feedback_short: string;
  feedback_detailed: string;
  reference_source?: string; // e.g. "Theo SGK Toán 9 Tập 2"
}

export interface TopicPerformance {
  topic: VietProblemType;
  accuracy: number;
  avgTimeSeconds: number;
  attemptCount: number;
  difficultyRating: number;
}

export interface ClassAnalytics {
  totalStudents: number;
  averageMastery: number;
  questionsSolvedTotal: number;
  topicPerformance: TopicPerformance[];
  errorDistribution: Array<{
    type: GradingErrorType;
    count: number;
    percentage: number;
  }>;
  difficultyBreakdown: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
    EXPERT: number;
  };
  weakestTopics: string[];
  commonPitfalls: string[];
}

// --- EXAM TYPES ---
export interface ExamRequest {
  topic: "VIET";
  subTopics?: VietProblemType[];
  difficultyLevel: DifficultyLevel;
  questionCount: number;
  studentId: string;
}

export interface ExamQuestion {
  id: string;
  content: string; // LaTeX formatted content
  difficulty: DifficultyLevel;
  type: VietProblemType;
  isAiGenerated: boolean;
}

export interface ExamResponse {
  source: "teacher_bank" | "ai_generated" | "mixed";
  difficulty_distribution: {
    EASY: number;
    MEDIUM: number;
    HARD: number;
    EXPERT: number;
  };
  latex_exam: string; // The full LaTeX document string
  questions: ExamQuestion[]; // Structured list for internal use if needed
  metadata: {
    number_of_questions: number;
    difficulty_level: DifficultyLevel;
    estimated_time_minutes: number;
  };
}