import React, { useState, useEffect } from 'react';
import { ExamResponse, ExamQuestion } from '../types';
import { examService } from '../services/examService';
import MathDisplay from './MathDisplay';

interface ExamViewProps {
  studentId: string;
  onBack: () => void;
}

const ExamView: React.FC<ExamViewProps> = ({ studentId, onBack }) => {
  const [exam, setExam] = useState<ExamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        // Request a new exam
        const response = await examService.generateExam({
          topic: "VIET",
          difficultyLevel: "MEDIUM", // Default for now
          questionCount: 5, // Reduced for demo
          studentId: studentId
        });
        setExam(response);
      } catch (err) {
        console.error("Failed to generate exam:", err);
        setError("Không thể tạo đề kiểm tra. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [studentId]);

  // Helper to parse text and render math
  const renderContentWithMath = (text: string) => {
    // Split by $...$ for inline math
    const parts = text.split(/(\$[^$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1);
        return <MathDisplay key={index} latex={latex} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-neutral-500 font-medium">Đang tạo đề kiểm tra...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 bg-neutral-50">
        <div className="text-red-500 text-xl font-bold">Lỗi</div>
        <p className="text-neutral-600">{error || "Không có dữ liệu đề thi."}</p>
        <button 
          onClick={onBack}
          className="px-6 py-2 bg-neutral-200 hover:bg-neutral-300 rounded-lg font-medium transition-colors"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const easyQuestions = exam.questions.filter(q => q.difficulty === 'EASY');
  const mediumQuestions = exam.questions.filter(q => q.difficulty === 'MEDIUM');
  const hardQuestions = exam.questions.filter(q => ['HARD', 'EXPERT'].includes(q.difficulty));

  let currentIndex = 1;

  // Helper to render questions by difficulty group
  const renderSection = (title: string, questions: ExamQuestion[], startIndex: number) => {
    if (questions.length === 0) return null;
    
    return (
      <div className="mb-12">
        <h3 className="text-lg font-bold text-primary-800 uppercase border-b-2 border-primary-100 pb-2 mb-6">
          {title}
        </h3>
        <div className="space-y-8">
          {questions.map((q, idx) => (
            <div key={q.id} className="relative pl-10">
              <span className="absolute left-0 top-0 w-8 h-8 bg-neutral-100 rounded-full flex items-center justify-center font-bold text-neutral-600 text-sm">
                {startIndex + idx}
              </span>
              <div className="text-neutral-800 text-lg leading-relaxed font-serif">
                {renderContentWithMath(q.content)}
              </div>
              <div className="mt-2 flex gap-2 opacity-50 hover:opacity-100 transition-opacity">
                <span className="text-[10px] uppercase font-bold text-neutral-400 border border-neutral-200 px-1 rounded">
                  {q.type}
                </span>
                {q.isAiGenerated && (
                  <span className="text-[10px] uppercase font-bold text-purple-400 border border-purple-200 px-1 rounded">
                    AI
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-neutral-50 animate-fade-in-up">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            <span className="font-medium text-sm">Thoát</span>
          </button>
          <div className="h-6 w-px bg-neutral-200"></div>
          <div>
             <h1 className="text-sm font-bold text-neutral-800 uppercase tracking-wide">ĐỀ KIỂM TRA HỆ THỨC VI-ÉT</h1>
             <div className="flex items-center gap-2 text-xs text-neutral-500">
               <span>Thời gian: {exam.metadata.estimated_time_minutes} phút</span>
               <span>•</span>
               <span>Số câu: {exam.metadata.number_of_questions}</span>
             </div>
          </div>
        </div>

        <button 
          className="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors shadow-md flex items-center gap-2"
          onClick={() => {
            const blob = new Blob([exam.latex_exam], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `De_Kiem_Tra_Viet_${Date.now()}.tex`;
            a.click();
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Tải LaTeX
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-card min-h-[800px]">
          
          {/* Exam Header on Paper */}
          <div className="text-center mb-12 border-b-2 border-neutral-100 pb-8">
            <h2 className="text-2xl font-bold text-neutral-900 mb-2 uppercase font-serif">ĐỀ KIỂM TRA CHUYÊN ĐỀ HỆ THỨC VI-ÉT – LỚP 9</h2>
            <p className="text-neutral-500 italic font-serif">Thời gian làm bài: {exam.metadata.estimated_time_minutes} phút</p>
          </div>

          {/* Sections */}
          {renderSection("Phần I: Cơ bản", easyQuestions, currentIndex)}
          {(() => { currentIndex += easyQuestions.length; return null; })()}

          {renderSection("Phần II: Vận dụng", mediumQuestions, currentIndex)}
          {(() => { currentIndex += mediumQuestions.length; return null; })()}

          {renderSection("Phần III: Nâng cao", hardQuestions, currentIndex)}

        </div>
      </div>
    </div>
  );
};

export default ExamView;
