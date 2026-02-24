// api/parse-document.js
// Vercel Serverless Function (Tùy chọn cho Production)
// Đặt file này ở thư mục /api/parse-document.js (ngoài src)

export const config = {
  api: {
    bodyParser: false, // Để xử lý multipart/form-data
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.LLAMA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing LLAMA_API_KEY in environment' });
  }

  try {
    // Forward the multipart form data directly to Llama Cloud
    const llamaUploadRes = await fetch('https://api.cloud.llamaindex.ai/api/parsing/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': req.headers['content-type']
      },
      body: req,
      duplex: 'half'
    });

    if (!llamaUploadRes.ok) {
      return res.status(llamaUploadRes.status).json({ error: await llamaUploadRes.text() });
    }

    const uploadData = await llamaUploadRes.json();
    const jobId = uploadData.id;

    // Polling (Lưu ý: Vercel Hobby plan có timeout 10s)
    // Nếu file lớn, nên trả về jobId cho frontend tự poll
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const resultRes = await fetch(`https://api.cloud.llamaindex.ai/api/parsing/job/${jobId}/result/markdown`, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      
      if (resultRes.status === 200) {
        const data = await resultRes.json();
        return res.status(200).json({ markdown: data.markdown });
      }
    }
    
    // Nếu chưa xong trong 8s, trả về jobId để frontend tiếp tục poll
    return res.status(202).json({ jobId, message: "Processing", status: "pending" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
