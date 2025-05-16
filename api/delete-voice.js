import { del } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { blobUrl, token } = req.body;
  const requiredToken = process.env.GAS_DELETE_TOKEN;

  if (!blobUrl || !token || token !== requiredToken) {
    return res.status(400).json({ error: 'Missing or invalid blobUrl/token' });
  }

  try {
    const { url: deletedUrl } = await del(new URL(blobUrl));
    return res.status(200).json({ success: true, deletedUrl });
  } catch (err) {
    console.error("❌ Gagal hapus blob:", err);
    return res.status(500).json({ error: 'Failed to delete blob', detail: err.message });
  }
}
