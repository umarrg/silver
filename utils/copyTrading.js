async function startCopyTrading(user, traderAddress, walletKeypair, chatId) {
    const subscriptionId = connection.onAccountChange(
        traderAddress,
        async (accountInfo, context) => {
            const slot = context.slot;

            for (const txSignature of accountInfo.transactions) {
                try {
                    const transaction = await connection.getTransaction(txSignature, { commitment: 'confirmed' });

                    if (transaction && transaction.meta && transaction.meta.err === null) {
                        const instructions = transaction.transaction.message.instructions;

                        for (const instruction of instructions) {
                            if (instruction.programId.toBase58() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') {
                                const keys = instruction.keys;
                                const sourceAccount = keys[0].pubkey.toBase58();
                                const destinationAccount = keys[1].pubkey.toBase58();
                                const amount = instruction.data.slice(1, 9).readBigUInt64LE();

                                if (sourceAccount === traderAddress.toBase58()) {
                                    console.log(`Mirroring transfer of ${amount} SOL to ${destinationAccount}`);

                                    const transferIx = web3.SystemProgram.transfer({
                                        fromPubkey: walletKeypair.publicKey,
                                        toPubkey: new web3.PublicKey(destinationAccount),
                                        lamports: amount,
                                    });

                                    const transaction = new web3.Transaction().add(transferIx);
                                    const signature = await web3.sendAndConfirmTransaction(connection, transaction, [walletKeypair]);
                                    console.log(`Transaction signature: ${signature}`);

                                    const message = `Mirrored transfer of ${amount} lamports (SOL) to ${destinationAccount}. Transaction signature: ${signature}`;
                                    bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error processing transaction: ${error}`);
                }
            }
        },
        'confirmed'
    );

    console.log(`Listening for transactions on ${traderAddress} for user ${user}`);
}

module.exports = {
    startCopyTrading
};