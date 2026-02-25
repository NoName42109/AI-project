import React, { useState, useEffect } from 'react';

interface ApiKeyRecord {
  id: string;
  service: string;
  maskedKey: string;
  quotaRemainingPercent: number;
  status: 'active' | 'standby' | 'low_quota' | 'disabled';
  usageCount: number;
  lastUsed: number;
}

export const ApiKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const fetchKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/keys/list');
      if (!response.ok) throw new Error(`Lỗi HTTP ${response.status}`);
      const data = await response.json();
      setKeys(data);
    } catch (err: any) {
      setError(err.message || 'Không thể lấy danh sách API Key.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">Active</span>;
      case 'standby':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">Standby</span>;
      case 'low_quota':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">Low Quota</span>;
      case 'disabled':
        return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">Disabled</span>;
      default:
        return <span className="px-2 py-1 bg-neutral-100 text-neutral-700 text-xs font-bold rounded">Unknown</span>;
    }
  };

  const getProgressBarColor = (percent: number, status: string) => {
    if (status === 'disabled') return 'bg-neutral-400';
    if (percent < 5) return 'bg-red-500';
    if (percent < 20) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm border border-neutral-200 max-w-4xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-800">Quản lý API Key (Auto Rotation)</h2>
          <p className="text-xs text-neutral-500 mt-1">Hệ thống tự động chuyển key khi quota {'<'} 20%.</p>
        </div>
        <button 
          onClick={fetchKeys}
          disabled={loading}
          className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
        >
          {loading ? 'Đang tải...' : 'Làm mới danh sách'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-neutral-600">
          <thead className="text-xs text-neutral-700 uppercase bg-neutral-50 border-b">
            <tr>
              <th className="px-4 py-3">Dịch vụ</th>
              <th className="px-4 py-3">API Key (Masked)</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3 w-1/3">Quota còn lại (%)</th>
              <th className="px-4 py-3 text-right">Lượt dùng</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && !loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-500">
                  Chưa có API Key nào trong hệ thống. Vui lòng thêm key vào Firestore collection `api_keys`.
                </td>
              </tr>
            ) : (
              keys.map((key) => (
                <tr key={key.id} className="border-b hover:bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">{key.service}</td>
                  <td className="px-4 py-3 font-mono text-xs">{key.maskedKey}</td>
                  <td className="px-4 py-3">{getStatusBadge(key.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-neutral-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getProgressBarColor(key.quotaRemainingPercent, key.status)}`} 
                          style={{ width: `${Math.max(0, key.quotaRemainingPercent)}%` }}
                        ></div>
                      </div>
                      <span className={`text-xs font-bold w-8 text-right ${key.quotaRemainingPercent < 20 ? 'text-red-600' : 'text-neutral-700'}`}>
                        {key.quotaRemainingPercent.toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{key.usageCount || 0}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
