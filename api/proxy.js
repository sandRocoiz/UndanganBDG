export default async function handler(req, res) {
  const baseUrl = 'https://script.google.com/macros/s/AKfycbwSX-fBpM5dbcYgjeAWJv6zEn21nGRS0E-jC21o6OJQRjiwEq8wVdnLefrtMX4EFo31PA/exec';

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(req.query || {})) {
    url.searchParams.append(key, value);
  }

  const fetchOptions = { method: req.method };

  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    fetchOptions.body = body;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // ⏳ 15s timeout safety
    fetchOptions.signal = controller.signal;

    const response = await fetch(url.toString(), fetchOptions);
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (contentType.includes('application/json')) {
      const json = await response.json();
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(json);
    } else {
      const text = await response.text();
      res.setHeader('Content-Type', 'text/plain');
      res.status(200).send(text);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'Proxy timeout', message: 'Google Apps Script tidak merespon.' });
    } else {
      res.status(500).json({ error: 'Proxy failed', message: err.message });
    }
  }
}
