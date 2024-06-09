const TelegramBot = require('node-telegram-bot-api');

function ReferralCommand(bot, chatId, username) {
    const message = `
    <b>💰 Invite your friends to save 10% on fees. If you've traded more than $10k volume in a week you'll receive a 35% share of the fees paid by your referrees! Otherwise, you'll receive a 25% share.</b>

<b>Your Referrals (updated every 15 min)</b>
• Users referred: 0 (direct: 0, indirect: 0)
• Total rewards: 0 SOL ($0.00)
• Total paid: 0 SOL ($0.00)
• Total unpaid: 0 SOL ($0.00)

Rewards are paid daily and airdropped directly to your chosen Rewards Wallet. <b>You must have accrued at least 0.005 SOL in unpaid fees to be eligible for a payout.</b>

We've established a tiered referral system, ensuring that as more individuals come onboard, rewards extend through five different layers of users. This structure not only benefits community growth but also significantly increases the percentage share of fees for everyone.

Stay tuned for more details on how we'll reward active users and happy trading!
<b><u>Your Referral Link</u></b>

<code>https://t.me/SliverSniper_Bot?start=r-${username}</code>

    `;

    bot.sendMessage(chatId, message, {
        parse_mode: 'HTML', reply_markup: {
            inline_keyboard: [
                [{ text: 'Close', callback_data: 'close' },],]
        }
    })
        .then(() => {
            console.log('Message sent successfully');
        })
        .catch((error) => {
            console.error('Error sending message:', error);
        });
}

module.exports = { ReferralCommand };
