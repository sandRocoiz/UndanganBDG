import FormData from 'form-data';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN; // Ambil dari .env
  if (!blobToken) return res.status(500).json({ error: 'Missing Vercel Blob Token' });

  try {
    const form = new FormData();
    form.append('file', req.body.file, {
      filename: `voice-${Date.now()}.mp3`,
      contentType: req.headers['content-type'] || 'audio/mpeg',
    });

    const response = await fetch('https://api.vercel.com/v2/blob/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${blobToken}`,
      },
      body: form,
    });

    const json = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(json);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}
