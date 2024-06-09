const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Wallet = new Schema({
    address: { type: String, },
    privateKey: { type: String, },
    name: { type: String, },
    status: { type: String, default: "active" },
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});



module.exports = mongoose.model('Wallets', Wallet);