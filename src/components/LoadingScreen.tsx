import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  message?: string;
  isError?: boolean;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Đang tải dữ liệu...', 
  isError = false 
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Small delay to prevent flashing for very fast loads
    const timer = setTimeout(() => setShow(true), 150);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm transition-opacity duration-300">
      <div className="flex flex-col items-center animate-fade-in-up">
        {/* Logo/Icon Container */}
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center shadow-inner relative z-10">
            <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          {/* Animated rings */}
          {!isError && (
            <>
              <div className="absolute inset-0 rounded-2xl border-2 border-primary-200 animate-ping opacity-75"></div>
              <div className="absolute -inset-2 rounded-2xl border border-primary-100 animate-pulse"></div>
            </>
          )}
        </div>

        {/* Text Content */}
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-2">
          Vieta Master
        </h1>
        
        {isError ? (
          <div className="text-red-500 text-sm font-medium mt-2 bg-red-50 px-4 py-2 rounded-full">
            Đã có lỗi xảy ra. Vui lòng tải lại trang.
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <span className="text-sm text-neutral-500 ml-2 font-medium">{message}</span>
          </div>
        )}
      </div>
    </div>
  );
};
