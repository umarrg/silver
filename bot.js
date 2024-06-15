const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();
const cors = require("cors");
const app = express();
app.use(express.json());
const web3 = require('@solana/web3.js');
app.use(express.urlencoded({ extended: true, }));
app.use(cors());
require("./connections/connection.mongo")();
const { generateWallet, importWallet, getSolBalance, getSolPriceInUSD, getTokenMarketData, getOnChainData } = require('./config');
const { getUserById, addNewUser, getAllUsers } = require('./dao/user');
const { addNewWallet, getWalletbyUser, getAllUserWallet } = require('./dao/wallet');
const { default: axios } = require('axios');
const { addNewTrade, getTradeByUser, updateTradesForUser, updateTradeForUser, deleteTradeForUser, activateTradeForUser } = require('./dao/trade');
const { Connection, Keypair, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const { addNewTransaction, getTransactionByUser } = require('./dao/transaction');
const { helpCommand } = require('./commands/help');
const { ReferralCommand } = require('./commands/referrals');
const { createDCA } = require('./utils/dcaOrders');
const { BN } = require('bn.js');
const { createLimitOrder } = require('./utils/limitOrder');
const { startCopyTrading } = require('./utils/copyTrading');
const { getDcaByUser, addNewDca } = require('./dao/dca');
const { getLodByUser, addNewLod } = require('./dao/lod');
const bot = new TelegramBot(process.env.TOKEN, { polling: true });
const connection = new Connection(process.env.SOLANA_ENDPOINT, 'confirmed');
const PORT = process.env.PORT || 4000;

const commands = [
    { command: '/start', description: 'Open Control Panel' },
    { command: '/sell', description: 'Sell token' },
    { command: '/buy', description: 'Buy token' },
    { command: '/positions', description: 'View detail information about your holdings' },
    { command: '/settings', description: 'Configure your settings' },
    { command: '/burn', description: 'Burn unwanted token to claim sol' },
    { command: '/withdraw', description: 'Withdraw token sol or eth' },
    { command: '/help', description: 'Faq and telegram channel' },
    { command: '/backup', description: 'Backup bots incase of laq or issues' },


];

bot.setMyCommands(commands);



bot.onText(/\/start/, async (msg, match) => {
    let user = await getUserById(msg.chat.id);
    if (!user?._id) {
        let newuser = await addNewUser({ chatId: msg.chat.id });
        user = newuser._id;
        let wallet = await generateWallet();
        let res = await addNewWallet({ address: wallet?.publicKey.toString(), privateKey: wallet?.secretKey.toString(), user: newuser._id, name: "sol" });

    }
    const wallets = await getWalletbyUser(user._id);
    if (wallets && wallets.length > 0) {
        let account = wallets[0].address;

        try {
            const solBalance = await getSolBalance(account);
            const solPriceInUSD = await getSolPriceInUSD();
            const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);
            let content = `🌟 Welcome to the Silver Sniper Bot! 🚀 \n\nEmbark on your trading journey with the fastest and most reliable trading bot in the galaxy, powered by the native Silver Surfer Solana token. Experience lightning-fast transactions that let you beat anyone to the trade, ensuring you never miss a golden opportunity.\n\n🔗 Dive into the action and learn more at www.silversolana.surf.\n\n🌌 Join us and dominate the markets with unmatched speed and efficiency! 🏄‍♂️\n\n<b>Solana</b>\n<code>${account}</code> (Tap to copy)\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code>\n\nClick on the Refresh button to update your current balance.\n\n`;

            await bot.sendMessage(msg.chat.id, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [{ text: 'Buy', callback_data: 'buy' }, { text: 'Buy $SSS', callback_data: 'buy_$SSS' }, { text: 'Sell', callback_data: 'sell' }],
                        [{ text: 'Positions', callback_data: 'positions' }, { text: 'Limit Orders', callback_data: 'limit_orders' }, { text: 'DCA Orders', callback_data: 'dca_orders' }],
                        [{ text: 'Copy Trade', callback_data: 'copy_trade' }, { text: 'LP Sniper', callback_data: 'lp_sniper' }],
                        [{ text: 'New Pairs', callback_data: 'new_pairs' }, { text: ' 💰 Referrals', callback_data: 'referrals' }, { text: 'Settings', callback_data: 'settings' }],
                        [{ text: 'Bridge', callback_data: 'bridge' }, { text: 'Withdraw', callback_data: 'withdraw' }],
                        [{ text: 'Help', callback_data: 'help' }, { text: 'Refresh', callback_data: 'refresh' }]
                    ]
                }
            });
        } catch (error) {
            console.error('Error fetching balance:', error);
            bot.sendMessage(msg.chat.id, 'Sorry, there was an error fetching your balance. Please try again later.');
        }
    } else {
        bot.sendMessage(msg.chat.id, 'No wallets found for this user. Please generate or import a wallet.');
    }
});


bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    helpCommand(bot, chatId);
});
let userInput = {
    amount: 0.5,
    slippage: 15,
    token: "",
    from: "",
};
const userSetups = {};

let orderData = {};
let myObj = {};
const userHistory = {};
let userSettings = {};

