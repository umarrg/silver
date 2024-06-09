const Model = require('../model/transaction');

class controller {
    constructor() { }
    addNewTransaction(obj) {
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

    getTransactionByUser(user) {
        return new Promise((resolve, reject) => {
            Model.find({ user }, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            }).populate('user');
        });
    }
    updateTransaction(id) {
        return new Promise((resolve, reject) => {
            Model.updateOne(id, { status: "Done" }, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            })
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