export const config = {
  runtime: 'edge',
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
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      throw new Error('Missing filename');
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      throw new Error('Missing BLOB_READ_WRITE_TOKEN env');
    }

    const arrayBuffer = await req.arrayBuffer();

    const uploadRes = await fetch(`https://blob.vercel-storage.com/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        'x-vercel-filename': `voice-note/${filename}`,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    const result = await uploadRes.json();

    if (!result.url) {
      throw new Error('Upload failed: No URL returned.');
    }

    return new Response(JSON.stringify({ url: result.url }), {
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
