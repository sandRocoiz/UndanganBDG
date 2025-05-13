export default async function handler(req, res) {
  const BASE_URL = "https://script.google.com/macros/s/AKfycbwSX-fBpM5dbcYgjeAWJv6zEn21nGRS0E-jC21o6OJQRjiwEq8wVdnLefrtMX4EFo31PA/exec";

  const method = req.method;
  const headers = { ...req.headers };
  delete headers["host"];
  delete headers["content-length"];

  const fetchOptions = {
    method,
    headers,
    body: method === "POST" ? req.body : undefined,
  };

  const response = await fetch(BASE_URL, fetchOptions);

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = await response.json();
    res.status(response.status).json(data);
  } else {
    const text = await response.text();
    res.status(response.status).send(text);
  }
}
