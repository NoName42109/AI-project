import React, { useState } from 'react';
import { mathOcrService, MathOcrResult, MathRegion } from '../services/mathOcrService';
import { datasetService } from '../services/datasetService';

export const MathOcrScanner: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<MathOcrResult | null>(null);

  // Active Learning State
  const [editingRegionIndex, setEditingRegionIndex] = useState<number | null>(null);
  const [editedLatex, setEditedLatex] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string>('');

  const handleScan = async () => {
    if (!file) {
      setError('Vui lòng chọn file đề thi.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSaveStatus('');

    try {
      const scanData = await mathOcrService.scanDocument(file);
      setResult(scanData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (index: number, currentLatex: string) => {
    setEditingRegionIndex(index);
    setEditedLatex(currentLatex);
    setSaveStatus('');
  };

  const handleSaveCorrection = async (region: MathRegion) => {
    if (!editedLatex.trim() || editedLatex === region.latex) {
      setEditingRegionIndex(null);
      return;
    }

    try {
      // Lưu vào Firestore (Active Learning Loop)
      await datasetService.saveHardCase({
        original_latex: region.latex,
        corrected_latex: editedLatex,
        confidence: region.confidence,
        math_type: 'unknown', // Có thể thêm dropdown để giáo viên chọn loại toán
        source: 'teacher_correction'
      });

      // Cập nhật UI
      if (result) {
        const updatedRegions = [...result.math_regions];
        updatedRegions[editingRegionIndex!] = { ...region, latex: editedLatex };
        setResult({ ...result, math_regions: updatedRegions });
      }
      
      setSaveStatus('Đã lưu vào Dataset huấn luyện!');
      setEditingRegionIndex(null);
    } catch (err) {
      setSaveStatus('Lỗi khi lưu dữ liệu.');
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
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm text-neutral-700">Math Regions Detected:</h4>
                  {saveStatus && <span className="text-xs text-green-600 font-medium">{saveStatus}</span>}
                </div>
                
                <ul className="space-y-3">
                  {result.math_regions.map((region, idx) => (
                    <li key={idx} className="bg-white p-3 border rounded shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${region.confidence < 0.9 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                          Confidence: {Math.round(region.confidence * 100)}%
                        </span>
                        {editingRegionIndex !== idx && (
                          <button 
                            onClick={() => startEditing(idx, region.latex)}
                            className="text-xs text-primary-600 hover:text-primary-800 underline"
                          >
                            Sửa lỗi (Train Model)
                          </button>
                        )}
                      </div>

                      {editingRegionIndex === idx ? (
                        <div className="flex flex-col gap-2">
                          <textarea 
                            value={editedLatex}
                            onChange={(e) => setEditedLatex(e.target.value)}
                            className="w-full font-mono text-xs p-2 border border-primary-300 rounded bg-primary-50 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            rows={3}
                          />
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => setEditingRegionIndex(null)}
                              className="text-xs px-3 py-1 text-neutral-600 hover:bg-neutral-100 rounded"
                            >
                              Hủy
                            </button>
                            <button 
                              onClick={() => handleSaveCorrection(region)}
                              className="text-xs px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700"
                            >
                              Lưu vào Dataset
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs overflow-x-auto pb-1">
                          {region.latex}
                        </div>
                      )}
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
