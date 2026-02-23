import React, { useCallback, useState } from 'react';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        onFileSelect(file);
      } else {
        alert("Vui lòng chỉ tải lên file PDF.");
      }
    }
  }, [onFileSelect, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative group cursor-pointer transition-all duration-300
        border-2 border-dashed rounded-3xl p-12 text-center
        ${isDragging 
          ? 'border-primary-300 bg-pastel-blue scale-[1.01]' 
          : 'border-neutral-200 bg-white hover:border-primary-200 hover:bg-neutral-50'}
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      <input
        type="file"
        accept="application/pdf"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleChange}
        disabled={disabled}
      />
      
      <div className="flex flex-col items-center justify-center space-y-5 pointer-events-none">
        <div className={`
          w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-300
          ${isDragging ? 'bg-white text-primary-600 shadow-sm' : 'bg-pastel-purple text-primary-500'}
        `}>
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-neutral-800 mb-1">
            Tải lên đề bài PDF
          </h3>
          <p className="text-sm text-neutral-400">
            Kéo thả hoặc click để chọn tài liệu
          </p>
        </div>
      </div>
    </div>
  );
};

export default UploadArea;