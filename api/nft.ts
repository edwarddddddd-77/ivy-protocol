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
    image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663266857239/tMavgNNFfVwcUBEd.jpg", 
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
