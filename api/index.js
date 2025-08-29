const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
const cors = require('cors'); 
require('dotenv').config(); 

// Setup Express.js
const app = express();
const port = 3000;

// Tambahkan CORS middleware
app.use(cors());

// ABI untuk kontrak ERC20 balanceOf
const tokenABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Provider Linea Mainnet
const provider = new ethers.providers.JsonRpcProvider(`https://linea-mainnet.infura.io/v3/${process.env.API_KEY}`);

// Alamat kontrak token
const tokenInfo = {
  lxp:  { address: "0xd83af4fbD77f3AB65C3B1Dc4B38D7e67AEcf599A", decimals: 18 },
  "lxp-l": { address: "0xBC8f4663470229Fd4CA3686A24792d93Dd800216", decimals: 18 },
  lam: { address: "0xe158cacce6f5713f5739a7d7af0db60116187687", decimals: 9 } // pakai 9 desimal
};

// Fungsi untuk mendapatkan balance token
async function getTokenBalance(walletAddress, { address, decimals }) {
  try {
    const tokenContract = new ethers.Contract(address, tokenABI, provider);
    const balance = await tokenContract.balanceOf(walletAddress);
    return ethers.utils.formatUnits(balance, decimals);
  } catch (error) {
    console.error(`Error getting token balance from ${address}: ${error}`);
    return "0"; 
  }
}

// Fungsi untuk mendapatkan POH
async function getPohData(walletAddress) {
  try {
    const response = await axios.get(`https://linea-xp-poh-api.linea.build/poh/${walletAddress}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching POH data: ${error}`);
    throw new Error('Unable to fetch POH data');
  }
}

// API endpoint
app.get('/api/', async (req, res) => {
  const walletAddress = req.query.address;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Address parameter is required' });
  }

  try {
    // Ambil semua balance token dan POH secara paralel
    const [lxp, lxpL, lam, pohData] = await Promise.all([
      getTokenBalance(walletAddress, tokenInfo.lxp),
      getTokenBalance(walletAddress, tokenInfo["lxp-l"]),
      getTokenBalance(walletAddress, tokenInfo.lam),
      getPohData(walletAddress)
    ]);

    // Response gabungan
    res.json({
      poh: pohData.poh,
      isFlagged: pohData.isFlagged,
      lxp,
      "lxp-l": lxpL,
      lam
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Jalankan server
app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
