import React from 'react';
import { MathOcrScanner } from '../../components/MathOcrScanner';
import { useNavigate } from 'react-router-dom';

export const TeacherUpload: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => navigate('/teacher/dashboard')}
          className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
        >
          <svg className="w-6 h-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <h1 className="text-3xl font-bold text-neutral-900">Upload Đề Mới</h1>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        <MathOcrScanner />
      </div>
    </div>
  );
};
