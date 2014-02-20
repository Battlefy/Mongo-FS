
var MongoFS = require('./lib/mongo-fs');


exports = module.exports = function(db, collectionName, opts) {
  return new MongoFS(db, collectionName, opts);
};
exports.MongoFS = MongoFS;