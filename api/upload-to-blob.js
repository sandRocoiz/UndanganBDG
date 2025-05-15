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
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);
    const filename = searchParams.get('filename');

    if (!filename) {
      throw new Error('Missing filename');
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const uploadUrl = `https://api.vercel.com/v2/blob/upload?teamId=${process.env.VERCEL_TEAM_ID || ''}`;

    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${blobToken}`,
        'Content-Type': req.headers['content-type'] || 'application/octet-stream',
      },
      body: req,
    });

    const result = await uploadRes.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(result);
    
  } catch (error) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: error.message });
  }
}
