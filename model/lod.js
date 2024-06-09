const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LimitOrder = new Schema({
    triggerPrice: { type: String, },
    expiry: { type: String, },
    amount: { type: String, },
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});



module.exports = mongoose.model('LimitOrder', LimitOrder);