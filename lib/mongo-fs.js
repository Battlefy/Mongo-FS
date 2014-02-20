
// modules
var fs = require('fs');
var concat = require('concat-stream');
var mongodb = require('mongo');
var request = require('request');
var Db = mongodb.Db;
var Grid = mongodb.Grid;
var Readable = require('streams').Readable;


/**
 * MongoFS constructor.
 * @param {Db}     db             Mongo database instance.
 * @param {String} collectionName Mongo collection name.
 */
function MongoFS(db, collectionName) {

  // validate
  if(typeof db != 'object' || db.constructor != Db) { throw new Error('db must be a mongodb database instance'); }
  if(typeof collectionName != 'string') { throw new Error('collectionName must be a string'); }

  // setup the instance
  this.store = new Grid(db, collectionName);
}

/**
 * Set a file in the grid.
 * @param  {String}        filename Filename.
 * @param  {Stream|String} src      Readable stream, file path, or url.
 * @return {Stream}                 Readable stream.
 */
MongoFS.prototype.set = function(filename, src) {
  var _this = this;

  // validate.
  if(typeof filename != 'string') { throw new Error('filename must be a string'); }
  if(typeof src != 'string' && (typeof src != 'object' || typeof src.pipe != 'function')) { throw new Error('src must be a string or readable stream'); }

  // figure out the source type.
  var stream;
  if(typeof src == 'string') {
    if(src.match(/^[\w\d\-]+:\/\//)) {
      stream = request.get(src);
    } else {
      stream = fs.createReadStream(src);
    }
  } else {
    stream = src;
  }

  // create the concat stream.
  var writeable = concat(function(data) {
    _this.store.put(data, function(err) {
      if(err) { writeable.error(err); }
      else { writeable.end(); }
    });
  });

  // write into the grid.
  stream.pipe(writeable);

  // return the readable stream
  return stream;
};

/**
 * Get a file from the grid.
 * @param  {String} filename Filename.
 * @return {String}          Readable stream containing the file.
 */
MongoFS.prototype.get = function(filename) {

  // Create readable stream.
  var stream = new Readable();

  // create the read function.
  var data = null;
  stream._read = function() {
    if(data) {
      this.push(data);
      this.push(null);
    }
  };

  // read the file.
  this.get(filename, function(err, _data) {
    if(err) { return stream.error(err); }
    data = _data;
  });

  // return the steam.
  return stream;
};

module.exports = MongoFS;