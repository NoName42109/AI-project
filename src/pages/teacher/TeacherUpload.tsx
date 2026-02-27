import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { uploadService, UploadStep, ScanResult } from '../../services/uploadService';
import { UploadProgress } from '../../components/UploadProgress';

export const TeacherUpload: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>('idle');
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleStartScan = async () => {
    if (!file || !user) return;
    
    setStep('uploading');
    setPercent(0);
    setError('');
    setResult(null);

    try {
      const scanResult = await uploadService.handleUpload(file, user.uid, (newStep, newPercent) => {
        setStep(newStep);
        setPercent(newPercent);
      });
      
      setResult(scanResult);
      
      if (scanResult.isViet) {
        // Auto redirect after 2 seconds
        setTimeout(() => {
          navigate('/teacher/dashboard');
        }, 2000);
      }
    } catch (err: any) {
      setStep('error');
      setError(err.message || 'Có lỗi xảy ra trong quá trình xử lý.');
    }
  };

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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-neutral-200">
          <h2 className="text-xl font-bold mb-4">Chọn file đề thi</h2>
          <input 
            type="file" 
            accept=".pdf,image/*,.docx" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mb-6 block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700"
            disabled={step !== 'idle' && step !== 'error' && step !== 'done'}
          />

          <button 
            onClick={handleStartScan} 
            disabled={!file || (step !== 'idle' && step !== 'error' && step !== 'done')}
            className="w-full bg-primary-600 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 hover:bg-primary-700 transition-colors"
          >
            Bắt đầu quét AI
          </button>
        </div>

        {/* Progress & Result */}
        <div>
          {step !== 'idle' && (
            <UploadProgress step={step} percent={percent} error={error} />
          )}
          
          {step === 'done' && result && (
            <div className={`mt-6 p-4 rounded-xl border ${result.isViet ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
              <h3 className={`font-bold ${result.isViet ? 'text-green-800' : 'text-orange-800'}`}>
                {result.isViet ? '✅ Đã lưu thành công!' : '⚠️ Không phải chuyên đề Vi-ét'}
              </h3>
              <p className="text-sm mt-2 text-neutral-700">
                {result.isViet 
                  ? `Phát hiện ${result.questionCount} câu hỏi Vi-ét. Đang chuyển hướng về Dashboard...` 
                  : 'Tài liệu này không chứa câu hỏi về Hệ thức Vi-ét nên không được lưu vào hệ thống.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