bot.on('callback_query', async (callbackQuery) => {

    const { data, message } = callbackQuery;
    let user = await getUserById(message.chat.id);
    const chatId = message.chat.id;
    const username = message.chat.username;
    const messageId = message.message_id;

    if (!userSetups[chatId]) {
        userSetups[chatId] = {
            tag: '',
            targetWallet: '',
            buyPercentage: '100%',
            copySells: '✅ yes',
            buyGas: '0.0015 SOL',
            sellGas: '0.0015 SOL',
            slippage: '15%'
        };
    }

    const copyTradeSetup = userSetups[chatId];
    if (data === 'close_b') {
        await handleBackButton(chatId);
    } else if (data === "copy_trade") {
        pushToHistory(chatId, message.text, message.reply_markup.inline_keyboard);

        const trades = await getTradeByUser(user._id);
        const tradeContent = trades.map(trade => {
            return `${trade.copy ? '🟢' : '🟠'} ${trade.tag} <a href="https://solscan.io/account/${trade.wallet}">${trade.wallet}</a>`;
        }).join('\n');

        let content = `<b>Copy Trade</b> \n \n Copy Trade allows you to copy the buys and sells of any target wallet. \n 🟢 Indicates a copy trade setup is active. \n 🟠 Indicates a copy trade setup is paused.\n\n${tradeContent || 'You do not have any copy trades setup yet. Click on the New button to create one!'}`;
        bot.sendMessage(chatId, content, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➕ New', callback_data: 'new' },
                    ],
                    [

                        { text: 'Pause All', callback_data: 'pauseTrade' }
                    ],

                    [
                        { text: '⬅ Back', callback_data: 'close_b' }
                    ],
                ]
            }
        });
    } else if (data === "new") {
        sendCopyTradeSetupMessage(chatId, copyTradeSetup);

    } else if (data === 'tag') {
        bot.sendMessage(chatId, 'Enter a custom name for this copy trade setup:');
        bot.once('message', (msg) => {
            copyTradeSetup.tag = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'target_wallet') {
        bot.sendMessage(chatId, 'Enter the target wallet address to copy trade:');
        bot.once('message', (msg) => {
            copyTradeSetup.targetWallet = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'buy_percentage') {
        bot.sendMessage(chatId, 'Enter the percentage of the target\'s buy amount to copy trade with. E.g. with 50%, if the target buys with 1 SOL, you will buy with 0.5 SOL. If you want to buy with a fixed SOL amount instead, enter a number. E.g. 0.1 SOL will buy with 0.1 SOL regardless of the target\'s buy amount.');
        bot.once('message', (msg) => {
            copyTradeSetup.buyPercentage = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'buy_gas') {
        bot.sendMessage(chatId, 'Enter the priority fee to pay for buy trades. E.g 0.01 for 0.01 SOL:');
        bot.once('message', (msg) => {
            copyTradeSetup.buyGas = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'sell_gas') {
        bot.sendMessage(chatId, 'Enter the priority fee to pay for sell trades. E.g 0.01 for 0.01 SOL:');
        bot.once('message', (msg) => {
            copyTradeSetup.sellGas = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'slippage') {
        bot.sendMessage(chatId, 'Enter slippage % to use on copy trades:');
        bot.once('message', (msg) => {
            copyTradeSetup.slippage = msg.text;
            sendCopyTradeSetupMessage(chatId, copyTradeSetup);
        });
    } else if (data === 'copy_sell') {
        copyTradeSetup.copySells = copyTradeSetup.copySells === '✅ yes' ? '❌ no' : '✅ yes';
        sendCopyTradeSetupMessage(chatId, copyTradeSetup);
    } else if (data === "confirmss_trade") {
        await addNewTrade({ wallet: copyTradeSetup.targetWallet, tag: copyTradeSetup.tag, user: user._id, copy: true });
        const trades = await getTradeByUser(user._id);
        const tradeContent = trades.map(trade => {
            return `${trade.copy ? '🟢' : '🟠'} ${trade.tag} <a href="https://solscan.io/account/${trade.wallet}">_${trade.wallet}</a>`;
        }).join('\n');

        let message = `<b>Copy Trade</b> \n \n Copy Trade allows you to copy the buys and sells of any target wallet. \n 🟢 Indicates a copy trade setup is active. \n 🟠 Indicates a copy trade setup is paused.\n\n${tradeContent || 'You do not have any copy trades setup yet. Click on the New button to create one!'}`;
        bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: '➕ New', callback_data: 'new' },
                    ],
                    [
                        { text: 'Pause All', callback_data: 'pause' }
                    ],
                    [
                        { text: '⬅️ Back', callback_data: 'close_b' }
                    ],
                ]
            }
        });

    } else if (data === 'pauseTrade') {
        updateTradesForUser(user._id)
    } else if (data === 'close') {
        await bot.deleteMessage(message.chat.id, message.message_id);
    } else if (data === 'help') {
        await helpCommand(bot, chatId)
    } else if (data === 'referrals') {
        await ReferralCommand(bot, chatId, username)
    } else if (data === 'buy') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?.id);
        if (wallets?.length > 0) {

            async function getToken() {
                let listenerReply;

                let contentMessage = await bot.sendMessage(chatId, "Enter a token symbol or address to buy", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });
                listenerReply = async (replyHandler) => {
                    bot.removeReplyListener(listenerReply);
                    userInput.token = replyHandler.text;
                    myObj['token'] = replyHandler.text;
                    const tokenData = await getTokenData(myObj['token']);

                    if (tokenData) {

                        if (tokenData.address) {

                            const { price, marketCap, dailyVolume, dailyChange } = await getOnChainData(tokenData.address);
                            if (price) {
                                myObj['price'] = price;
                                myObj['symbol'] = tokenData.symbol;
                                myObj['marketCap'] = marketCap;
                                myObj['name'] = tokenData.name;
                                // const { priceUsd, name, address, symbol, marketCapUsd, liquidityUsd, } = coinGeckoData;
                                const wallets = await getWalletbyUser(user._id);
                                let account = wallets[0].address;

                                const solBalance = await getSolBalance(account);
                                const solPriceInUSD = await getSolPriceInUSD();
                                const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);
                                let content = `Buy <a href='{symbol}'><b>${tokenData.symbol}</b></a> — (${tokenData.name}) 📈\n<code>${tokenData.address}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${price}</b>> — MC: <b>$${marketCap}</b>`
                                sentMessage = await bot.sendMessage(chatId,
                                    content,

                                    {
                                        "parse_mode": "HTML",
                                        reply_markup: {
                                            inline_keyboard: [
                                                [
                                                    { text: '← Back', callback_data: 'backs' },
                                                    { text: '↻ Refresh', callback_data: 'refresh' },
                                                ],
                                                [

                                                    { text: '✅ Swap', callback_data: 'swap' },
                                                    { text: 'Limit', callback_data: 'limit' },
                                                    { text: 'DCA', callback_data: 'dca' },
                                                ],
                                                [
                                                    { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                                                    { text: '1 SOL', callback_data: 'amount_1' },
                                                    { text: '3 SOL', callback_data: 'amount_3' },
                                                ],
                                                [
                                                    { text: '5 SOL', callback_data: 'amount_5' },
                                                    { text: '10 SOL', callback_data: 'amount_10' },
                                                    { text: 'X SOL', callback_data: 'amount_custom' },
                                                ],
                                                [
                                                    { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                                                    { text: 'X Slippage', callback_data: 'slippage_custom' },
                                                ],
                                                [
                                                    { text: 'Buy', callback_data: 'confirm_buy' },
                                                ],
                                            ],
                                        }
                                    }
                                )
                            } else {
                                bot.sendMessage(chatId, `Could not fetch the price for ${tokenData.name} (${tokenData.symbol}).`);
                            }
                        } else {
                            bot.sendMessage(chatId, `No CoinGecko ID found for ${tokenData.name} (${tokenData.symbol}).`);
                        }
                    } else {
                        bot.sendMessage(chatId, `Token not found.`);
                    }
                };

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, listenerReply);
            }

            getToken();
        } else {
            bot.sendMessage(chatId, "Generate Or Import Wallet");
        }
    } else if (data === 'buy_$SSS') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?.id);
        if (wallets?.length > 0) {

            async function getToken() {

                userInput.token = "4V2Yvav9XF5gP4HmZBWwFDS6RFXeHydzMdr8DuqMKWLg";
                myObj['token'] = "4V2Yvav9XF5gP4HmZBWwFDS6RFXeHydzMdr8DuqMKWLg";
                const tokenData = await getTokenData("4V2Yvav9XF5gP4HmZBWwFDS6RFXeHydzMdr8DuqMKWLg");

                if (tokenData) {

                    if (tokenData.address) {

                        const { price, marketCap, dailyVolume, dailyChange } = await getOnChainData(tokenData.address);
                        if (price) {
                            myObj['price'] = price;
                            myObj['symbol'] = tokenData.symbol;
                            myObj['marketCap'] = marketCap;
                            myObj['name'] = tokenData.name;
                            // const { priceUsd, name, address, symbol, marketCapUsd, liquidityUsd, } = coinGeckoData;
                            const wallets = await getWalletbyUser(user._id);
                            let account = wallets[0].address;

                            const solBalance = await getSolBalance(account);
                            const solPriceInUSD = await getSolPriceInUSD();
                            const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);
                            let content = `Buy <a href='{symbol}'><b>${tokenData.symbol}</b></a> — (${tokenData.name}) 📈\n<code>${tokenData.address}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${price}</b>> — MC: <b>$${marketCap}</b>`
                            sentMessage = await bot.sendMessage(chatId,
                                content,

                                {
                                    "parse_mode": "HTML",
                                    reply_markup: {
                                        inline_keyboard: [
                                            [
                                                { text: '← Back', callback_data: 'backs' },
                                                { text: '↻ Refresh', callback_data: 'refresh' },
                                            ],
                                            [

                                                { text: '✅ Swap', callback_data: 'swap' },
                                                { text: 'Limit', callback_data: 'limit' },
                                                { text: 'DCA', callback_data: 'dca' },
                                            ],
                                            [
                                                { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                                                { text: '1 SOL', callback_data: 'amount_1' },
                                                { text: '3 SOL', callback_data: 'amount_3' },
                                            ],
                                            [
                                                { text: '5 SOL', callback_data: 'amount_5' },
                                                { text: '10 SOL', callback_data: 'amount_10' },
                                                { text: 'X SOL', callback_data: 'amount_custom' },
                                            ],
                                            [
                                                { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                                                { text: 'X Slippage', callback_data: 'slippage_custom' },
                                            ],
                                            [
                                                { text: 'Buy', callback_data: 'confirm_buy' },
                                            ],
                                        ],
                                    }
                                }
                            )
                        } else {
                            bot.sendMessage(chatId, `Could not fetch the price for ${tokenData.name} (${tokenData.symbol}).`);
                        }
                    } else {
                        bot.sendMessage(chatId, `No CoinGecko ID found for ${tokenData.name} (${tokenData.symbol}).`);
                    }
                } else {
                    bot.sendMessage(chatId, `Token not found.`);
                }
            };



            getToken();
        } else {
            bot.sendMessage(chatId, "Generate Or Import Wallet");
        }
    }
    else if (data.startsWith('amount_')) {
        const amount = data.split('_')[1];
        if (amount === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the amount of SOL you want to buy", {
                "reply_markup": {
                    "force_reply": true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.amount = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom amount set to ${userInput.amount} SOL`);
            });
        } else {
            userInput.amount = parseFloat(amount);
            bot.sendMessage(chatId, `✅ Amount set to ${userInput.amount} SOL`);
        }
    } else if (data.startsWith('slippage_')) {
        const slippage = data.split('_')[1];
        if (slippage === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the slippage percentage you want to set", {
                "reply_markup": {
                    "force_reply": true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.slippage = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom slippage set to ${userInput.slippage}%`);
            });
        } else {
            userInput.slippage = parseFloat(slippage);
            bot.sendMessage(chatId, `✅ Slippage set to ${userInput.slippage}%`);
        }
    } else if (data === 'confirm_buy') {
        if (!userInput.token || !userInput.amount || !userInput.slippage) {
            bot.sendMessage(chatId, "Please ensure you have selected a token, amount, and slippage.");
            return;
        }

        const tokenData = await getTokenData(userInput.token);
        const wallets = await getWalletbyUser(user._id);
        let account = wallets[0].privateKey;
        const secretKeyUint8 = Uint8Array.from(account.split(',').map(Number));
        const wallet = Keypair.fromSecretKey(secretKeyUint8);
        const inputMint = 'So11111111111111111111111111111111111111112';
        const outputMint = tokenData.address;
        const amount = Math.round(userInput.amount * 1e9);
        const slippageBps = userInput.slippage * 100;
        const processingMessage = await bot.sendMessage(chatId, "Processing...◌");

        try {

            const quoteResponse = await (await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`)).json();
            console.log(quoteResponse);
            const { swapTransaction } = await (await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteResponse,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true
                })
            })).json();
            const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');

            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

            transaction.sign([wallet]);

            const rawTransaction = transaction.serialize();
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 2
            });
            await connection.confirmTransaction(txid);
            bot.sendMessage(chatId, `Traansaction successfully! Transaction ID: https://solscan.io/tx/${txid}`);

            await bot.deleteMessage(chatId, processingMessage.message_id);

            await addNewTransaction({ fromAsset: inputMint, toAsset: outputMint, amount: amount, user: user._id, status: "success", type: "buy", from: "sol", to: tokenData?.symbol })
        } catch (error) {
            bot.sendMessage(chatId, `Transaction Failed ${error}`, {
                parse_mode: "HTML"
            });
            bot.deleteMessage(chatId, processingMessage.message_id);

        }
    } else if (data === 'sell') {
        await handleSellCommand(chatId, data);
    } else if (data.startsWith('transaction_')) {
        await handleInlineButtonClick(chatId, data);
    } else if (data === 'confirm_sell') {

        if (!userInput.token || !userInput.amount || !userInput.slippage) {
            bot.sendMessage(chatId, "Please ensure you have selected a token, amount, and slippage.");
            return;
        }

        const tokenData = await getTokenData(userInput.token);
        const wallets = await getWalletbyUser(user._id);
        let account = wallets[0].privateKey;
        const secretKeyUint8 = Uint8Array.from(account.split(',').map(Number));
        const wallet = Keypair.fromSecretKey(secretKeyUint8);
        const inputMint = userInput.address;
        const outputMint = 'So11111111111111111111111111111111111111112';
        const amount = Math.round(userInput.amount * 1e9);
        const slippageBps = userInput.slippage * 100;
        const processingMessage = await bot.sendMessage(chatId, "Processing...◌");

        try {
            const quoteResponse = await (await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`)).json();
            console.log("dddd>>>", quoteResponse);
            const { swapTransaction } = await (await fetch('https://quote-api.jup.ag/v6/swap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    quoteResponse,
                    userPublicKey: wallet.publicKey.toString(),
                    wrapAndUnwrapSol: true
                })
            })).json();
            console.log("quoteResponse", quoteResponse);
            const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
            transaction.sign([wallet]);
            const rawTransaction = transaction.serialize();
            const txid = await connection.sendRawTransaction(rawTransaction, {
                skipPreflight: true,
                maxRetries: 2
            });
            await connection.confirmTransaction(txid);

            bot.sendMessage(chatId, `Transaction successful! Transaction ID: https://solscan.io/tx/${txid}`);
            await addNewTransaction({ fromAsset: inputMint, toAsset: outputMint, amount: amount, user: user._id, status: "success", type: "sell", from: "sol", to: tokenData?.symbol });
            await bot.deleteMessage(chatId, processingMessage.message_id);

        } catch (error) {
            bot.sendMessage(chatId, `Transaction Failed: ${error}`);
        }
    } else if (data.startsWith('amountx_')) {
        const amount = data.split('_')[1];
        if (amount === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, `Enter the amount you want to sell`, {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.amount = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom amount set to ${userInput.amount} `);
            });
        } else {
            userInput.amount = parseFloat(amount);
            bot.sendMessage(chatId, `✅ Amount set to ${userInput.amount} `);
        }
    } else if (data === 'withdraw') {
        let user = await getUserById(chatId);
        const wallets = await getWalletbyUser(user?._id);

        if (wallets?.length > 0) {
            const myObj = {};

            async function getToken() {
                const contentMessage = await bot.sendMessage(chatId, "Enter the wallet address", {
                    "reply_markup": {
                        "force_reply": true
                    }
                });

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, async (replyHandler) => {
                    myObj['address'] = replyHandler.text;

                    try {
                        new web3.PublicKey(myObj['address']);
                        await getAmount();
                    } catch (error) {
                        bot.sendMessage(chatId, 'Invalid address. Please check the address and try again.');
                    }



                });
            }

            async function getAmount() {
                const contentMessage = await bot.sendMessage(chatId, 'How much do you want to withdraw?', {
                    "reply_markup": {
                        "force_reply": true
                    }
                });

                bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, async (replyHandler) => {
                    myObj['amount'] = parseFloat(replyHandler.text);

                    if (isNaN(myObj['amount']) || myObj['amount'] <= 0) {
                        bot.sendMessage(chatId, 'Invalid amount. Please enter a positive number.');
                        return;
                    }

                    const solBalance = await getSolBalance(wallets[0].address);

                    if (myObj['amount'] > solBalance) {
                        bot.sendMessage(chatId, `Insufficient balance. Your current balance is ${solBalance} SOL.`);
                        return;
                    }

                    await processTransaction();
                });
            }

            async function processTransaction() {
                const fromAccount = wallets[0];
                const lamports = myObj['amount'] * web3.LAMPORTS_PER_SOL;

                const transaction = new web3.Transaction().add(
                    web3.SystemProgram.transfer({
                        fromPubkey: new web3.PublicKey(fromAccount.address),
                        toPubkey: new web3.PublicKey(myObj['address']),
                        lamports: lamports,
                    })
                );
                const secretKeyUint8 = Uint8Array.from(fromAccount.privateKey.split(',').map(Number));
                const fromKeypair = Keypair.fromSecretKey(secretKeyUint8);

                try {
                    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
                    const transactionUrl = `https://solscan.io/tx/${signature}`;
                    bot.sendMessage(chatId, `Transaction successful! <a href="${transactionUrl}">view transaction</a>`, { parse_mode: 'HTML' });
                } catch (error) {
                    console.error('Transaction error:', error);
                    bot.sendMessage(chatId, 'Sorry, there was an error processing your transaction. Please try again later.');
                }
            }

            await getToken();
        } else {
            bot.sendMessage(chatId, 'No wallets found for this user. Please generate or import a wallet.');
        }
    } else if (data === 'limit') {

        await bot.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    { text: '← Back', callback_data: 'backs' },
                    { text: '↻ Refresh', callback_data: 'refresh' },
                ],
                [
                    { text: 'Swap', callback_data: 'swap' },
                    { text: '✅ Limit', callback_data: 'limit' },
                    { text: 'DCA', callback_data: 'dca' },
                ],
                [
                    { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                    { text: '1 SOL', callback_data: 'amount_1' },
                    { text: '3 SOL', callback_data: 'amount_3' },
                ],
                [
                    { text: '5 SOL', callback_data: 'amount_5' },
                    { text: '10 SOL', callback_data: 'amount_10' },
                    { text: 'X SOL', callback_data: 'amount_custom' },
                ],
                [
                    { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                    { text: 'X Slippage', callback_data: 'slippage_custom' },
                ],
                [{ text: 'Trigger Price: $-', callback_data: 'trigger-price' }],
                [{ text: 'Expiry: 1.00d', callback_data: 'expiry' }],
                [{ text: 'CREATE ORDER', callback_data: 'create-order' }],
            ]
        }, { chat_id: chatId, message_id: messageId });
    } else if (data === 'trigger-price') {
        let triggerPriceMessage = await bot.sendMessage(chatId, "Enter the trigger price of your limit buy order. Valid options are % change (e.g. -5% or 5%) or a specific price or market cap (e.g. 5.5M mc or 15000 mcap).", {
            reply_markup: {
                force_reply: true
            }
        });

        bot.onReplyToMessage(chatId, triggerPriceMessage.message_id, async (reply) => {
            orderData.triggerPrice = reply.text;
            let content = `Buy <a href='{symbol}'><b>${myObj.symbol}</b></a> — (${myObj.name}) 📈\n<code>${myObj.token}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${myObj.price}</b> — MC: <b>$${myObj.marketCap}</b>`;
            await bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: '↻ Refresh', callback_data: 'refresh' },
                        ],
                        [
                            { text: 'Swap', callback_data: 'swap' },
                            { text: '✅ Limit', callback_data: 'limit' },
                            { text: 'DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                            { text: '1 SOL', callback_data: 'amount_1' },
                            { text: '3 SOL', callback_data: 'amount_3' },
                        ],
                        [
                            { text: '5 SOL', callback_data: 'amount_5' },
                            { text: '10 SOL', callback_data: 'amount_10' },
                            { text: 'X SOL', callback_data: 'amount_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [{ text: `Trigger Price: $${orderData.triggerPrice}`, callback_data: 'trigger-price' }],
                        [{ text: 'Expiry: 1.00d', callback_data: 'expiry' }],
                        [{ text: 'CREATE ORDER', callback_data: 'create-order' }],
                    ]
                }
            },);
        });
    } else if (data === 'expiry') {
        let expiryMessage = await bot.sendMessage(chatId, "Enter the expiry of your limit buy order. Valid options are s (seconds), m (minutes), h (hours), and d (days). E.g. 30m or 2h.", {
            reply_markup: {
                force_reply: true
            }
        });

        bot.onReplyToMessage(chatId, expiryMessage.message_id, async (reply) => {
            orderData.expiry = reply.text;
            let content = `Buy <a href='{symbol}'><b>${myObj.symbol}</b></a> — (${myObj.name}) 📈\n<code>${myObj.token}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${myObj.price}</b> — MC: <b>$${myObj.marketCap}</b>`;
            await bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: '↻ Refresh', callback_data: 'refresh' },
                        ],
                        [
                            { text: 'Swap', callback_data: 'swap' },
                            { text: '✅ Limit', callback_data: 'limit' },
                            { text: 'DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                            { text: '1 SOL', callback_data: 'amount_1' },
                            { text: '3 SOL', callback_data: 'amount_3' },
                        ],
                        [
                            { text: '5 SOL', callback_data: 'amount_5' },
                            { text: '10 SOL', callback_data: 'amount_10' },
                            { text: 'X SOL', callback_data: 'amount_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [{ text: `Trigger Price: $${orderData.triggerPrice || '-'}`, callback_data: 'trigger-price' }],
                        [{ text: `Expiry: ${orderData.expiry || '1.00d'}`, callback_data: 'expiry' }],
                        [{ text: 'CREATE ORDER', callback_data: 'create-order' }],
                    ]
                }
            });
        });
    } else if (data === 'create-order') {
        if (orderData.triggerPrice && orderData.expiry) {
            const wallets = await getWalletbyUser(user._id);
            let account = wallets[0].privateKey;
            const secretKeyUint8 = Uint8Array.from(account.split(',').map(Number));
            const wallet = Keypair.fromSecretKey(secretKeyUint8);
            const inputToken = userInput.address;
            const outputToken = 'So11111111111111111111111111111111111111112';
            const amount = userInput.amount;
            const expiry = orderData.expiry || null;
            try {
                const res = await createLimitOrder(wallet, inputToken, outputToken, amount, amount, expiry)
            } catch (error) {
                console.log(error)

            }
            let publickey = res.orderPubKey;
            await addNewLod({ triggerPrice: orderData.triggerPrice, expiry: orderData.expiry, amount: userInput.amount, user: user._id })
            const content = `Order Created `
            bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: 'View Limit Orders', callback_data: 'limit_orders' },
                        ],
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, 'Please set both trigger price and expiry before creating the order.');
        }

    } else if (data === 'dca') {

        await bot.editMessageReplyMarkup({
            inline_keyboard: [
                [
                    { text: '← Back', callback_data: 'backs' },
                    { text: '↻ Refresh', callback_data: 'refresh' },
                ],
                [
                    { text: 'Swap', callback_data: 'swap' },
                    { text: 'Limit', callback_data: 'limit' },
                    { text: '✅ DCA', callback_data: 'dca' },
                ],
                [
                    { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                    { text: '1 SOL', callback_data: 'amount_1' },
                    { text: '3 SOL', callback_data: 'amount_3' },
                ],
                [
                    { text: '5 SOL', callback_data: 'amount_5' },
                    { text: '10 SOL', callback_data: 'amount_10' },
                    { text: 'X SOL', callback_data: 'amount_custom' },
                ],
                [
                    { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                    { text: 'X Slippage', callback_data: 'slippage_custom' },
                ],
                [{ text: 'Interval: $-', callback_data: 'interval' }, { text: 'Duration: $-', callback_data: 'duration' }],
                [{ text: 'Min Price: $-', callback_data: 'min-price' }, { text: 'Max Price: $-', callback_data: 'max-price' }],
                [{ text: 'CREATE ORDER', callback_data: 'create-dca-order' }],
            ]
        }, { chat_id: chatId, message_id: messageId });
    } else if (data === 'interval') {
        let triggerPriceMessage = await bot.sendMessage(chatId, "Enter the interval at which to buy the token. Valid options are m (minutes), h (hours), and d (days). E.g. 30m or 2h.", {
            reply_markup: {
                force_reply: true
            }
        });

        bot.onReplyToMessage(chatId, triggerPriceMessage.message_id, async (reply) => {
            orderData.interval = reply.text;

            let content = `Buy <a href='{symbol}'><b>${myObj.symbol}</b></a> — (${myObj.name}) 📈\n<code>${myObj.token}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${myObj.price}</b> — MC: <b>$${myObj.marketCap}</b>`;

            await bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: '↻ Refresh', callback_data: 'refresh' },
                        ],
                        [
                            { text: 'Swap', callback_data: 'swap' },
                            { text: 'Limit', callback_data: 'limit' },
                            { text: '✅ DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                            { text: '1 SOL', callback_data: 'amount_1' },
                            { text: '3 SOL', callback_data: 'amount_3' },
                        ],
                        [
                            { text: '5 SOL', callback_data: 'amount_5' },
                            { text: '10 SOL', callback_data: 'amount_10' },
                            { text: 'X SOL', callback_data: 'amount_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [
                            { text: `Interval: ${orderData.interval || '-'}`, callback_data: 'interval' },
                            { text: `Duration: ${orderData.duration || '-'}`, callback_data: 'duration' },
                        ],
                        [
                            { text: `Min Price: ${orderData.minPrice || '-'}`, callback_data: 'min-price' },
                            { text: `Max Price: ${orderData.maxPrice || '-'}`, callback_data: 'max-price' },
                        ],
                        [{ text: 'CREATE ORDER', callback_data: 'create-dca-order' }],
                    ]
                }
            });
        });

    } else if (data === 'duration') {
        let durationMessage = await bot.sendMessage(chatId, "Enter the duration of the DCA plan (buy). Valid options are m (minutes), h (hours), and d (days). E.g. 4h or 7d.", {
            reply_markup: {
                force_reply: true
            }
        });

        bot.onReplyToMessage(chatId, durationMessage.message_id, async (reply) => {
            orderData.duration = reply.text;

            let content = `Buy <a href='{symbol}'><b>${myObj.symbol}</b></a> — (${myObj.name}) 📈\n<code>${myObj.token}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${myObj.price}</b> — MC: <b>$${myObj.marketCap}</b>`;

            await bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: '↻ Refresh', callback_data: 'refresh' },
                        ],
                        [
                            { text: 'Swap', callback_data: 'swap' },
                            { text: 'Limit', callback_data: 'limit' },
                            { text: '✅ DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                            { text: '1 SOL', callback_data: 'amount_1' },
                            { text: '3 SOL', callback_data: 'amount_3' },
                        ],
                        [
                            { text: '5 SOL', callback_data: 'amount_5' },
                            { text: '10 SOL', callback_data: 'amount_10' },
                            { text: 'X SOL', callback_data: 'amount_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [
                            { text: `Interval: ${orderData.interval || '-'}`, callback_data: 'interval' },
                            { text: `Duration: ${orderData.duration || '-'}`, callback_data: 'duration' },
                        ],
                        [
                            { text: `Min Price: ${orderData.minPrice || '-'}`, callback_data: 'min-price' },
                            { text: `Max Price: ${orderData.maxPrice || '-'}`, callback_data: 'max-price' },
                        ],
                        [{ text: 'CREATE ORDER', callback_data: 'create-dca-order' }],
                    ]
                }
            });
        });
    } else if (data === 'min-price') {
        let minPriceMessage = await bot.sendMessage(chatId, "Enter the minimum price threshold at which to buy the token. Valid options are % of current price (e.g. -5% or 5%) or a specific price or market cap (e.g. 5.5M mc or 15000 mcap).", {
            reply_markup: {
                force_reply: true
            }
        });
        bot.onReplyToMessage(chatId, minPriceMessage.message_id, async (reply) => {
            orderData.minPrice = reply.text;

            let content = `Buy <a href='{symbol}'><b>${myObj.symbol}</b></a> — (${myObj.name}) 📈\n<code>${myObj.token}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${myObj.price}</b> — MC: <b>$${myObj.marketCap}</b>`;

            await bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: '↻ Refresh', callback_data: 'refresh' },
                        ],
                        [
                            { text: 'Swap', callback_data: 'swap' },
                            { text: 'Limit', callback_data: 'limit' },
                            { text: '✅ DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                            { text: '1 SOL', callback_data: 'amount_1' },
                            { text: '3 SOL', callback_data: 'amount_3' },
                        ],
                        [
                            { text: '5 SOL', callback_data: 'amount_5' },
                            { text: '10 SOL', callback_data: 'amount_10' },
                            { text: 'X SOL', callback_data: 'amount_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [
                            { text: `Interval: ${orderData.interval || '-'}`, callback_data: 'interval' },
                            { text: `Duration: ${orderData.duration || '-'}`, callback_data: 'duration' },
                        ],
                        [
                            { text: `Min Price: ${orderData.minPrice || '-'}`, callback_data: 'min-price' },
                            { text: `Max Price: ${orderData.maxPrice || '-'}`, callback_data: 'max-price' },
                        ],
                        [{ text: 'CREATE ORDER', callback_data: 'create-dca-order' }],
                    ]
                }
            });
        });
    } else if (data === 'lp_sniper') {
        bot.sendMessage(chatId, 'Sniper just released in early access, and is available for selected users.');
    }
    else if (data === 'max-price') {
        let maxPriceMessage = await bot.sendMessage(chatId, "Enter the minimum price threshold at which to buy the token. Valid options are % of current price (e.g. -5% or 5%) or a specific price or market cap (e.g. 5.5M mc or 15000 mcap).", {
            reply_markup: {
                force_reply: true
            }
        });
        bot.onReplyToMessage(chatId, maxPriceMessage.message_id, async (reply) => {
            orderData.maxPrice = reply.text;

            let content = `Buy <a href='{symbol}'><b>${myObj.symbol}</b></a> — (${myObj.name}) 📈\n<code>${myObj.token}</code>\n\nBalance: ░░░░░░\nPrice: <b>$${myObj.price}</b> — MC: <b>$${myObj.marketCap}</b>`;

            await bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: '↻ Refresh', callback_data: 'refresh' },
                        ],
                        [
                            { text: 'Swap', callback_data: 'swap' },
                            { text: 'Limit', callback_data: 'limit' },
                            { text: '✅ DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: '✅ 0.5 SOL', callback_data: 'amount_0.5' },
                            { text: '1 SOL', callback_data: 'amount_1' },
                            { text: '3 SOL', callback_data: 'amount_3' },
                        ],
                        [
                            { text: '5 SOL', callback_data: 'amount_5' },
                            { text: '10 SOL', callback_data: 'amount_10' },
                            { text: 'X SOL', callback_data: 'amount_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [
                            { text: `Interval: ${orderData.interval || '-'}`, callback_data: 'interval' },
                            { text: `Duration: ${orderData.duration || '-'}`, callback_data: 'duration' },
                        ],
                        [
                            { text: `Min Price: ${orderData.minPrice || '-'}`, callback_data: 'min-price' },
                            { text: `Max Price: ${orderData.maxPrice || '-'}`, callback_data: 'max-price' },
                        ],
                        [{ text: 'CREATE ORDER', callback_data: 'create-dca-order' }],
                    ]
                }
            });
        });
    } else if (data === 'positions') {
        bot.sendMessage(chatId, "You do not have any tokens yet! Start trading in the Buy menu.")
    }
    else if (data === 'create-dca-order') {
        if (orderData.maxPrice && orderData.minPrice) {
            const wallets = await getWalletbyUser(user._id);
            let account = wallets[0].privateKey;
            const secretKeyUint8 = Uint8Array.from(account.split(',').map(Number));
            const wallet = Keypair.fromSecretKey(secretKeyUint8);
            const outToken = userInput.address;
            const inputToken = 'So11111111111111111111111111111111111111112';
            const amount = BigInt(userInput.amount);
            const minAmount = BigInt(orderData.minPrice) || null;
            const maxAmount = BigInt(orderData.maxPrice) || null;
            const slippageBps = userInput.slippage * 100;
            const duration = convertToSeconds(orderData.duration)

            const publicKey = await createDCA(inputToken, outToken, wallet, amount, duration, minAmount, maxAmount);

            await addNewDca({ minPrice: orderData.minPrice, maxPrice: orderData.maxPrice, title: `Buy ${userInput.amount} SOL of ${myObj.name} Every ${orderData.interval} for ${orderData.duration}`, duration: orderData.duration, user: user._id, publicKey: publicKey, })
            const content = `Buy $<a>${myObj.symbol}</a>-${myObj.name}\ ${userInput.address} \n\nBalance: ${userInput.amount}\nPrice: <b>$${myObj.price}</b> - MC: <b>$${myObj.marketCap}</b>\n\n🟢 DCA Order Placed!\n Buy ${userInput.amount} SOL of ${myObj.name} Every ${orderData.interval} for ${orderData.duration} `
            bot.sendMessage(chatId, content, {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '← Back', callback_data: 'backs' },
                            { text: 'View DCA Orders', callback_data: 'dca_orders' },
                        ],
                    ]
                }
            });
        } else {
            bot.sendMessage(chatId, 'Please set both trigger price and expiry before creating the order.');
        }

    } else if (data === 'limit_orders') {

        let limitOrders = await getLodByUser(user._id);

        let content;
        if (limitOrders.length === 0) {
            content = "<b>You have no active limit orders. Create a limit order from the Buy/Sell menu.</b>";
        } else {
            content = "<b>Active Limit Orders</b>\n";
            limitOrders.forEach((order, index) => {
                content += `${index + 1}/${limitOrders.length}\n\n`;
                content += `Trigger Price: <b>${order.triggerPrice}</b>\n`;
                content += `Expiry: <b>${order.expiry}</b>\n`;
                content += `Amount: <b>${order.amount}</b>\n\n`;
            });
        }

        bot.sendMessage(chatId, content, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '← Back', callback_data: 'backs' }]
                ]
            }
        });
    } else if (data === 'dca_orders') {
        let dcaOrders = await getDcaByUser(user._id);
        let content;
        if (dcaOrders.length === 0) {
            content = "<b>You have no active DCA orders. Create a DCA order from the Buy/Sell menu.</b>";
        } else {
            content = "<b>Active DCA Orders</b>\n";
            dcaOrders.forEach((order, index) => {
                content += `${index + 1}/${dcaOrders.length}\n\n${dcaOrders.title}\n`;
                content += `Min Price: <b>${order.minPrice || 'No'}</b>\n`;
                content += `Max Price: <b>${order.maxPrice || 'No'}</b>\n`;
                content += `End in: <b>${order.duration}</b>\n\n`;
            });
        }

        bot.sendMessage(chatId, content, {
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: '← Back', callback_data: 'backs' }]
                ]
            }
        });
    }
    if (!userSettings[chatId]) {
        userSettings[chatId] = {
            fast: false,
            turbo: true,
            customFee: '',
            mevBuy: false,
            mevSell: false,
            autoBuy: false,
            amounts: {
                sol_0_5: '0.5 SOL',
                sol_12: '12 SOL',
                sol_3: '3 SOL',
                sol_10: '10 SOL',
                buySlippage: '15%',
                sellP_2: '2%',
                sellP_100: '100 SOL',
                sellSlippage: '15%',
            }
        };
    }

    let settings = userSettings[chatId];

    switch (data) {
        case 'settings':
            sendSettingsMenu(chatId);
            break;

        case 'fast':
            settings.fast = true;
            settings.turbo = false;
            settings.customFee = '';
            sendSettingsMenu(chatId);
            break;

        case 'turbo':
            settings.fast = false;
            settings.turbo = true;
            settings.customFee = '';
            sendSettingsMenu(chatId);
            break;

        case 'mev_buy':
            settings.mevBuy = !settings.mevBuy;
            sendSettingsMenu(chatId);
            break;

        case 'auto_buy':
            settings.autoBuy = !settings.autoBuy;
            sendSettingsMenu(chatId);
            break;

        case 'mev_sell':
            settings.mevSell = !settings.mevSell;
            sendSettingsMenu(chatId);
            break;

        case 'custom_fee':
            bot.sendMessage(chatId, 'Please enter your custom fee:').then(() => {
                bot.once('message', msg => {
                    settings.fast = false;
                    settings.turbo = false;
                    settings.customFee = msg.text;
                    sendSettingsMenu(chatId);
                });
            });
            break;

        default:
            if (data.endsWith('✏️')) {
                bot.sendMessage(chatId, 'Please enter the new amount:').then(() => {
                    bot.once('message', msg => {
                        let key = data.replace('✏️', '').trim().toLowerCase().replace(' ', '_');
                        settings.amounts[key] = msg.text;
                        sendSettingsMenu(chatId);
                    });
                });
            }
            break;
    }
});
function sendSettingsMenu(chatId) {
    const settings = userSettings[chatId];
    const content = `<b><u>💰Fee Discount</u></b>: You are receiving a 10% discount on trading fees for being a referral of another user.

<b>FAQ</b>:

🚀 <b>Fast/Turbo/Custom Fee</b>: Set your preferred priority fee to decrease the likelihood of failed transactions.

🛡️<b>MEV Protection</b>:
Enable this setting to send transactions privately and avoid getting frontrun or sandwiched.
<u>Important Note</u>: If you enable MEV Protection your transactions may take longer to get confirmed.`;

    const inline_keyboard = [
        [
            { text: '← Back', callback_data: 'backs' },
        ],
        [
            { text: `${settings.fast ? '✅' : ''} Fast 🐴`, callback_data: 'fast' },
            { text: `${settings.turbo ? '✅' : ''} Turbo 🚀`, callback_data: 'turbo' },
            { text: `${settings.customFee ? `✅ Custom Fee (${settings.customFee})` : 'Custom Fee'}`, callback_data: 'custom_fee' },
        ],
        [
            { text: `${settings.mevBuy ? '🟢' : ''} Mev Protect (Buys)`, callback_data: 'mev_buy' },
            { text: `${settings.mevSell ? '🟢' : ''} Mev Protect (Sells)`, callback_data: 'mev_sell' },
        ],
        [
            { text: `${settings.autoBuy ? '🟢' : '🔴'} Auto Buy`, callback_data: 'auto_buy' },
        ],
        [
            { text: '-- Buy Amounts --', callback_data: 'buy_amounts' },
        ],
        [
            { text: `${settings.amounts.sol_0_5} ✏️`, callback_data: 'sol_0.5 ✏️' },
            { text: `${settings.amounts.sol_12} ✏️`, callback_data: 'sol_12 ✏️' },
            { text: `${settings.amounts.sol_3} ✏️`, callback_data: 'sol_3 ✏️' },
        ],
        [
            { text: `${settings.amounts.sol_10} ✏️`, callback_data: 'sol_10 ✏️' },
        ],
        [
            { text: `Buy Slippage: ${settings.amounts.buySlippage} ✏️`, callback_data: 'buy_slippage ✏️' },
        ],
        [
            { text: '-- Sell Amounts --', callback_data: 'sell_amounts' },
        ],
        [
            { text: `${settings.amounts.sellP_2} ✏️`, callback_data: 'sellP_2 ✏️' },
            { text: `${settings.amounts.sellP_100} ✏️`, callback_data: 'sellP_100 ✏️' },
        ],
        [
            { text: `Sell Slippage: ${settings.amounts.sellSlippage} ✏️`, callback_data: 'sell_slippage ✏️' },
        ],
        [
            { text: 'Show/Hide Token', callback_data: 'show_hide' },
            { text: 'Wallets', callback_data: 'wallets' },
        ],
        [
            { text: 'Advanced Mode ➜', callback_data: 'advanced_mode' },
        ],
    ];

    bot.sendMessage(chatId, content, {
        parse_mode: "HTML",
        reply_markup: { inline_keyboard }
    });
}


