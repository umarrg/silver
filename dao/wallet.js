const Model = require('../model/wallet');

class controller {
    constructor() { }
    addNewWallet(obj) {
        return new Promise((resolve, reject) => {
            let newItem = new Model(obj);
            newItem.save((err, saved) => {
                if (err) {
                    reject(err);
                }
                resolve(newItem);
            });
        });
    }
    async getAllUserWallet() {
        let users = await Model.find()
        return users;
    }
    getAll() {
        return new Promise((resolve, reject) => {
            Model.find((err, all) => {
                if (err) {
                    reject(err)
                }
                resolve(all);
            })
        });
    }

    getWalletbyUser(user) {
        return new Promise((resolve, reject) => {
            Model.find({ user }, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            })
        });
    }
    deleteOneWallet(address) {
        return new Promise((resolve, reject) => {
            Model.deleteOne({ address }, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve('Wallet Deleted Successfully');
            });
        });
    }
}

module.exports = new controller();