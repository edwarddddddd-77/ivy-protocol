import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  
  // Ensure ID is present
  if (!id) {
    return res.status(400).json({ error: 'Missing Token ID' });
  }

  const metadata = {
    name: `Genesis Node #${id}`,
    description: "A Genesis Node in the Ivy Protocol network. Grants governance rights and yield boosting capabilities.",
    image: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Pleiades_large.jpg/800px-Pleiades_large.jpg", // Stable Wikimedia purple nebula image
    external_url: "https://ivy-protocol.vercel.app",
    attributes: [
      {
        trait_type: "Type",
        value: "Genesis Node"
      },
      {
        trait_type: "Boost",
        value: "10%"
      },
      {
        trait_type: "Status",
        value: "Active"
      },
      {
        trait_type: "Generation",
        value: "Gen-0"
      }
    ]
  };

  // Disable API cache to prevent stale data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  // Set CORS headers to allow fetching from anywhere (marketplaces, etc.)
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  return res.status(200).json(metadata);
}
