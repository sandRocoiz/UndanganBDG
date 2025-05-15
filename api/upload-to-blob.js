import { put } from "@vercel/blob";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const filename = searchParams.get('filename') || `voice-${Date.now()}.mp3`;

    const { url } = await put(filename, req, {
      access: 'public',
    });

    res.status(200).json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Internal Server Error');
  }
}
