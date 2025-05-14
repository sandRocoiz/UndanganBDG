export default async function handler(req, res) {
  const { method } = req;
  const baseUrl = "https://script.google.com/macros/s/AKfycbyUOWRVZJ96CPeno-Ku2j5z1Vy9AdTxT6xLRJpKd6GSvbYeC4aFBK7cjtosczphmwzXYA/exec";

  if (method === 'POST') {
    try {
      const formData = req.body;
      const response = await fetch(baseUrl, {
        method: 'POST',
        body: formData
      });
      const result = await response.json();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).send(error.toString());
    }
  }

  if (method === 'GET') {
    try {
      const response = await fetch(baseUrl);
      const result = await response.json();
      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).send(error.toString());
    }
  }

  return res.status(405).send('Method Not Allowed');
}