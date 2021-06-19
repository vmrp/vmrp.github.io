
// https://github.com/louischatriot/nedb

const dbNotOpenErr = new Error("db not open");
const db = {};

db.newDB = function () {
    db.db = new Nedb({ filename: 'mrpdb', autoload: true, timestampData: true });
}

db.insert = function (doc) {
    return new Promise(function (resolve, reject) {
        if (db.db) {
            db.db.insert(doc, function (err, newDoc) {
                if (err) {
                    return reject(err);
                }
                resolve(newDoc);
            });
            return;
        }
        reject(dbNotOpenErr);
    });
}

db.findOne = function (obj) {
    return new Promise(function (resolve, reject) {
        if (db.db) {
            db.db.findOne(obj, function (err, docs) {
                if (err) {
                    return reject(err);
                }
                resolve(docs);
            });
            return;
        }
        reject(dbNotOpenErr);
    });
}

db.find = function (obj) {
    return new Promise(function (resolve, reject) {
        if (db.db) {
            db.db.find(obj, function (err, docs) {
                if (err) {
                    return reject(err);
                }
                resolve(docs);
            });
            return;
        }
        reject(dbNotOpenErr);
    });
}

db.getData = function (cond, page, pageSize) {
    return new Promise(function (resolve, reject) {
        if (db.db) {
            db.db.find(cond).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).exec(function (err, docs) {
                if (err) {
                    return reject(err);
                }
                resolve(docs);
            });
            return;
        }
        reject(dbNotOpenErr);
    });
}

db.remove = function (query, options = { multi: false }) {
    return new Promise(function (resolve, reject) {
        if (db.db) {
            db.db.remove(query, options, function (err, numRemoved) {
                if (err) {
                    return reject(err);
                }
                resolve(numRemoved);
            });
            return;
        }
        reject();
    });
}

db.count = function (query) {
    return new Promise(function (resolve, reject) {
        if (db.db) {
            db.db.count(query, function (err, count) {
                if (err) {
                    return reject(err);
                }
                resolve(count);
            });
            return;
        }
        reject(dbNotOpenErr);
    });
}

