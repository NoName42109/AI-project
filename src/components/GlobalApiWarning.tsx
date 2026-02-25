import React, { useState, useEffect } from 'react';
import { AlertTriangle, XCircle } from 'lucide-react';

interface ApiKeyRecord {
  id: string;
  service: string;
  maskedKey: string;
  quotaRemainingPercent: number;
  status: 'active' | 'standby' | 'low_quota' | 'disabled';
}

export const GlobalApiWarning: React.FC = () => {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const response = await fetch('/api/keys/list');
        if (response.ok) {
          const data = await response.json();
          setKeys(data);
        }
      } catch (err) {
        console.error("Lỗi khi tải API Keys cho cảnh báo:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();
    // Refresh every 5 minutes
    const interval = setInterval(fetchKeys, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || keys.length === 0) return null;

  // Check if all keys are disabled/empty
  const allDisabled = keys.every(k => k.status === 'disabled' || k.quotaRemainingPercent <= 0);
  
  // Check if any active/standby key is low quota (< 20%)
  const hasLowQuota = keys.some(k => k.quotaRemainingPercent > 0 && k.quotaRemainingPercent < 20);

  if (allDisabled) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-sm z-50 relative">
        <XCircle className="w-5 h-5" />
        <span className="text-sm font-medium">Hệ thống gián đoạn: Tất cả API Key đã hết Quota. Vui lòng cập nhật Key mới ngay lập tức!</span>
      </div>
    );
  }

  if (hasLowQuota) {
    return (
      <div className="fixed bottom-6 right-6 bg-white border-l-4 border-orange-500 shadow-xl rounded-lg p-4 max-w-sm z-50 flex items-start gap-3 animate-in slide-in-from-bottom-5">
        <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-bold text-neutral-800">Cảnh báo Quota API</h4>
          <p className="text-xs text-neutral-600 mt-1">
            Một số API Key (Llama Cloud) đang còn dưới 20% quota. Hệ thống có thể bị gián đoạn nếu không bổ sung.
          </p>
        </div>
      </div>
    );
  }

  return null;
};
