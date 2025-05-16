// File: api/delete-voice.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).end("Method Not Allowed");
  }

  const { blobUrl } = req.body;
  if (!blobUrl) return res.status(400).json({ error: "Missing blobUrl" });

  try {
    const blobName = new URL(blobUrl).pathname.split("/").pop();

    const response = await fetch(`https://api.vercel.com/v2/blobs/${blobName}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_BLOB_TOKEN}`
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(500).json({ error });
    }

    return res.status(200).json({ success: true, blob: blobName });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
