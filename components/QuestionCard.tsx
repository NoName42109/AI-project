import React from 'react';
import { ProcessedQuestion } from '../types';

interface QuestionCardProps {
  question: ProcessedQuestion;
  index: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, index }) => {
  const isInvalid = !question.is_valid_viet;

  // Modern pill colors for difficulty
  const getDifficultyBadge = (level: string) => {
    switch (level) {
      case 'EASY': return 'bg-pastel-green text-teal-700';
      case 'MEDIUM': return 'bg-pastel-blue text-primary-700';
      case 'HARD': return 'bg-orange-50 text-orange-700';
      case 'EXPERT': return 'bg-red-50 text-red-700';
      default: return 'bg-neutral-100 text-neutral-600';
    }
  };

  return (
    <div className={`
      group relative rounded-2xl p-7 transition-all duration-300
      ${isInvalid 
        ? 'bg-neutral-50 border border-neutral-100 opacity-60 grayscale' 
        : 'bg-white shadow-card hover:shadow-soft border border-transparent hover:border-pastel-purple'}
    `}>
      
      {/* Top Meta Row */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pastel-beige text-neutral-700 text-sm font-bold font-serif">
            {index + 1}
          </div>
          
          {!isInvalid && (
            <div className="flex flex-col">
               <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                 {question.sub_topic}
               </span>
            </div>
          )}
        </div>

        {!isInvalid ? (
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${getDifficultyBadge(question.difficulty_level)}`}>
              {question.difficulty_level}
            </span>
          </div>
        ) : (
          <span className="text-xs font-bold text-red-400 bg-red-50 px-2 py-1 rounded">Invalid</span>
        )}
      </div>

      {/* Main Question Content - Serif Font for Math feel */}
      <div className="mb-6 pl-11">
         <div className="math-content text-neutral-800 text-base leading-relaxed whitespace-pre-wrap">
            {question.cleaned_content}
         </div>
      </div>

      {/* Detected Equation (if any) */}
      {question.detected_equation && !isInvalid && (
        <div className="pl-11 mb-6">
           <div className="inline-block bg-pastel-blue px-4 py-2 rounded-xl">
             <code className="text-primary-700 font-serif text-sm font-bold">
               {question.detected_equation}
             </code>
           </div>
        </div>
      )}

      {/* Bottom Info & Tags */}
      <div className="pl-11 flex flex-wrap items-center gap-3">
        {question.has_parameter && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-100">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
             <span className="text-xs font-medium text-neutral-600">Tham số m</span>
          </div>
        )}
        
        {question.is_multi_step && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-50 border border-neutral-100">
             <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
             <span className="text-xs font-medium text-neutral-600">Đa bước</span>
          </div>
        )}

        {question.estimated_time_seconds > 0 && (
           <span className="text-xs text-neutral-400 ml-auto flex items-center gap-1">
             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
             </svg>
             {Math.round(question.estimated_time_seconds / 60)} phút
           </span>
        )}
      </div>

      {/* Rejection Reason (only if valid=false) */}
      {question.rejection_reason && (
        <div className="mt-4 pl-11">
           <p className="text-xs text-red-500 italic">Reason: {question.rejection_reason}</p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;