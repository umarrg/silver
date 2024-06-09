const Model = require('../model/trade');

class controller {
    constructor() { }
    addNewTrade(obj) {
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

    getActiveTrade() {
        return new Promise((resolve, reject) => {
            Model.find({ copy: true }, (err, all) => {
                if (err) {
                    reject(err)
                }
                resolve(all);
            })
        });
    }

    updateTradesForUser(userId) {
        return new Promise((resolve, reject) => {
            Model.updateMany({ user: userId }, { copy: false }, { new: true }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    updateTradeForUser(userId, wallet) {
        return new Promise((resolve, reject) => {
            Model.findOneAndUpdate({ user: userId, wallet: wallet }, { copy: false }, { new: true }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    activateTradeForUser(userId, wallet) {
        return new Promise((resolve, reject) => {
            Model.findOneAndUpdate({ user: userId, wallet: wallet }, { copy: true }, { new: true }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    getTradeByUser(user) {
        return new Promise((resolve, reject) => {
            Model.find({ user }, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            }).populate('user');
        });
    }
    deleteTradeForUser(userId, wallet) {
        return new Promise((resolve, reject) => {
            Model.findOneAndDelete({ user: userId, wallet: wallet }, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }
    deleteOne(id) {
        return new Promise((resolve, reject) => {
            Model.findByIdAndDelete(id, (err, result) => {
                if (err) {
                    reject(err);
                }
                resolve('  Deleted Successfully');
            });
        });
    }


}

module.exports = new controller();