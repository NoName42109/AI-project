import React from 'react';
import { ProcessedQuestion } from '../types';

interface TeacherStatsProps {
  questions: ProcessedQuestion[];
}

const TeacherStats: React.FC<TeacherStatsProps> = ({ questions }) => {
  const total = questions.length;
  if (total === 0) return null;

  // Calculate Difficulty Distribution
  const difficultyCounts = {
    EASY: questions.filter(q => q.difficulty_level === 'EASY').length,
    MEDIUM: questions.filter(q => q.difficulty_level === 'MEDIUM').length,
    HARD: questions.filter(q => q.difficulty_level === 'HARD').length,
    EXPERT: questions.filter(q => q.difficulty_level === 'EXPERT').length,
  };

  const validCount = questions.filter(q => q.is_valid_viet).length;
  const invalidCount = total - validCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      {/* Summary Block */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-between">
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Tổng quan</span>
        <div className="mt-2">
          <div className="text-3xl font-bold text-neutral-800">{total} <span className="text-sm font-normal text-neutral-500">câu hỏi</span></div>
          <div className="flex gap-3 mt-1 text-xs">
             <span className="text-green-600 font-medium">{validCount} hợp lệ</span>
             <span className="text-red-500 font-medium">{invalidCount} cần kiểm tra</span>
          </div>
        </div>
      </div>

      {/* Difficulty Distribution Bar */}
      <div className="md:col-span-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col justify-center">
        <div className="flex justify-between items-end mb-2">
           <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Phân bố độ khó</span>
        </div>
        
        <div className="flex h-4 w-full rounded-full overflow-hidden bg-neutral-100">
          <div style={{ width: `${(difficultyCounts.EASY / total) * 100}%` }} className="bg-teal-400 h-full" title={`Easy: ${difficultyCounts.EASY}`}></div>
          <div style={{ width: `${(difficultyCounts.MEDIUM / total) * 100}%` }} className="bg-blue-400 h-full" title={`Medium: ${difficultyCounts.MEDIUM}`}></div>
          <div style={{ width: `${(difficultyCounts.HARD / total) * 100}%` }} className="bg-orange-400 h-full" title={`Hard: ${difficultyCounts.HARD}`}></div>
          <div style={{ width: `${(difficultyCounts.EXPERT / total) * 100}%` }} className="bg-red-400 h-full" title={`Expert: ${difficultyCounts.EXPERT}`}></div>
        </div>

        <div className="flex justify-between mt-2 text-xs text-neutral-500 font-medium">
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-teal-400"></div> Easy ({difficultyCounts.EASY})</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Medium ({difficultyCounts.MEDIUM})</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Hard ({difficultyCounts.HARD})</div>
           <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Expert ({difficultyCounts.EXPERT})</div>
        </div>
      </div>
    </div>
  );
};

export default TeacherStats;