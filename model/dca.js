const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Dca = new Schema({
    publickey: { type: String, },
    wallet: { type: String, },
    title: { type: String, },
    minPrice: { type: String, },
    maxPrice: { type: String, },
    duration: { type: String, },
    active: { type: Boolean, default: true },
    user: { type: Schema.Types.ObjectId, ref: 'Account' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

});



module.exports = mongoose.model('Dca', Dca);