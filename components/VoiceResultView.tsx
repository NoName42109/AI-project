import React from 'react';
import { VoiceSubmissionResult } from '../types';

interface VoiceResultViewProps {
  result: VoiceSubmissionResult;
  onRetry: () => void;
  onNext: () => void;
}

const VoiceResultView: React.FC<VoiceResultViewProps> = ({ result, onRetry, onNext }) => {
  const { 
    raw_transcript, 
    normalized_math_text, 
    structured_solution, 
    consistency_check, 
    latex_solution, 
    grading_summary 
  } = result;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-neutral-200 overflow-hidden animate-fade-in-up">
      {/* Header / Score */}
      <div className={`p-6 border-b border-neutral-100 flex items-center justify-between ${grading_summary.score >= 8 ? 'bg-green-50' : grading_summary.score >= 5 ? 'bg-yellow-50' : 'bg-red-50'}`}>
        <div>
          <h3 className="text-lg font-bold text-neutral-800">Kết quả chấm bài giọng nói</h3>
          <p className="text-sm text-neutral-500 mt-1">{grading_summary.feedback}</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Điểm số</span>
          <span className={`text-4xl font-bold ${grading_summary.score >= 8 ? 'text-green-600' : grading_summary.score >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
            {grading_summary.score}/10
          </span>
        </div>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Step 1: Transcript */}
        <section>
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">1</span>
            Nội dung ghi âm (Transcript)
          </h4>
          <div className="bg-neutral-50 p-4 rounded-xl text-neutral-700 text-sm italic border border-neutral-100">
            "{raw_transcript}"
          </div>
        </section>

        {/* Step 2: Normalized Math */}
        <section>
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">2</span>
            Chuẩn hóa toán học
          </h4>
          <div className="bg-blue-50 p-4 rounded-xl text-blue-800 font-mono text-sm border border-blue-100 overflow-x-auto">
            {normalized_math_text}
          </div>
        </section>

        {/* Step 3 & 5: Structured Solution (LaTeX) */}
        <section>
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500">3</span>
            Bài giải chi tiết (LaTeX)
          </h4>
          <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm">
             {/* Render LaTeX here. For now, just displaying the raw string or using a simple display if MathJax is not set up */}
             <div className="math-content text-neutral-800 leading-loose whitespace-pre-wrap font-serif text-lg">
                {latex_solution}
             </div>
          </div>
        </section>

        {/* Step 4: Consistency Check / Errors */}
        {!consistency_check.is_consistent && consistency_check.errors.length > 0 && (
          <section>
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center text-red-500">!</span>
              Phát hiện lỗi logic
            </h4>
            <ul className="space-y-2">
              {consistency_check.errors.map((err, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-red-700 bg-red-50 p-3 rounded-lg border border-red-100">
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {err}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-4 border-t border-neutral-100">
          <button 
            onClick={onRetry}
            className="px-6 py-2.5 rounded-xl font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            Làm lại
          </button>
          <button 
            onClick={onNext}
            className="px-6 py-2.5 rounded-xl font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-lg transition-transform active:scale-95"
          >
            Bài tiếp theo
          </button>
        </div>

      </div>
    </div>
  );
};

export default VoiceResultView;
