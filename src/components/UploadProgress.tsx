import React from 'react';
import { UploadStep } from '../services/uploadService';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';

interface UploadProgressProps {
  step: UploadStep;
  percent: number;
  error?: string;
}

const steps = [
  { id: 'uploading', label: 'Upload file' },
  { id: 'ocr', label: 'OCR document' },
  { id: 'normalize', label: 'Chuẩn hóa LaTeX' },
  { id: 'classifying', label: 'Phân loại dạng toán' },
  { id: 'saving', label: 'Lưu vào hệ thống' },
];

export const UploadProgress: React.FC<UploadProgressProps> = ({ step, percent, error }) => {
  const getStepStatus = (stepId: string) => {
    if (step === 'error') return 'error';
    if (step === 'done') return 'done';
    
    const currentIndex = steps.findIndex(s => s.id === step);
    const stepIndex = steps.findIndex(s => s.id === stepId);
    
    if (stepIndex < currentIndex) return 'done';
    if (stepIndex === currentIndex) return 'processing';
    return 'pending';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200 w-full">
      <h3 className="text-lg font-bold text-neutral-800 mb-6">Tiến trình xử lý AI</h3>
      
      <div className="space-y-4 mb-6">
        {steps.map((s) => {
          const status = getStepStatus(s.id);
          return (
            <div key={s.id} className="flex items-center gap-3">
              {status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {status === 'processing' && <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />}
              {status === 'pending' && <Circle className="w-5 h-5 text-neutral-300" />}
              {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
              
              <span className={`text-sm font-medium ${
                status === 'done' ? 'text-neutral-800' :
                status === 'processing' ? 'text-primary-700' :
                status === 'error' ? 'text-red-600' : 'text-neutral-400'
              }`}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full transition-all duration-300 ease-out ${step === 'error' ? 'bg-red-500' : 'bg-primary-500'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between mt-2">
        <span className="text-xs text-neutral-500 font-medium">{percent}%</span>
        {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
      </div>
    </div>
  );
};
