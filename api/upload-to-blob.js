import { put } from '@vercel/blob';

export const config = {
  runtime: 'edge', // ✅ WAJIB EDGE runtime
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      throw new Error('Missing filename');
    }

    const arrayBuffer = await req.arrayBuffer(); // ✅ Ambil body sebagai arrayBuffer
    const buffer = Buffer.from(arrayBuffer);

    const blob = await put(`voice-note/${filename}`, buffer, {
      access: 'public',
    });

    return new Response(JSON.stringify({ url: blob.url }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
