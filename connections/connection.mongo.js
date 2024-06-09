const mongoose = require('mongoose');
require('dotenv').config();
module.exports = () => {
    const db = mongoose.connection;
    db.on('connected', () => {
        console.log('Connected to mongodb');
    });
    db.on('error', (err) => {
        console.log('Error connecting to mongodb ', err);
    });

    db.on('disconnect', () => {
        console.log('Disconnected from mongodb');
    });

    mongoose.connect(process.env.MONGO_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
}
