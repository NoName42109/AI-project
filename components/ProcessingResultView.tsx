import React from 'react';
import { ProcessedQuestion } from '../types';

interface ProcessingResultViewProps {
  questions: ProcessedQuestion[];
}

const ProcessingResultView: React.FC<ProcessingResultViewProps> = ({ questions }) => {
  const validQuestions = questions.filter(q => q.is_valid_viet);
  const rejectedQuestions = questions.filter(q => !q.is_valid_viet);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[600px] mt-8">
      
      {/* LEFT COLUMN: REJECTED (Gray/Subtle) */}
      <div className="w-full lg:w-1/3 flex flex-col bg-neutral-100 rounded-2xl border border-neutral-200 overflow-hidden">
        <div className="p-4 border-b border-neutral-200 bg-neutral-200/50 flex justify-between items-center">
          <h3 className="font-bold text-neutral-600">Bị loại bỏ ({rejectedQuestions.length})</h3>
          <span className="text-[10px] text-neutral-500 uppercase tracking-wider">Non-Vieta Content</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {rejectedQuestions.length === 0 ? (
             <div className="text-center text-neutral-400 text-sm mt-10">Không có nội dung bị loại.</div>
          ) : (
            rejectedQuestions.map(q => (
              <div key={q.id} className="bg-white p-3 rounded-xl border border-neutral-200 opacity-70 hover:opacity-100 transition-opacity text-sm">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-neutral-100 text-neutral-500 text-[10px] font-bold rounded">
                    Trang {q.page_number}
                  </span>
                  <span className="text-red-500 text-xs font-semibold">
                    {q.rejection_reason}
                  </span>
                </div>
                <p className="text-neutral-600 line-clamp-3 font-mono text-xs">{q.raw_text}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: VALID (Visual/Cards) */}
      <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-2xl border border-primary-100 shadow-sm overflow-hidden">
         <div className="p-4 border-b border-neutral-100 bg-primary-50/30 flex justify-between items-center">
            <h3 className="font-bold text-primary-800">Đã nhận diện ({validQuestions.length})</h3>
            <span className="text-[10px] bg-primary-100 text-primary-700 px-2 py-1 rounded font-bold uppercase tracking-wider">Vi-ét Grade 9</span>
         </div>
         <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-6">
            {validQuestions.length === 0 ? (
               <div className="flex flex-col items-center justify-center text-neutral-400 h-full">
                 <p>Chưa tìm thấy câu hỏi phù hợp.</p>
               </div>
            ) : (
              validQuestions.map((q, idx) => (
                <div key={q.id} className="flex gap-4 p-4 rounded-2xl border border-neutral-100 shadow-card hover:shadow-md transition-shadow">
                   {/* Image Preview */}
                   <div className="w-1/3 shrink-0">
                      {q.image_url ? (
                        <div className="rounded-lg overflow-hidden border border-neutral-200 shadow-sm">
                           <img src={q.image_url} alt="Question Snapshot" className="w-full h-auto object-contain" />
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-neutral-100 rounded-lg flex items-center justify-center text-xs text-neutral-400">
                           No Image
                        </div>
                      )}
                   </div>
                   
                   {/* Info */}
                   <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                         <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                            {q.sub_topic}
                         </span>
                         <span className={`text-xs font-bold ${q.difficulty_level === 'HARD' ? 'text-orange-500' : 'text-teal-500'}`}>
                            {q.difficulty_level}
                         </span>
                      </div>
                      
                      {q.detected_equation && (
                        <div className="mb-3">
                           <code className="text-sm font-bold text-neutral-800 bg-neutral-100 px-2 py-1 rounded">
                             {q.detected_equation}
                           </code>
                        </div>
                      )}
                      
                      <div className="text-xs text-neutral-500 line-clamp-2 mb-2">
                        {q.cleaned_content}
                      </div>
                      
                      <div className="text-[10px] text-neutral-400 mt-auto">
                         Trang {q.page_number} • ID: {q.id.split('_')[1]}
                      </div>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>

    </div>
  );
};

export default ProcessingResultView;