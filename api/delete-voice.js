export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, url } = req.body;
  const token = process.env.GAS_DELETE_TOKEN;

  if (!userId || !token) {
    return res.status(400).json({ error: 'Missing userId or token' });
  }

  try {
    const gasUrl = `https://script.google.com/macros/s/AKfycbwSX-fBpM5dbcYgjeAWJv6zEn21nGRS0E-jC21o6OJQRjiwEq8wVdnLefrtMX4EFo31PA/exec?action=deleteVoice&userId=${userId}&token=${token}`;

    const response = await fetch(gasUrl);
    const result = await response.text(); // or `.json()` if your GAS returns JSON

    if (!response.ok) {
      console.error("GAS responded with error:", result);
      return res.status(500).json({ error: 'Failed to delete from GAS' });
    }

    return res.status(200).json({ success: true, result });

  } catch (error) {
    console.error('Handler failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
