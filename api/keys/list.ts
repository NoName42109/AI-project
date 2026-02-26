import { apiKeyManager } from '../../src/services/apiKeyManager';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const keys = apiKeyManager.loadKeysFromEnv();
    
    if (keys.length === 0) {
      console.warn('[API Keys] LLAMA_API_KEYS is empty in environment variables.');
      return res.status(200).json([]);
    }

    // Initialize missing keys in Firestore and get their status
    const results = await apiKeyManager.initializeMissingKeys();
    
    // Format results for the frontend component
    const formattedResults = results.map((record, index) => {
      // If a key has 0 usage, we ensure it shows 100% and "active"
      const isUnused = record.usageCount === 0;
      
      return {
        id: record.id || `env_key_${index + 1}`,
        service: 'llamacloud',
        maskedKey: record.maskedKey,
        quotaRemainingPercent: isUnused ? 100 : record.quotaRemainingPercent,
        status: isUnused ? 'active' : record.status,
        usageCount: record.usageCount,
        lastUsed: record.lastUsed,
        isNew: isUnused
      };
    });

    res.status(200).json(formattedResults);
  } catch (error: any) {
    console.error('[API Keys] Error processing keys:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
