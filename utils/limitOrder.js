require('dotenv').config();

const { Connection, Keypair, PublicKey, VersionedTransaction } = require("@solana/web3.js");
const fetch = require("cross-fetch");
const bs58 = require("bs58");

const connection = new Connection(process.env.SOLANA_ENDPOINT, 'confirmed');



const createLimitOrder = async (owner, inputToken, outputToken, inAmount, outAmount, expiry) => {
    const base = Keypair.generate();

    try {
        const response = await fetch('https://jup.ag/api/limit/v1/createOrder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                owner: owner.publicKey.toString(),
                inAmount: inAmount,
                outAmount: outAmount,
                inputMint: inputToken,
                outputMint: outputToken,
                expiredAt: null,
                base: base.publicKey.toString(),
                referralAccount: "2zR5UXmFqxG2UE4WNJBtiCsvur3E1FpYLmRV1N6om6bh",
                referralName: "SilverSurferSolana"
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const transactions = await response.json();
        console.log('API Response:', transactions);

        const { tx } = transactions;

        if (!tx) {
            throw new Error('Transaction data is missing in the response');
        }

        const transactionBuf = Buffer.from(tx, "base64");
        const transaction = VersionedTransaction.deserialize(transactionBuf);

        transaction.sign([owner, base]);

        const rawTransaction = transaction.serialize();
        const txid = await connection.sendRawTransaction(rawTransaction, {
            skipPreflight: true,
            maxRetries: 2,
        });

        await connection.confirmTransaction(txid);

        console.log(`Transaction ID: https://solscan.io/tx/${txid}`);

        return { txid, orderPubKey: base.publicKey.toString() };
    } catch (error) {
        console.error('Error creating limit order:', error);
        throw error;
    }
};


module.exports = {

    createLimitOrder,

};
