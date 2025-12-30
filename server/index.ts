import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // NFT Metadata API
  app.get("/api/nft/:id", (req, res) => {
    const id = req.params.id;
    const metadata = {
      name: `Genesis Node #${id}`,
      description: "A Genesis Node in the Ivy Protocol network. Grants governance rights and yield boosting capabilities.",
      image: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663266857239/tMavgNNFfVwcUBEd.jpg", // Cyberpunk abstract image
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
    res.json(metadata);
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
