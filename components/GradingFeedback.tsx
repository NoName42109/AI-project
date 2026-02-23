import React from 'react';
import { GradingResult, GradingErrorType } from '../types';

interface GradingFeedbackProps {
  result: GradingResult;
  onNext: () => void;
  onRetry: () => void;
}

const GradingFeedback: React.FC<GradingFeedbackProps> = ({ result, onNext, onRetry }) => {
  const isPerfect = result.is_correct;
  
  // Determine styling based on error type
  const getTheme = () => {
    if (isPerfect) return {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800'
    };

    switch (result.error_type) {
      case GradingErrorType.CALCULATION_ERROR:
        return { bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', titleColor: 'text-orange-800' };
      case GradingErrorType.VIETA_ERROR:
      case GradingErrorType.DELTA_ERROR:
        return { bg: 'bg-red-50', border: 'border-red-200', iconBg: 'bg-red-100', iconColor: 'text-red-600', titleColor: 'text-red-800' };
      case GradingErrorType.EMPTY:
        return { bg: 'bg-neutral-50', border: 'border-neutral-200', iconBg: 'bg-neutral-200', iconColor: 'text-neutral-500', titleColor: 'text-neutral-700' };
      default:
        return { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', titleColor: 'text-blue-800' };
    }
  };

  const theme = getTheme();

  return (
    <div className={`rounded-2xl border p-6 animate-fade-in-up ${theme.bg} ${theme.border}`}>
      <div className="flex items-start gap-4">
        {/* Icon Status */}
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${theme.iconBg} ${theme.iconColor}`}>
          {isPerfect ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          ) : result.error_type === GradingErrorType.EMPTY ? (
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          )}
        </div>

        <div className="flex-1">
          <h3 className={`text-lg font-bold mb-1 ${theme.titleColor}`}>
            {isPerfect ? "Tuyệt vời! Chính xác." : "Chưa chính xác lắm..."}
          </h3>
          <p className="text-neutral-600 mb-4 font-medium">
            {result.feedback_short}
          </p>

          {/* Detailed Feedback (Markdown-like) */}
          <div className="bg-white/60 rounded-xl p-4 text-sm text-neutral-700 leading-relaxed whitespace-pre-line border border-black/5">
            {result.feedback_detailed}
          </div>

          {/* Reference Source Footnote */}
          {result.reference_source && (
             <div className="mt-3 flex items-center gap-2 text-xs text-neutral-500 opacity-80">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                <span className="font-serif italic">Nguồn tham chiếu: {result.reference_source}</span>
             </div>
          )}
          
          <div className="mt-6 flex gap-3">
             {isPerfect ? (
                <button 
                  onClick={onNext}
                  className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl shadow-sm transition-all transform hover:-translate-y-0.5"
                >
                  Bài tiếp theo →
                </button>
             ) : (
               <>
                 <button 
                   onClick={onRetry}
                   className="px-6 py-2.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-medium rounded-xl shadow-sm transition-all"
                 >
                   Thử lại
                 </button>
                 <button 
                   onClick={onNext}
                   className="px-6 py-2.5 text-neutral-500 hover:text-neutral-800 font-medium rounded-xl transition-all"
                 >
                   Bỏ qua
                 </button>
               </>
             )}
          </div>
        </div>

        {/* Score Badge */}
        <div className="flex flex-col items-center justify-center bg-white rounded-xl p-3 shadow-sm border border-neutral-100">
           <span className="text-xs text-neutral-400 font-bold uppercase">Điểm</span>
           <span className={`text-2xl font-bold ${isPerfect ? 'text-green-500' : 'text-neutral-800'}`}>
             {result.score}/10
           </span>
        </div>
      </div>
    </div>
  );
};

export default GradingFeedback;