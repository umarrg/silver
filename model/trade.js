const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Trade = new Schema({
    tag: { type: String, },
    wallet: { type: String, },
    buyPercentage: { type: Number, default: 100 },
    copy: { type: Boolean, default: true },
    buyGas: { type: String, default: "0.0015" },
    sellGas: { type: String, default: "0.0015" },
    slippage: { type: Number, },
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});



module.exports = mongoose.model('Trade', Trade);