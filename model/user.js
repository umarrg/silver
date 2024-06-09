const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const Account = new Schema({
    chatId: { type: Number, },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model('Account', Account);