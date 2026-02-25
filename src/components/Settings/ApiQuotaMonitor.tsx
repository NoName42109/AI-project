import React, { useEffect, useState } from 'react';

interface QuotaData {
  maskedKey: string;
  total: number;
  used: number;
  remaining: number;
  percentage: number;
  status: string;
}

export const ApiQuotaMonitor: React.FC = () => {
  const [quota, setQuota] = useState<QuotaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchQuota = async () => {
      try {
        const res = await fetch('/api/check-quota');
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Không thể lấy thông tin Quota');
        }
        const data = await res.json();
        setQuota(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuota();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-neutral-100 rounded-xl max-w-md"></div>;
  }
  
  if (error) {
    return <div className="text-red-500 text-sm p-4 bg-red-50 rounded-xl max-w-md border border-red-100">{error}</div>;
  }
  
  if (!quota) return null;

  // Xác định màu sắc dựa trên % đã sử dụng
  // Xanh (>50% còn lại tức là <50% used)
  // Vàng (20-50% còn lại tức là 50-80% used)
  // Đỏ (<20% còn lại tức là >80% used)
  const getProgressColor = (percent: number) => {
    if (percent >= 80) return 'bg-red-500'; 
    if (percent >= 50) return 'bg-yellow-500'; 
    return 'bg-green-500'; 
  };

  const getStatusColor = (status: string) => {
    if (status === 'HẾT QUOTA') return 'text-red-700 bg-red-100';
    if (status === 'GẦN HẾT') return 'text-yellow-700 bg-yellow-100';
    return 'text-green-700 bg-green-100';
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-neutral-200 shadow-sm max-w-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="font-bold text-neutral-800">Llama Cloud API</h3>
          <p className="text-xs text-neutral-500 font-mono mt-1">Key: {quota.maskedKey}</p>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${getStatusColor(quota.status)}`}>
          {quota.status}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Đã sử dụng</span>
          <span className="font-bold text-neutral-800">{quota.used} / {quota.total} pages</span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-neutral-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${getProgressColor(quota.percentage)}`}
            style={{ width: `${Math.min(quota.percentage, 100)}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between text-xs mt-2">
          <span className="text-neutral-500">{quota.percentage}%</span>
          <span className={`${quota.remaining < (quota.total * 0.2) ? 'text-red-600 font-bold' : 'text-neutral-500'}`}>
            Còn lại: {quota.remaining} pages
          </span>
        </div>
      </div>

      {quota.percentage >= 80 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600 leading-relaxed">
          ⚠️ <strong>Cảnh báo:</strong> Dung lượng API sắp hết. Vui lòng nâng cấp gói hoặc đổi API Key mới để không làm gián đoạn việc quét đề của giáo viên.
        </div>
      )}
    </div>
  );
};
