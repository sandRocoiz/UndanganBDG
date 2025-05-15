export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // === OPTIONS (CORS) ===
  if (req.method === 'OPTIONS') {
    return new Response('', {
      status: 204,
      headers: corsHeaders(),
    });
  }

  // === METHOD CHECK ===
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }

  try {
    // === CEK PARAMETER FILENAME ===
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    if (!filename) {
      throw new Error('Missing filename parameter');
    }

    // === CEK TOKEN ===
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error('Missing BLOB_READ_WRITE_TOKEN environment variable');
    }

    // === BACA BODY ===
    const arrayBuffer = await req.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Uploaded file is empty');
    }

    // === UPLOAD KE VERCEL BLOB ===
    const uploadRes = await fetch('https://api.vercel.com/v2/blob/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'x-vercel-filename': `voice-note/${filename}`,
        'Content-Type': 'application/octet-stream',
      },
      body: arrayBuffer,
    });

    // === HANDLE JIKA ERROR UPLOAD ===
    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Upload failed: ${errorText}`);
    }

    // === SUKSES UPLOAD ===
    const result = await uploadRes.json();

    return new Response(JSON.stringify({ url: result.url }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });

  } catch (err) {
    // === HANDLE SEMUA ERROR ===
    console.error('❌ Upload Error:', err.message);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
}

// === CORS HEADERS BANTUAN ===
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
