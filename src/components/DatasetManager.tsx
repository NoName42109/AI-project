import React, { useState } from 'react';
import { syntheticDataGenerator } from '../utils/syntheticDataGenerator';
import { datasetService } from '../services/datasetService';

export const DatasetManager: React.FC = () => {
  const [syntheticCount, setSyntheticCount] = useState<number>(100);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGenerateSynthetic = () => {
    setLoading(true);
    setMessage('');
    try {
      const jsonl = syntheticDataGenerator.generateDataset(syntheticCount);
      downloadFile(jsonl, `vieta_synthetic_${syntheticCount}.jsonl`);
      setMessage(`Đã tạo thành công ${syntheticCount} mẫu dữ liệu giả lập (Synthetic Data).`);
    } catch (error: any) {
      setMessage(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExportHardCases = async () => {
    setLoading(true);
    setMessage('');
    try {
      const jsonl = await datasetService.exportHardCasesAsJsonl();
      if (!jsonl) {
        setMessage('Chưa có dữ liệu Hard Cases nào trong hệ thống.');
        return;
      }
      downloadFile(jsonl, `vieta_hard_cases_export.jsonl`);
      setMessage(`Đã xuất thành công tập dữ liệu Hard Cases từ hệ thống.`);
    } catch (error: any) {
      setMessage(`Lỗi khi xuất dữ liệu: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/jsonl' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200 max-w-3xl mx-auto mt-8">
      <h2 className="text-xl font-bold text-neutral-800 mb-6">Quản lý Dataset (Vieta-9-MER)</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Synthetic Data Generator */}
        <div className="p-4 border border-primary-100 bg-primary-50/30 rounded-lg">
          <h3 className="font-bold text-primary-800 mb-2">1. Sinh dữ liệu giả lập (Synthetic)</h3>
          <p className="text-xs text-neutral-600 mb-4">
            Tạo các biểu thức Vi-ét ngẫu nhiên (phương trình, hệ phương trình, phân số) để làm dữ liệu nền tảng cho model.
          </p>
          
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm font-medium text-neutral-700">Số lượng:</label>
            <input 
              type="number" 
              value={syntheticCount} 
              onChange={(e) => setSyntheticCount(Number(e.target.value))}
              min={10} max={10000}
              className="border border-neutral-300 rounded px-2 py-1 w-24 text-sm"
            />
          </div>
          
          <button 
            onClick={handleGenerateSynthetic}
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            Tạo & Tải xuống (.jsonl)
          </button>
        </div>

        {/* Hard Cases Exporter (Active Learning) */}
        <div className="p-4 border border-orange-100 bg-orange-50/30 rounded-lg">
          <h3 className="font-bold text-orange-800 mb-2">2. Xuất dữ liệu lỗi (Active Learning)</h3>
          <p className="text-xs text-neutral-600 mb-4">
            Xuất các trường hợp OCR nhận diện sai đã được giáo viên sửa lại trên hệ thống (từ Firestore collection `mer_hard_cases`).
          </p>
          
          <button 
            onClick={handleExportHardCases}
            disabled={loading}
            className="w-full mt-auto bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
          >
            Xuất Hard Cases (.jsonl)
          </button>
        </div>
      </div>

      {message && (
        <div className={`mt-6 p-3 text-sm rounded-lg border ${message.includes('Lỗi') ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
          {message}
        </div>
      )}
    </div>
  );
};
