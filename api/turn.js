export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Retrieve credentials securely from Vercel Environment Variables
  const apiKey = process.env.METERED_API_KEY;
  const domain = process.env.METERED_DOMAIN || 'xibworld';

  if (!apiKey) {
    console.error('METERED_API_KEY environment variable is not defined.');
    return res.status(500).json({ error: 'METERED_API_KEY environment variable is not configured on Vercel.' });
  }

  try {
    const response = await fetch(
      `https://${domain}.metered.live/api/v1/turn/credentials?apiKey=${apiKey}`
    );
    if (!response.ok) {
      const errData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return res.status(response.status).json(errData);
    }
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching TURN credentials:', error);
    return res.status(500).json({ error: error.message });
  }
}
