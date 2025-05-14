import formidable from 'formidable';
import fs from 'fs';
import FormData from 'form-data';

export const config = {
  api: {
    bodyParser: false, // 🚨 Jangan parse body otomatis
  },
};

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

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) return res.status(500).json({ error: 'Missing Vercel Blob Token' });

  try {
    const form = new formidable.IncomingForm();
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('Form parse error:', err);
        return res.status(500).json({ error: 'Form parse failed' });
      }

      const file = files.file;
      if (!file) {
        return res.status(400).json({ error: 'File tidak ditemukan' });
      }

      const fileStream = fs.createReadStream(file[0].filepath);

      const formData = new FormData();
      formData.append('file', fileStream, {
        filename: `voice-${Date.now()}.mp3`,
        contentType: file[0].mimetype || 'audio/mpeg',
      });

      const uploadRes = await fetch('https://api.vercel.com/v2/blob/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${blobToken}`,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return res.status(500).json({ error: `Upload failed: ${errText}` });
      }

      const json = await uploadRes.json();
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(200).json(json);
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}
