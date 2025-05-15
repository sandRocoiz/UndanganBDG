import { put } from '@vercel/blob';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename') || `voice-${Date.now()}.mp3`;

    const { url } = await put(filename, req.body, {
      access: 'public',
    });

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('❌ Upload error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
