const Model = require('../model/trade');

class controller {
    constructor() { }
    addNewDca(obj) {
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
            Model.find({ active: true }, (err, all) => {
                if (err) {
                    reject(err)
                }
                resolve(all);
            })
        });
    }




    getDcaByUser(user) {
        return new Promise((resolve, reject) => {
            Model.find({ user }, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            })
        });
    }




}

module.exports = new controller();