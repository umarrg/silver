const TelegramBot = require('node-telegram-bot-api');

function helpCommand(bot, chatId) {
    const message = `
<b><u>How do I use Silver?</u></b>
Check out our Youtube playlist where we explain it all.

<b><u>Which tokens can I trade?</u></b>
Any SPL token that is tradeable via Jupiter, including SOL and USDC pairs. We also support directly trading through Raydium if Jupiter fails to find a route. You can trade newly created SOL pairs (not USDC) directly through Raydium.

<b><u>Where can I find my referral code?</u></b>
Open the /start menu and click 💰Referrals.

<b><u>My transaction timed out. What happened?</u></b>
Transaction timeouts can occur when there is heavy network load or instability. This is simply the nature of the current Solana network.

<b><u>What are the fees for using Silver?</u></b>
Transactions through Silver incur a fee of 1%, or 0.9% if you were referred by another user. We don't charge a subscription fee or pay-wall any features.

<b><u>My net profit seems wrong, why is that?</u></b>
The net profit of a trade takes into consideration the trade's transaction fees. Confirm the details of your trade on Solscan.io to verify the net profit.

<b><u>Additional questions or need support?</u></b>
Join our Telegram group @Mevdevu and one of our admins can assist you.
    `;

    bot.sendMessage(chatId, message, {
        parse_mode: 'HTML', reply_markup: {
            inline_keyboard: [
                [{ text: 'Back', callback_data: 'back' },],]
        }
    },)
        .then(() => {
            console.log('Message sent successfully');
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

module.exports = { helpCommand };
