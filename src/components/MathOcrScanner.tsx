import React, { useState } from 'react';
import { mathOcrService, MathOcrResult } from '../services/mathOcrService';

export const MathOcrScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<MathOcrResult | null>(null);

  const handleScan = async () => {
    if (!file) {
      setError('Vui lòng chọn file đề thi.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const scanData = await mathOcrService.scanDocument(file);
      setResult(scanData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200">
      <h2 className="text-xl font-bold mb-4">Quét đề thi Vi-ét (Mathpix-like OCR)</h2>
      
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
          <div className="flex items-center gap-3 mb-4">
            <h3 className="font-bold text-green-600">Quét thành công!</h3>
            {result.needs_review && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                Cần kiểm tra lại (Confidence thấp hoặc lỗi ngoặc)
              </span>
            )}
            {!result.syntax_valid && (
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                Lỗi cú pháp LaTeX
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-neutral-50 border rounded-lg">
              <h4 className="font-bold text-sm text-neutral-700 mb-2">Full LaTeX Document:</h4>
              <p className="font-mono text-xs whitespace-pre-wrap text-neutral-600">
                {result.full_latex_document}
              </p>
            </div>

            {result.math_regions.length > 0 && (
              <div className="p-4 bg-neutral-50 border rounded-lg">
                <h4 className="font-bold text-sm text-neutral-700 mb-2">Math Regions Detected:</h4>
                <ul className="space-y-2">
                  {result.math_regions.map((region, idx) => (
                    <li key={idx} className="font-mono text-xs flex justify-between items-center bg-white p-2 border rounded">
                      <span className="truncate mr-4">{region.latex}</span>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${region.confidence < 0.9 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {Math.round(region.confidence * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
