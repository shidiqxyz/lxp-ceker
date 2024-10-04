const express = require('express');
const { ethers } = require('ethers');
const axios = require('axios');
const cors = require('cors'); // Tambahkan CORS
require('dotenv').config(); // Tambahkan dotenv untuk menggunakan .env

// Setup Express.js
const app = express();
const port = 3000; // Port untuk API

// Tambahkan CORS middleware
app.use(cors());

// ABI untuk kontrak LXP
const tokenABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Provider untuk menghubungkan ke Linea Mainnet
const provider = new ethers.providers.JsonRpcProvider(`https://linea-mainnet.infura.io/v3/${process.env.API_KEY}`);

// Alamat kontrak token LXP
const tokenAddress = '0xd83af4fbD77f3AB65C3B1Dc4B38D7e67AEcf599A';

// Fungsi untuk mendapatkan balance token
async function getTokenBalance(walletAddress) {
  try {
    // Buat instance dari kontrak token
    const tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider);

    // Panggil fungsi balanceOf pada kontrak
    const balance = await tokenContract.balanceOf(walletAddress);

    // Convert balance dari wei ke token unit (asumsi token memiliki 18 desimal)
    const tokenBalance = ethers.utils.formatUnits(balance, 18);

    return tokenBalance;
  } catch (error) {
    console.error(`Error getting token balance: ${error}`);
    throw new Error('Unable to fetch token balance');
  }
}

// Fungsi untuk mendapatkan POH dan isFlagged dari API eksternal
async function getPohData(walletAddress) {
  try {
    const response = await axios.get(`https://linea-xp-poh-api.linea.build/poh/${walletAddress}`);
    return response.data; // Mengembalikan respon POH API
  } catch (error) {
    console.error(`Error fetching POH data: ${error}`);
    throw new Error('Unable to fetch POH data');
  }
}

// API endpoint
app.get('/', async (req, res) => {
  const walletAddress = req.query.address;

  if (!walletAddress) {
    return res.status(400).json({ error: 'Address parameter is required' });
  }

  try {
    // Ambil data LXP balance dan POH secara paralel
    const [tokenBalance, pohData] = await Promise.all([
      getTokenBalance(walletAddress),
      getPohData(walletAddress)
    ]);

    // Gabungkan data LXP dan POH ke dalam satu respons
    res.json({
      poh: pohData.poh,
      isFlagged: pohData.isFlagged,
      lxp: tokenBalance
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Jalankan server
app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
