const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Transactions = new Schema({
    fromAsset: { type: String, },
    toAsset: { type: String, },
    from: { type: String, },
    to: { type: String, },
    type: { type: String, },
    status: { type: String, default: "pending" },
    amount: { type: Number, },
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});



module.exports = mongoose.model('Transactions', Transactions);