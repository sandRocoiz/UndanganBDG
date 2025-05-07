export default async function handler(req, res) {
  const url = 'https://script.google.com/macros/s/AKfycbzJ4GIWbHa8PfbZPAa5pNlqVTRpcEA3Pzd7BSCz86FIzENiBBi6JT38xSFRzbmUuOzkng/exec';

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

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

  const response = await fetch(url, fetchOptions);
  const text = await response.text();

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(text);
}
