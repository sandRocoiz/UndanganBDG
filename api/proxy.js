export default async function handler(req, res) {
  const baseUrl = 'https://script.google.com/macros/s/AKfycby7srw_3_m0VFOAqmvg-lxT1lvSWjwuvsTe2JN9zS1u-e75BQXm2uns8S0PI1Rt07HFCQ/exec';


  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  let url = baseUrl;
  const fetchOptions = {
    method: req.method,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  // For POST: forward the body
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    fetchOptions.body = body;
  }

  // For GET: forward query parameters
  if (req.method === 'GET' && Object.keys(req.query).length > 0) {
    const queryString = new URLSearchParams(req.query).toString();
    url += `?${queryString}`;
  }

  try {
    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('content-type');
    const text = await response.text();

    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentType && contentType.includes('application/json')) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(text);
    } else {
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(text);
    }
  } catch (err) {
    res.status(500).json({ error: 'Proxy failed', message: err.message });
  }
}
