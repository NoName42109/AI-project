import React, { useState } from 'react';

export const AddApiKeyForm: React.FC<{ onAdded?: () => void }> = ({ onAdded }) => {
  const [service, setService] = useState('llamacloud');
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState('standby');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setMessage({ type: 'error', text: 'Vui lòng nhập API Key' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/keys/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, key: apiKey, status })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi thêm API Key');
      }

      setMessage({ type: 'success', text: 'Thêm API Key thành công!' });
      setApiKey(''); // Reset field an toàn
      
      if (onAdded) onAdded(); // Refresh danh sách

    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200 max-w-4xl mx-auto mt-6">
      <h3 className="text-lg font-bold text-neutral-800 mb-4">Thêm API Key mới</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Dịch vụ</label>
            <select 
              value={service} 
              onChange={(e) => setService(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="llamacloud">Llama Cloud</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Trạng thái ban đầu</label>
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="standby">Standby (Dự phòng)</option>
              <option value="active">Active (Sử dụng ngay)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">API Key</label>
            <input 
              type="password" 
              value={apiKey} 
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Nhập API Key thật..."
              className="w-full border border-neutral-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <div className="flex justify-end items-center gap-4 mt-4">
          {message.text && (
            <span className={`text-sm font-medium ${message.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
              {message.text}
            </span>
          )}
          <button 
            type="submit" 
            disabled={loading || !apiKey}
            className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-6 rounded transition-colors disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu API Key'}
          </button>
        </div>
      </form>
    </div>
  );
};
