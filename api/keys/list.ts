export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const keysStr = process.env.LLAMA_API_KEYS || process.env.LLAMA_API_KEY || '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

  if (keys.length === 0) {
    return res.status(200).json([]);
  }

  const results = await Promise.all(keys.map(async (key, index) => {
    const maskedKey = key.substring(0, 4) + '****' + key.substring(key.length - 4);
    try {
      const fetchRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/usage', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        const total = data.total_pages_allowed || 1000;
        const used = data.total_pages_used || 0;
        const remainingPercent = Math.max(0, ((total - used) / total) * 100);
        
        let status = 'active';
        if (remainingPercent <= 0) status = 'disabled';
        else if (remainingPercent < 20) status = 'low_quota';

        return {
          id: `env_key_${index + 1}`,
          service: 'llamacloud',
          maskedKey,
          quotaRemainingPercent: remainingPercent,
          status,
          usageCount: used,
          lastUsed: Date.now()
        };
      }
      return { id: `env_key_${index + 1}`, service: 'llamacloud', maskedKey, status: 'disabled', quotaRemainingPercent: 0, usageCount: 0 };
    } catch (e) {
      return { id: `env_key_${index + 1}`, service: 'llamacloud', maskedKey, status: 'error', quotaRemainingPercent: 0, usageCount: 0 };
    }
  }));

  res.status(200).json(results);
}
