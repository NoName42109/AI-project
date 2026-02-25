import React, { useState, useEffect } from 'react';
import { usageService } from '../services/usageService';

interface UsageData {
  llama: {
    status: 'success' | 'error' | 'unsupported';
    total_limit?: number;
    used?: number;
    remaining_percent?: number;
    reset_time?: string;
    health?: 'ok' | 'warning' | 'critical';
    error?: string;
  };
  gemini: {
    status: 'success' | 'error' | 'unsupported';
    error?: string;
  };
  timestamp: number;
}

export const SettingsPage: React.FC = () => {
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchUsage = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/check-usage');
      if (!response.ok) {
        throw new Error(`Lỗi HTTP ${response.status}`);
      }
      const data: UsageData = await response.json();
      setUsageData(data);

      // Lưu log vào Firestore nếu lấy thành công
      if (data.llama.status === 'success' && data.llama.used !== undefined && data.llama.total_limit !== undefined) {
        await usageService.logUsage({
          llama_used: data.llama.used,
          llama_total: data.llama.total_limit,
          llama_remaining_percent: data.llama.remaining_percent || 0,
          health: data.llama.health || 'ok',
          timestamp: data.timestamp,
          date_string: new Date().toISOString().split('T')[0]
        });
      }
    } catch (err: any) {
      setError(err.message || 'Không thể lấy thông tin usage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  const getProgressBarColor = (health?: 'ok' | 'warning' | 'critical') => {
    if (health === 'critical') return 'bg-red-500';
    if (health === 'warning') return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (health?: 'ok' | 'warning' | 'critical') => {
    if (health === 'critical') return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Critical ({'<'} 5%)</span>;
    if (health === 'warning') return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">Warning ({'<'} 20%)</span>;
    return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">OK</span>;
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200 max-w-3xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-neutral-800">Cài đặt & Quản lý API Quota</h2>
        <button 
          onClick={fetchUsage}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? 'Đang tải...' : 'Refresh Usage'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {usageData && (
        <div className="space-y-6">
          {/* Llama Cloud Card */}
          <div className="p-5 border border-neutral-200 rounded-lg bg-neutral-50 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-neutral-800 text-lg">Llama Cloud API</h3>
              {usageData.llama.status === 'success' && getStatusBadge(usageData.llama.health)}
            </div>

            {usageData.llama.status === 'success' ? (
              <div>
                <div className="flex justify-between text-sm text-neutral-600 mb-2">
                  <span>Đã dùng: <strong className="text-neutral-900">{usageData.llama.used}</strong> / {usageData.llama.total_limit} pages</span>
                  <span>Còn lại: <strong className="text-neutral-900">{usageData.llama.remaining_percent?.toFixed(1)}%</strong></span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-neutral-200 rounded-full h-2.5 mb-4 overflow-hidden">
                  <div 
                    className={`h-2.5 rounded-full ${getProgressBarColor(usageData.llama.health)}`} 
                    style={{ width: `${100 - (usageData.llama.remaining_percent || 0)}%` }}
                  ></div>
                </div>

                <div className="text-xs text-neutral-500 flex justify-between">
                  <span>Reset quota: <strong className="text-neutral-700">{usageData.llama.reset_time}</strong></span>
                  <span>Cập nhật lúc: {new Date(usageData.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ) : (
              <div className={`p-3 text-sm rounded-lg border ${usageData.llama.status === 'unsupported' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {usageData.llama.error}
              </div>
            )}
          </div>

          {/* Gemini API Card */}
          <div className="p-5 border border-neutral-200 rounded-lg bg-neutral-50 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-neutral-800 text-lg">Gemini API</h3>
            </div>

            {usageData.gemini.status === 'success' ? (
              <div className="text-sm text-neutral-600">Đang hoạt động bình thường.</div>
            ) : (
              <div className={`p-3 text-sm rounded-lg border ${usageData.gemini.status === 'unsupported' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {usageData.gemini.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
