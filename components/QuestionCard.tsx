import React from 'react';
import { ProcessedQuestion } from '../types';

interface QuestionCardProps {
  question: ProcessedQuestion;
  index: number;
}

const QuestionCard: React.FC<QuestionCardProps> = ({ question, index }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-2">
          <span className="bg-primary-100 text-primary-700 text-xs font-semibold px-2.5 py-0.5 rounded">
            Câu {index + 1}
          </span>
          <span className="bg-neutral-100 text-neutral-600 text-xs px-2.5 py-0.5 rounded">
            {question.type}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-neutral-400">Độ khó:</span>
          <div className="w-20 h-2 bg-neutral-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                question.difficulty_score < 0.4 ? 'bg-green-400' : 
                question.difficulty_score < 0.7 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${question.difficulty_score * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-neutral-600 ml-1">
            {question.difficulty_score.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="text-xs font-bold text-neutral-400 uppercase mb-1">Nội dung đã xử lý (Cleaned)</h4>
        <div className="text-neutral-800 text-sm leading-relaxed font-medium whitespace-pre-wrap">
          {question.cleaned_content}
        </div>
      </div>

      {question.detected_equation && (
        <div className="bg-primary-50 p-3 rounded-md mb-4 border border-primary-100">
           <h4 className="text-xs font-bold text-primary-400 uppercase mb-1">Phương trình phát hiện</h4>
           <code className="text-primary-700 font-mono text-sm">
             {question.detected_equation}
           </code>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-neutral-100">
        <details className="group">
          <summary className="flex items-center text-xs text-neutral-400 cursor-pointer hover:text-primary-600 transition-colors list-none">
            <svg className="w-4 h-4 mr-1 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Xem văn bản thô (OCR Raw Text)
          </summary>
          <div className="mt-2 text-xs text-neutral-500 font-mono bg-neutral-50 p-2 rounded max-h-32 overflow-y-auto">
            {question.raw_text}
          </div>
        </details>
      </div>
    </div>
  );
};

export default QuestionCard;