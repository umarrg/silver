const { CloseDCAParams, DCA, Network } = require('@jup-ag/dca-sdk');
const { Connection, Keypair, PublicKey, sendAndConfirmTransaction } = require('@solana/web3.js');
require('dotenv').config();

const connection = new Connection(process.env.SOLANA_ENDPOINT, 'confirmed');
const dca = new DCA(connection, Network.MAINNET);
// const user = Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.USER_PRIVATE_KEY)));

// inAmount: (5_000_000),
// (86400),
async function createDCA(inputMint, outputMint, wallet, amount, duration, minAmount, maxAmount) {
    const params = {
        payer: wallet.publicKey,
        user: wallet.publicKey,
        inAmount: amount,
        inAmountPerCycle: amount,
        cycleSecondsApart: duration,
        inputMint: inputMint,
        outputMint: outputMint,
        minOutAmountPerCycle: minAmount,
        maxOutAmountPerCycle: maxAmount,
        startAt: null,
        userInTokenAccount: undefined,
    };

    const { tx, dcaPubKey } = await dca.createDcaV2(params);
    const txid = await sendAndConfirmTransaction(connection, tx, [user]);

    console.log('Create DCA: ', { txid });
    return dcaPubKey;
}

async function withdraw(dcaPubKey) {
    // const params = {
    //     user: user.publicKey,
    //     dca: dcaPubKey,
    //     inputMint: USDC,
    //     withdrawInAmount: (1_000_000),
    // };

    // const { tx } = await dca.withdraw(params);
    // const txid = await sendAndConfirmTransaction(connection, tx, [user]);

    // console.log('Withdraw: ', { txid });
}

async function closeDCA(dcaPubKey) {
    // const params = {
    //     user: user.publicKey,
    //     dca: dcaPubKey,
    // };

    // const { tx } = await dca.closeDCA(params);
    // const txid = await sendAndConfirmTransaction(connection, tx, [user]);

    // console.log('Close DCA: ', { txid });
}

async function getDCA(dcaPubKey) {
    // const dcaAccount = await dca.fetchDCA(dcaPubKey);
    // console.log('DCA Account Data: ', { dcaAccount });
    // return dcaAccount;
}

async function getCurrentDCAByUser() {
    // const dcaAccounts = await dca.getCurrentByUser(user.publicKey);
    // console.log({ dcaAccounts });
    // return dcaAccounts;
}

async function getBalances(dcaPubKey) {
    // const balances = await dca.getBalancesByAccount(dcaPubKey);
    // console.log({ balances });
    // return balances;
}

module.exports = {
    createDCA,
    withdraw,
    closeDCA,
    getDCA,
    getCurrentDCAByUser,
    getBalances
};
