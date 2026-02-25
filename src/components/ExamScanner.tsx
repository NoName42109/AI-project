import React, { useState } from 'react';
import { scanExamWithLlama, ScanResult } from '../services/scannerService';

export const ExamScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<ScanResult | null>(null);

  const handleScan = async () => {
    if (!file) {
      setError('Vui lòng chọn file đề thi.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const scanData = await scanExamWithLlama(file);
      setResult(scanData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
      <h2 className="text-xl font-bold mb-4">Quét đề thi Vi-ét (Llama Cloud)</h2>
      
      <input 
        type="file" 
        accept=".pdf,image/*,.docx" 
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mb-4 block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary-50 file:text-primary-700"
      />

      <button 
        onClick={handleScan} 
        disabled={loading || !file}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Đang quét & chuẩn hóa LaTeX...' : 'Bắt đầu quét'}
      </button>

      {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg">{error}</div>}

      {result && (
        <div className="mt-6">
          <h3 className="font-bold text-green-600 mb-2">Quét thành công!</h3>
          <div className="space-y-4">
            {result.structured_questions.map((q, idx) => (
              <div key={idx} className="p-4 bg-neutral-50 border rounded-lg">
                <p className="font-mono text-sm mb-2 font-bold">Câu {idx + 1}: {q.content_latex}</p>
                {q.subQuestions.map((sub, sIdx) => (
                  <p key={sIdx} className="font-mono text-sm ml-4">
                    {sub.label}) {sub.content_latex}
                  </p>
                ))}
                {q.detectedDependencies && (
                  <span className="text-xs text-orange-600 mt-2 block">
                    * Phát hiện có điều kiện chung phụ thuộc
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