async function handleSellCommand(chatId, data) {
    const user = await getUserById(chatId);
    const wallets = await getWalletbyUser(user._id);

    try {
        const transactions = await getTransactionByUser(user._id);
        const buyTransactions = transactions.filter(transaction => transaction.type === 'buy');

        const inlineKeyboard = buyTransactions.map(transaction => {
            userInput.address = transaction.toAsset;
            return [{ text: transaction.to, callback_data: `transaction_${transaction.to}` }];
        });

        inlineKeyboard.push([
            { text: '⬅ Back', callback_data: 'back' },
            { text: '↺ Refresh', callback_data: 'refresh' }
        ]);

        let account = wallets[0].address;

        const solBalance = await getSolBalance(account);
        const solPriceInUSD = await getSolPriceInUSD();
        const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

        let content = `<b>Solana</b>\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code>\n \nSelect Token to Sell \n \n`;

        for (const tx of buyTransactions) {
            const tokenPriceInUSD = await getTokenPriceInUSD(tx.toAsset);
            content += `<code>${tx.to}</code> ($${tokenPriceInUSD} USD)\n`;
        }

        bot.sendMessage(chatId, content, {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: inlineKeyboard
            }
        });
    } catch (error) {
        console.error('Error fetching transaction data:', error);
    }
}
async function handleInlineButtonClick(chatId, data) {
    const user = await getUserById(chatId);

    if (data.startsWith('transaction_')) {
        const tokenMint = data.split('_')[1];
        userInput.token = tokenMint;

        const tokenData = await getTokenData(tokenMint);

        const { price, marketCap, dailyVolume, dailyChange } = await getTokenMarketData(userInput.address);
        const wallets = await getWalletbyUser(user._id);
        let account = wallets[0].address;
        let symbol = tokenData.symbol;

        const solBalance = await getSolBalance(account);
        const solPriceInUSD = await getSolPriceInUSD();
        const balanceInUSD = (solBalance * solPriceInUSD).toFixed(2);

        bot.sendMessage(chatId,
            `<b>Wallet</b>\n<code>${account}</code> (Tap to copy)\nBalance: <code>${solBalance.toFixed(4)} SOL ($${balanceInUSD})</code> \nThe current price of  (${symbol}) is $${price}\n` +
            `Market Cap: $${marketCap}\n` +
            `24h Price Change: ${dailyChange}\n` +
            `24h Price Volume: ${dailyVolume} `,

            {
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: '⬅ Back', callback_data: 'back' },
                            { text: '🔄 Refresh', callback_data: 'refresh' },
                        ],
                        [

                            { text: '✅ Swap', callback_data: 'swap' },
                            { text: 'Limit', callback_data: 'limit' },
                            { text: 'DCA', callback_data: 'dca' },
                        ],
                        [
                            { text: `0.5 ${symbol}`, callback_data: 'amountx_0.5' },
                            { text: `✅ 1 ${symbol}`, callback_data: 'amountx_1' },
                            { text: `3 ${symbol}`, callback_data: 'amountx_3' },
                        ],
                        [
                            { text: `5 ${symbol}`, callback_data: 'amountx_5' },
                            { text: `10 ${symbol}`, callback_data: 'amountx_10' },
                            { text: `X ${symbol}`, callback_data: 'amountx_custom' },
                        ],
                        [
                            { text: '✅ 15% Slippage', callback_data: 'slippage_15' },
                            { text: 'X Slippage', callback_data: 'slippage_custom' },
                        ],
                        [
                            { text: 'Sell', callback_data: 'confirm_sell' },
                        ],
                    ],
                }
            }
        );

    } else if (data.startsWith('slippage_')) {
        const slippage = data.split('_')[1];
        if (slippage === 'custom') {
            let contentMessage = await bot.sendMessage(chatId, "Enter the slippage percentage you want to set", {
                reply_markup: {
                    force_reply: true
                }
            });
            bot.onReplyToMessage(contentMessage.chat.id, contentMessage.message_id, (replyHandler) => {
                userInput.slippage = parseFloat(replyHandler.text);
                bot.sendMessage(chatId, `✅ Custom slippage set to ${userInput.slippage}%`);
            });
        } else {
            userInput.slippage = parseFloat(slippage);
            bot.sendMessage(chatId, `✅ Slippage set to ${userInput.slippage}%`);
        }
    }
}
async function getTokenData(token) {
    try {
        const capitalizedToken = token;
        const response = await axios.get('https://token.jup.ag/all');
        const tokens = response.data;
        const tokenData = tokens.find(t => t.symbol === capitalizedToken.toUpperCase() || t.address === capitalizedToken || t.address === capitalizedToken.toUpperCase());
        return tokenData;
    } catch (error) {
        console.error('Error fetching token data:', error);
        return null;
    }
}


