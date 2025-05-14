// /api/upload-to-blob.js
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

  try {
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN; // 🔥 AMBIL dari environment variable

    if (!blobToken) {
      throw new Error('Missing Vercel Blob Token');
    }

    const contentType = req.headers['content-type'] || 'application/octet-stream';
    const filename = `voice-note-${Date.now()}.mp3`;

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', err => reject(err));
    });

    const form = new FormData();
    form.append('file', buffer, {
      filename: filename,
      contentType: contentType
    });

    const response = await fetch('https://api.vercel.com/v2/blob/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      throw new Error(`Failed to upload to Vercel Blob: ${await response.text()}`);
    }

    const json = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(json);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
}
