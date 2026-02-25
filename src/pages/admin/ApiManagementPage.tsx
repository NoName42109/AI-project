import React, { useState, useEffect } from 'react';
import { Key, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export interface ApiKeyRecord {
  id: string;
  service: string;
  maskedKey: string;
  quotaRemainingPercent: number;
  status: 'active' | 'standby' | 'low_quota' | 'disabled';
}

export const ApiManagementPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const fetchKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/keys/list');
      if (!response.ok) {
        throw new Error(`Lỗi HTTP ${response.status}`);
      }
      
      const fetchedKeys = await response.json() as ApiKeyRecord[];
      setKeys(fetchedKeys);
    } catch (err: any) {
      console.error("Lỗi khi tải API Keys:", err);
      setError('Không thể tải danh sách API Key. Vui lòng kiểm tra kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const getStatusConfig = (status: string, percent: number) => {
    if (status === 'disabled' || percent <= 0) {
      return {
        color: 'text-neutral-500',
        bg: 'bg-neutral-100',
        border: 'border-neutral-200',
        bar: 'bg-neutral-400',
        icon: <XCircle className="w-4 h-4 text-neutral-500" />,
        label: 'Disabled',
        opacity: 'opacity-60'
      };
    }
    if (percent < 20 || status === 'low_quota') {
      return {
        color: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-200',
        bar: 'bg-red-500',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        label: 'Low Quota',
        opacity: 'opacity-100'
      };
    }
    if (status === 'standby') {
      return {
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        bar: 'bg-blue-500',
        icon: <CheckCircle className="w-4 h-4 text-blue-600" />,
        label: 'Standby',
        opacity: 'opacity-100'
      };
    }
    return {
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-200',
      bar: 'bg-green-500',
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
      label: 'Active',
      opacity: 'opacity-100'
    };
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 flex items-center gap-2">
            <Key className="w-6 h-6 text-primary-600" />
            Quản lý API Key
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            Giám sát Quota và trạng thái Auto Rotation của các dịch vụ OCR/AI.
          </p>
        </div>
        <button 
          onClick={fetchKeys}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-neutral-100 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="text-center py-16 bg-white border border-neutral-200 rounded-xl shadow-sm">
          <Key className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-neutral-900">Chưa có API Key nào</h3>
          <p className="text-sm text-neutral-500 mt-1">Vui lòng thêm API Key vào biến môi trường `LLAMA_API_KEYS` trên Vercel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {keys.map((key) => {
            const config = getStatusConfig(key.status, key.quotaRemainingPercent);
            
            return (
              <div 
                key={key.id} 
                className={`bg-white rounded-xl border ${config.border} shadow-sm overflow-hidden transition-all hover:shadow-md ${config.opacity}`}
              >
                <div className={`px-5 py-3 border-b ${config.border} flex justify-between items-center bg-neutral-50/50`}>
                  <span className="font-semibold text-neutral-800 capitalize">{key.service} API</span>
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                    {config.icon}
                    {config.label}
                  </div>
                </div>
                
                <div className="p-5">
                  <div className="mb-4">
                    <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider font-semibold">API Key</p>
                    <p className="font-mono text-sm bg-neutral-100 px-3 py-2 rounded border border-neutral-200 text-neutral-700">
                      {key.maskedKey}
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-end mb-1.5">
                      <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Quota Còn Lại</p>
                      <span className={`text-sm font-bold ${key.quotaRemainingPercent < 20 ? 'text-red-600' : 'text-neutral-700'}`}>
                        {Math.max(0, key.quotaRemainingPercent).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2.5 overflow-hidden border border-neutral-200/50">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${config.bar}`} 
                        style={{ width: `${Math.max(0, key.quotaRemainingPercent)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
