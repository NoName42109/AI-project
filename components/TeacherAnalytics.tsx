import React, { useEffect, useState } from 'react';
import { AnalyticsService } from '../services/analyticsService';
import { ClassAnalytics, GradingErrorType } from '../types';

const TeacherAnalytics: React.FC = () => {
  const [data, setData] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const result = await AnalyticsService.getClassAnalytics();
      setData(result);
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-neutral-500 text-sm">Đang tổng hợp dữ liệu lớp học...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* 1. KEY METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
           <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sĩ số lớp</p>
           <p className="text-3xl font-bold text-neutral-800 mt-2">{data.totalStudents} <span className="text-sm font-normal text-neutral-500">học sinh</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
           <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Trung bình Mastery</p>
           <div className="flex items-end gap-2 mt-2">
             <p className="text-3xl font-bold text-primary-600">{data.averageMastery}%</p>
             <span className="text-sm text-green-500 font-medium mb-1">↗ +2.4%</span>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
           <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Tổng câu đã giải</p>
           <p className="text-3xl font-bold text-neutral-800 mt-2">{data.questionsSolvedTotal}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-red-50 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-16 h-16 bg-red-100 rounded-bl-full opacity-50"></div>
           <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Lỗ hổng lớn nhất</p>
           <p className="text-lg font-bold text-red-600 mt-2 leading-tight">
             {data.weakestTopics[0]}
           </p>
           <p className="text-xs text-red-400 mt-1">Chỉ {data.topicPerformance.find(t => t.topic === data.weakestTopics[0])?.accuracy}% làm đúng</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. TOPIC PERFORMANCE CHART */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-neutral-100 shadow-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-neutral-800">Hiệu suất theo dạng bài</h3>
            <span className="text-xs bg-neutral-100 text-neutral-500 px-3 py-1 rounded-full">Accuracy (%)</span>
          </div>
          
          <div className="space-y-5">
            {data.topicPerformance.map((item) => (
              <div key={item.topic} className="group">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-neutral-700">{item.topic}</span>
                  <span className={`font-bold ${item.accuracy < 50 ? 'text-red-500' : 'text-neutral-600'}`}>
                    {item.accuracy}%
                  </span>
                </div>
                <div className="w-full bg-neutral-100 h-3 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      item.accuracy > 80 ? 'bg-teal-400' : 
                      item.accuracy > 60 ? 'bg-blue-400' : 
                      item.accuracy > 40 ? 'bg-orange-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${item.accuracy}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="text-[10px] text-neutral-400">Time: {Math.round(item.avgTimeSeconds)}s</span>
                   <span className="text-[10px] text-neutral-400">Diff: {item.difficultyRating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. INSIGHTS & BREAKDOWN */}
        <div className="space-y-6">
          
          {/* Difficulty Matrix */}
          <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-card">
             <h3 className="font-bold text-lg text-neutral-800 mb-4">Tỷ lệ đúng theo độ khó</h3>
             <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-teal-50 rounded-xl border border-teal-100">
                   <span className="text-xs text-teal-600 font-bold block mb-1">EASY</span>
                   <span className="text-2xl font-bold text-teal-800">{data.difficultyBreakdown.EASY}%</span>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                   <span className="text-xs text-blue-600 font-bold block mb-1">MEDIUM</span>
                   <span className="text-2xl font-bold text-blue-800">{data.difficultyBreakdown.MEDIUM}%</span>
                </div>
                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                   <span className="text-xs text-orange-600 font-bold block mb-1">HARD</span>
                   <span className="text-2xl font-bold text-orange-800">{data.difficultyBreakdown.HARD}%</span>
                </div>
                <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                   <span className="text-xs text-red-600 font-bold block mb-1">EXPERT</span>
                   <span className="text-2xl font-bold text-red-800">{data.difficultyBreakdown.EXPERT}%</span>
                </div>
             </div>
          </div>

          {/* Common Pitfalls */}
          <div className="bg-neutral-900 text-white p-6 rounded-3xl shadow-xl">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Lỗi thường gặp
            </h3>
            <ul className="space-y-4">
              {data.errorDistribution.map((err, idx) => (
                <li key={idx} className="flex items-center justify-between border-b border-neutral-800 pb-2 last:border-0 last:pb-0">
                  <span className="text-sm font-medium text-neutral-300">{err.type}</span>
                  <span className="text-sm font-bold text-white bg-white/10 px-2 py-0.5 rounded">{err.percentage}%</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-4 border-t border-neutral-800">
               <p className="text-xs text-neutral-400 leading-relaxed">
                 <strong className="text-white">Gợi ý giảng dạy:</strong> Học sinh thường quên điều kiện <em className="text-yellow-400">Delta {'>='} 0</em> trong các bài toán tìm tham số m. Hãy ôn tập lại kỹ phần này.
               </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TeacherAnalytics;