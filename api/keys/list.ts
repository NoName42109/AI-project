export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const keysStr = process.env.LLAMA_API_KEYS || process.env.LLAMA_API_KEY || '';
  const keys = keysStr.split(',').map(k => k.trim()).filter(k => k.length > 0);

  if (keys.length === 0) {
    return new Response(JSON.stringify([]), { status: 200 });
  }

  const results = await Promise.all(keys.map(async (key, index) => {
    const maskedKey = key.substring(0, 4) + '****' + key.substring(key.length - 4);
    
    try {
      const res = await fetch('https://api.cloud.llamaindex.ai/api/parsing/usage', {
        headers: { 'Authorization': `Bearer ${key}` }
      });
      
      if (res.ok) {
        const data = await res.json();
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

  return new Response(JSON.stringify(results), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
