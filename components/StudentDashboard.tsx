import React from 'react';
import { VietProblemType } from '../types';

interface StudentDashboardProps {
  onNavigate: (view: 'DASHBOARD' | 'PRACTICE') => void;
}

// Mock Data for Student Progress
const MOCK_DATA = {
  studentName: "Minh Anh",
  streakDays: 5,
  totalSolved: 128,
  mastery: [
    { type: VietProblemType.BASIC_SUM_PRODUCT, score: 95, color: 'bg-green-400', bg: 'bg-green-50' },
    { type: VietProblemType.FIND_M_CONDITION, score: 80, color: 'bg-blue-400', bg: 'bg-blue-50' },
    { type: VietProblemType.SYMMETRIC_EXPRESSION, score: 65, color: 'bg-indigo-400', bg: 'bg-indigo-50' },
    { type: VietProblemType.ASYMMETRIC_EXPRESSION, score: 40, color: 'bg-purple-400', bg: 'bg-purple-50' },
    { type: VietProblemType.INTEGER_SOLUTION, score: 30, color: 'bg-orange-400', bg: 'bg-orange-50' },
    { type: VietProblemType.RELATION_INDEPENDENT_M, score: 55, color: 'bg-teal-400', bg: 'bg-teal-50' },
  ],
  recentActivity: [
    { day: 'T2', score: 8, active: false },
    { day: 'T3', score: 12, active: true },
    { day: 'T4', score: 15, active: true },
    { day: 'T5', score: 10, active: true },
    { day: 'T6', score: 20, active: true },
    { day: 'T7', score: 25, active: true }, // Today
    { day: 'CN', score: 0, active: false },
  ]
};

const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  // Find strongest and weakest areas
  const sortedMastery = [...MOCK_DATA.mastery].sort((a, b) => b.score - a.score);
  const strength = sortedMastery[0];
  const weakness = sortedMastery[sortedMastery.length - 1];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto animate-fade-in-up font-sans text-neutral-800">
      
      {/* Welcome Header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">
            Chào {MOCK_DATA.studentName}, 👋
          </h2>
          <p className="text-neutral-500">
            Hôm nay là một ngày tuyệt vời để chinh phục Vi-ét!
          </p>
        </div>
        <div className="flex items-center gap-4 bg-white px-5 py-3 rounded-2xl shadow-card border border-neutral-100">
          <div className="flex flex-col items-center">
            <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Chuỗi</span>
            <span className="text-xl font-bold text-orange-500">🔥 {MOCK_DATA.streakDays} ngày</span>
          </div>
          <div className="w-px h-8 bg-neutral-200"></div>
          <div className="flex flex-col items-center">
             <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Đã giải</span>
             <span className="text-xl font-bold text-primary-600">{MOCK_DATA.totalSolved} bài</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Insights & Trends */}
        <div className="space-y-6 lg:col-span-2">
          
          {/* Main Action Card */}
          <div className="bg-neutral-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl group cursor-pointer" onClick={() => onNavigate('PRACTICE')}>
             <div className="absolute top-0 right-0 p-0 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-500">
                <svg className="w-64 h-64" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
             </div>
             <div className="relative z-10">
                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider backdrop-blur-sm">Luyện tập ngay</span>
                <h3 className="text-3xl font-bold mt-4 mb-2">Tiếp tục hành trình</h3>
                <p className="text-neutral-400 mb-6 max-w-sm">Hệ thống đã chuẩn bị bài tập phù hợp với trình độ hiện tại của bạn.</p>
                <button className="bg-white text-neutral-900 px-6 py-3 rounded-xl font-bold hover:bg-neutral-100 transition-colors flex items-center gap-2">
                   Bắt đầu luyện tập
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
             </div>
          </div>

          {/* Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strength Card */}
            <div className="bg-pastel-green/50 border border-green-100 p-6 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
               <div className="relative z-10">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 mb-4 shadow-sm">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 </div>
                 <h3 className="text-lg font-bold text-green-800 mb-1">Thế mạnh</h3>
                 <p className="text-green-900 font-medium text-xl mb-2">{strength.type}</p>
                 <p className="text-sm text-green-700">
                   Bạn đang làm rất tốt dạng này!
                 </p>
               </div>
            </div>

            {/* Improvement Card */}
            <div className="bg-pastel-purple/50 border border-indigo-100 p-6 rounded-3xl relative overflow-hidden group hover:shadow-soft transition-all">
               <div className="relative z-10">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                   <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 </div>
                 <h3 className="text-lg font-bold text-indigo-800 mb-1">Cần cải thiện</h3>
                 <p className="text-indigo-900 font-medium text-xl mb-2">{weakness.type}</p>
                 <p className="text-sm text-indigo-700">
                   Thử giải thêm vài bài về dạng này nhé!
                 </p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mastery List */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-card h-fit">
          <h3 className="text-lg font-bold text-neutral-800 mb-6">Chỉ số thành thạo</h3>
          <div className="space-y-6">
            {MOCK_DATA.mastery.map((item, idx) => (
              <div key={idx} className="group">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-neutral-600 group-hover:text-primary-600 transition-colors">
                    {item.type}
                  </span>
                  <span className="text-xs font-bold text-neutral-400 bg-neutral-50 px-2 py-1 rounded-md">
                    {item.score}%
                  </span>
                </div>
                <div className="h-2.5 w-full bg-neutral-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${item.color}`} 
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;