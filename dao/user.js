const Model = require('../model/user');

class controller {
    constructor() { }

    addNewUser(obj) {
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

    getAllUsers() {
        return new Promise((resolve, reject) => {
            Model.find((err, all) => {
                if (err) {
                    reject(err)
                }
                resolve(all);
            })
        });
    }

    updateUser(id, data) {
        return new Promise((resolve, reject) => {
            const filter = { _id: id };
            const update = { $set: data };

            Model.updateOne(filter, update, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        });
    }


    getOne(id) {
        return new Promise((resolve, reject) => {
            Model.findById(id, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            })
        });
    }
    getUserById(chatId) {
        return new Promise((resolve, reject) => {
            Model.findOne({ chatId }, (err, single) => {
                if (err) {
                    reject(err)
                }
                resolve(single);
            })
        });
    }






    deleteUser(id) {
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