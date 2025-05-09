export default async function handler(req, res) {
  const baseUrl = 'https://script.google.com/macros/s/AKfycby7srw_3_m0VFOAqmvg-lxT1lvSWjwuvsTe2JN9zS1u-e75BQXm2uns8S0PI1Rt07HFCQ/exec';

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  const url = new URL(baseUrl);
  Object.entries(req.query || {}).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const fetchOptions = {
    method: req.method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    fetchOptions.body = body;
  }

  try {
    const response = await fetch(url.toString(), fetchOptions);
    const contentType = response.headers.get('content-type');
    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentType && contentType.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json');
    } else {
      res.setHeader('Content-Type', 'text/plain');
    }

    res.status(200).send(text);
  } catch (err) {
    res.status(500).json({ error: 'Proxy failed', message: err.message });
  }
}
