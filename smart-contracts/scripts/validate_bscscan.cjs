const https = require('https');

async function main() {
  const apiKey = process.env.BSCSCAN_API_KEY;
  if (!apiKey) {
    console.error("BSCSCAN_API_KEY is missing");
    process.exit(1);
  }

  const url = `https://api-testnet.bscscan.com/api?module=stats&action=bnbprice&apikey=${apiKey}`;

  https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.status === '1' || json.message === 'OK') {
          console.log("Valid BscScan API Key");
        } else {
          console.error("Invalid BscScan API Key:", json.result);
          process.exit(1);
        }
      } catch (e) {
        console.error("Error parsing response:", e.message);
        process.exit(1);
      }
    });
  }).on('error', (e) => {
    console.error("Request error:", e.message);
    process.exit(1);
  });
}

main();
