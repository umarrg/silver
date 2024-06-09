const Model = require('../model/trade');

class controller {
    constructor() { }
    addNewLod(obj) {
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



    getLodByUser(user) {
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