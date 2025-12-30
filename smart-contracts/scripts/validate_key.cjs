const { ethers } = require("ethers");

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("PRIVATE_KEY is missing");
    process.exit(1);
  }

  try {
    const wallet = new ethers.Wallet(privateKey);
    console.log("Valid Private Key. Address:", wallet.address);
  } catch (error) {
    console.error("Invalid Private Key:", error.message);
    process.exit(1);
  }
}

main();
