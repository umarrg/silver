require('dotenv').config();
const { Keypair, Connection, PublicKey } = require('@solana/web3.js');
const { default: axios } = require('axios');
const { clusterApiUrl } = require("@solana/web3.js");


async function importWallet(secretKey) {
    try {
        const secretKeyUint8 = Uint8Array.from(secretKey.split(',').map(Number));
        const importedKeypair = Keypair.fromSecretKey(secretKeyUint8);
        return importedKeypair;
    } catch (error) {
        console.error("Error importing wallet:", error);
        throw error;
    }
}
async function generateWallet() {
    const keypair = Keypair.generate();
    return keypair;
}
async function getSolBalance(walletAddress) {
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / 1e9;
}

async function getSolPriceInUSD() {
    const apiKey = process.env.COINGECKO_KEY;
    const config = {

    };
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', config);
    return response.data.solana.usd;
}
async function getTokenMarketData(token) {
    const apiKey = process.env.COINGECKO_KEY;
    const config = {
        headers: {
            'x-cg-pro-api-key': `${apiKey}`
        }
    };
    try {
        const response = await axios.get(`https://pro-api.coingecko.com/api/v3/simple/token_price/solana?contract_addresses=${token}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`, config);

        const res = response.data[token];

        if (!res) {
            throw new Error('Token data not found');
        }

        console.log(">>>>", res);

        const marketData = {
            price: res.usd,
            marketCap: res.usd_market_cap,
            dailyVolume: res.usd_24h_vol,
            dailyChange: res.usd_24h_change
        };

        return marketData;
    } catch (error) {
        console.error('Error fetching token market data:', error);
        throw error;
    }
}
async function getOnChainData(token) {
    const config = {
        headers: {
            'token': `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjcmVhdGVkQXQiOjE3MTcxNDExOTQzMjksImVtYWlsIjoiZGV2ZWxvcG1lbnRAc2lsdmVyc29sYW5hLnN1cmYiLCJhY3Rpb24iOiJ0b2tlbi1hcGkiLCJpYXQiOjE3MTcxNDExOTR9.qS2APUlNxvAdrX6Vwskm1i_9QDjsuUDAjeskMIzJsKo`
        }
    };

    // Function to check if the input is a valid Solana address
    const isValidSolanaAddress = (token) => {
        return /^([A-HJ-NP-Za-km-z1-9]{32,44})$/.test(token);
    };

    try {
        let url;

        if (isValidSolanaAddress(token)) {
            url = `https://pro-api.solscan.io/v1.0/market/token/${token}?limit=10&offset=0`;
        } else {
            url = `https://pro-api.coingecko.com/api/v3/onchain/networks/solana/tokens?symbol=${token}`;

        }

        const response = await axios.get(url, config);
        const res = response.data;
        console.log(res)

        if (!res) {
            throw new Error('Token data not found');
        }
        const marketData = {
            price: res.priceUsdt,
            marketCap: res.markets[0].volume24h,
            name: res.markets[0].name,

        };
        return marketData;
    } catch (error) {
        // console.error('Error fetching token data:', error);
        throw error;
    }
}



module.exports = {
    generateWallet,
    getSolPriceInUSD,
    getSolBalance,
    importWallet,
    getTokenMarketData,
    getOnChainData
};