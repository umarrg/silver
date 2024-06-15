else if (data === 'new_pairs') {
    const message = `
📈 TRUMP | Trumpwifhat (34s ago)
86ndMZyZchZZVZG6TpvgmkMtKnM3ET7tvN3CD1aMExHw
Renounced: ❌ | Not Rugged ✅
Market Cap: $119.69K
Liquidity: $239.02K | Locked: 0%
LP: 99.97% | Creator: 0%
Top 5: 0% | Top 20: 0%

📈 ALBERT | Albert Sign  (30s ago)
J26TNk1tfg5HqAw8EfJL6mnqL2m62xP7ePupQJbzpump
Renounced: ✅ | Not Rugged ✅
Market Cap: $5.02K
Liquidity: $10.13K | Locked: 0%
LP: 97.55% | Creator: 0%
Top 5: 0% | Top 20: 0%

📈 DRLISA | AMD CEO (29s ago)
8Y8bPdS857wEFCy3CuCJ7LevvchhtQRGaF37Lpybpump
Renounced: ✅ | Not Rugged ✅
Market Cap: $5.75K
Liquidity: $10.81K | Locked: 0%
LP: 88.94% | Creator: 0%
Top 5: 0% | Top 20: 0%

📈 MUNALISA | YOUNG MUNALISA (29s ago)
BT1aJ7aprrJsKSnNkqrhfXRX2tmitfuA4hEeRnDRHYNM
Renounced: ✅ | Not Rugged ✅
Market Cap: $5.44K
Liquidity: $10.53K | Locked: 0%
LP: 93.25% | Creator: 0%
Top 5: 0% | Top 20: 0%

📈 CHONKE | Chinese PONKE (17s ago)
AbBF6HHDkoMWUKaw7YF3sLJNLsQKc6wE6vQydnBQpump
Renounced: ✅ | Not Rugged ✅
Market Cap: $4.94K
Liquidity: $10.05K | Locked: 0%
LP: 97.61% | Creator: 0%
Top 5: 0% | Top 20: 0%
`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: 'Back', callback_data: 'back' },
                    { text: 'Refresh', callback_data: 'refresh' }
                ]
            ]
        },
        parse_mode: 'HTML'
    };

    bot.sendMessage(chatId, message, options)
        .then(() => console.log('Message sent successfully with buttons'))
        .catch(err => console.error('Error sending message:', err));
}