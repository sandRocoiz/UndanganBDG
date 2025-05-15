export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const { filename, contentType } = await req.json();

    if (!filename || !contentType) {
      return new Response(JSON.stringify({ error: 'Missing filename or contentType' }), { status: 400 });
    }

    // Prepare Upload
    const prepareRes = await fetch('https://api.vercel.com/v8/storage/prepare-upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: filename,
        contentType: contentType,
      }),
    });

    const prepareData = await prepareRes.json();

    if (!prepareRes.ok) {
      return new Response(JSON.stringify({ error: prepareData.error }), { status: 400 });
    }

    // Return prepared upload URLs
    return new Response(JSON.stringify({
      uploadUrl: prepareData.uploadUrl,
      publicUrl: prepareData.url,
    }), { status: 200 });

  } catch (error) {
    console.error('Upload to Blob error:', error);
    return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
  }
}
