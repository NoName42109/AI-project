import { VietProblemType, DifficultyLevel, QuestionStatus } from "../types";

/**
 * FIRESTORE SCHEMA ARCHITECTURE
 * Project: Vi-ét Adaptive Learning System
 * Scale Target: 100,000+ Questions
 */

// ==========================================
// 1. COLLECTION: documents
// Stores metadata of uploaded PDF files.
// ==========================================
export const COL_DOCUMENTS = "documents";

export interface DB_Document {
  id: string; // Auto-generated
  uploader_id: string; // Reference to Teacher Auth ID
  file_name: string;
  storage_path: string; // Firebase Storage path
  file_size_bytes: number;
  mime_type: string;
  
  // Processing Metrics
  total_pages: number;
  extracted_questions_count: number;
  
  // Status tracking
  processing_status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  error_log?: string;
  
  created_at: number; // Timestamp
  updated_at: number; // Timestamp
}

// ==========================================
// 2. COLLECTION: raw_questions (Temporary)
// Staging area for AI extraction results before validation.
// TTL: 7 days (set via Google Cloud Policy)
// ==========================================
export const COL_RAW_QUESTIONS = "raw_questions";

export interface DB_RawQuestion {
  id: string;
  source_document_id: string;
  raw_text_segment: string;
  ai_confidence_score: number;
  created_at: number;
}

// ==========================================
// 3. COLLECTION: questions (The Core)
// Unified collection for Classified, Approved, and Published questions.
// We use a 'status' field instead of moving docs between collections to preserve ID references.
// ==========================================
export const COL_QUESTIONS = "questions";

export interface DB_Question {
  id: string; // Auto-generated or consistent with Raw ID
  source_document_id: string;
  
  // Content
  content: string; // Raw text presented to student
  cleaned_content: string; // Normalized for analysis
  solution?: string; // Teacher or AI provided solution
  detected_equation: string; // e.g., "x^2 - 2mx + 4 = 0"
  
  // Classification (Indexed)
  main_topic: "VIET"; // Constant for this module
  sub_topic: VietProblemType; // INDEXED
  
  // Difficulty Metrics (Indexed)
  difficulty_score: number; // Float 0.0 - 1.0. INDEXED for range queries
  difficulty_level: DifficultyLevel;
  
  // Metadata Attributes (Useful for filtering)
  has_parameter: boolean;
  is_multi_step: boolean;
  estimated_time_seconds: number;
  
  // Review Status (Indexed)
  status: QuestionStatus; // INDEXED: 'PUBLISHED', 'DRAFT', etc.
  rejection_reason?: string;
  
  // Audit
  created_at: number;
  updated_at: number;
  published_at?: number;
  reviewer_id?: string;
}

// ==========================================
// 4. COLLECTION: student_attempts
// High-volume collection recording every answer.
// ==========================================
export const COL_STUDENT_ATTEMPTS = "student_attempts";

export interface DB_StudentAttempt {
  id: string;
  student_id: string; // INDEXED
  question_id: string; // Reference to COL_QUESTIONS
  
  // Performance
  is_correct: boolean;
  time_taken_seconds: number;
  
  // Snapshot (In case question difficulty changes later)
  snapshot_difficulty_score: number;
  snapshot_sub_topic: VietProblemType;
  
  timestamp: number; // INDEXED (Desc)
}

// ==========================================
// 5. COLLECTION: student_mastery
// Aggregated state for the Adaptive Engine.
// ID = student_id
// ==========================================
export const COL_STUDENT_MASTERY = "student_mastery";

export interface DB_StudentMastery {
  id: string; // Equals student_id
  last_active_at: number;
  current_streak_days: number;
  
  // Map of Topic -> Mastery Level (0.0 - 1.0)
  // This allows O(1) lookup for the Adaptive Engine
  topic_mastery: {
    [key in VietProblemType]?: {
      score: number; // 0 to 100
      total_solved: number;
      last_attempt_at: number;
    }
  };
  
  // Global stats
  total_questions_solved: number;
  strongest_topic?: VietProblemType;
  weakest_topic?: VietProblemType;
}


// ==========================================
// INDEXING STRATEGY (firestore.indexes.json)
// ==========================================

/*
  Composite Indexes required for Adaptive Querying:
  
  1. For finding the next suitable question:
     Collection: "questions"
     Fields: 
       - status: ASC
       - sub_topic: ASC
       - difficulty_score: ASC
       
  2. For finding recent attempts by student:
     Collection: "student_attempts"
     Fields:
       - student_id: ASC
       - timestamp: DESC
       
  3. For Teacher Dashboard filtering:
     Collection: "questions"
     Fields:
       - source_document_id: ASC
       - status: ASC
*/

/**
 * Helper to validate Question Schema before saving
 */
export const validateQuestionSchema = (data: Partial<DB_Question>): boolean => {
  if (!data.content || data.content.length < 5) return false;
  if (!data.sub_topic) return false;
  if (typeof data.difficulty_score !== 'number') return false;
  return true;
};
