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
  // with fallback defaults for zero-config startup
  const apiKey = process.env.METERED_API_KEY || 'i4yL5XoDH7g2C9Jiekj4Fk6WmqHlQvstAdgL1edPIJVky6zi';
  const domain = process.env.METERED_DOMAIN || 'xibworld';

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