async function getTokenPriceInUSD(tokenAddress) {
    const API_KEY = process.env.COINGECKO_KEY;;
    const BASE_URL = 'https://pro-api.coingecko.com/api/v3';

    try {
        const response = await axios.get(`${BASE_URL}/simple/token_price/solana`, {
            headers: {
                'X-CG-Pro-API-Key': API_KEY
            },
            params: {
                contract_addresses: tokenAddress,
                vs_currencies: 'usd'
            }
        });
        console.log("Price", response.data)
        return response.data[tokenAddress]?.usd || 0;
    } catch (error) {
        console.error('Error fetching token price from CoinGecko:', error);
        return 0;
    }
}
app.listen(PORT, () => {
    console.log('Bot listening on port ' + PORT)
})

function convertToSeconds(timeStr) {
    const unitMultipliers = {
        'm': 60,
        'h': 3600,
        'd': 86400
    };

    const regex = /^(\d+)([mhd])$/;
    const match = timeStr.match(regex);

    if (!match) {
        throw new Error("Invalid time format");
    }

    const value = BigInt(match[1]);
    const unit = match[2];

    const multiplier = BigInt(unitMultipliers[unit]);

    return value * multiplier;
}

function sendCopyTradeSetupMessage(chatId, setup) {
    const message = `<b>To setup a new Copy Trade:</b> \n - Assign a unique name or “tag” to your target wallet, to make it easier to identify. \n - Enter the target wallet address to copy trade. \n - Enter the percentage of the target's buy amount to copy trade with, or enter a specific SOL amount to always use. \n - Toggle on Copy Sells to copy the sells of the target wallet. \n - Click “Add” to create and activate the Copy Trade. \n \n <b>To manage your Copy Trade:</b> \n - Click the “Active” button to “Pause” the Copy Trade. \n - Delete a Copy Trade by clicking the “Delete” button.`;
    bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Tag: ' + setup.tag, callback_data: 'tag' },
                ],
                [
                    { text: 'Target Wallet: ' + setup.targetWallet, callback_data: 'target_wallet' }
                ],
                [
                    { text: 'Buy Percentage: ' + setup.buyPercentage, callback_data: 'buy_percentage' },
                    { text: 'Copy Sells: ' + setup.copySells, callback_data: 'copy_sell' }
                ],
                [
                    { text: 'Buy Gas: ' + setup.buyGas, callback_data: 'buy_gas' },
                    { text: 'Sell Gas: ' + setup.sellGas, callback_data: 'sell_gas' }
                ],
                [
                    { text: 'Slippage: ' + setup.slippage, callback_data: 'slippage' }
                ],
                [
                    { text: '➕ Add', callback_data: 'confirm_trade' }
                ],
                [
                    { text: '⬅️ Back', callback_data: 'back' }
                ],
            ]
        }
    });
}
function pushToHistory(chatId, message, keyboard) {
    if (!userHistory[chatId]) {
        userHistory[chatId] = [];
    }
    userHistory[chatId].push({ message, keyboard });
}
async function handleBackButton(chatId) {
    if (userHistory[chatId] && userHistory[chatId].length > 0) {
        const previousState = userHistory[chatId].pop();
        await bot.editMessageText(previousState.message, {
            chat_id: chatId,
            message_id: userHistory[chatId].messageId,
            reply_markup: { inline_keyboard: previousState.keyboard }
        });
    } else {
        await bot.sendMessage(chatId, "No previous state found.");
    }
}
async function initializeCopyTrading() {
    try {


        const users = await getAllUsers();
        for (const user of users) {
            const chatId = user.chatId;
            const wallet = await getWalletbyUser(user._id)
            const trades = await getTradeByUser(user._id)
            if (wallet.length > 0 && trades.length > 0 && trades[0].copy) {
                const secretKeyUint8 = Uint8Array.from(wallet[0].privateKey.split(',').map(Number));
                const walletKeypair = web3.Keypair.fromSecretKey(secretKeyUint8);
                startCopyTrading(user, trades[0].wallet, walletKeypair, chatId).catch(console.error);
            }
        }
    } catch (err) {
        console.error(`Error initializing copy trading: ${err}`);
    }
}
initializeCopyTrading().catch(console.error);
