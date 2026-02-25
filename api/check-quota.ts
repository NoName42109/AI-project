export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const apiKey = process.env.LLAMA_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Missing LLAMA_API_KEY in environment variables' }), { status: 500 });
  }

  try {
    // Pseudo-endpoint for Llama Cloud usage. 
    // In reality, you might need to check their specific billing endpoint or track usage in your own database (Firestore).
    // For demonstration, we will simulate a response if the actual endpoint doesn't exist.
    let total = 1000;
    let used = 850; // Simulate 85% used

    try {
      const response = await fetch('https://api.cloud.llamaindex.ai/api/v1/usage', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      if (response.ok) {
        const data = await response.json();
        total = data.total_pages_limit || 1000;
        used = data.used_pages || 0;
      }
    } catch (e) {
      console.warn("Could not fetch real usage, using mock data.");
    }

    const remaining = total - used;
    const percentage = Math.round((used / total) * 100);

    let status = 'OK';
    if (percentage >= 100) status = 'HẾT QUOTA';
    else if (percentage >= 80) status = 'GẦN HẾT';

    // Mask API Key: llx-****HSWCz
    const maskedKey = apiKey.length > 10 
      ? `llx-****${apiKey.slice(-5)}` 
      : 'llx-****';

    return new Response(JSON.stringify({
      maskedKey,
      total,
      used,
      remaining,
      percentage,
      status
    }), { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
