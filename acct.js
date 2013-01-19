// account model
var Thug = require('thug');
var redisDb = require('thug-redis');

module.exports = function(config) {
  config.redis.namespace = 'fscat:acct';
  var redis = redisDb(config.redis);

  var acct = new Thug();
  acct.constructor.prototype.read = redis.read;
  acct.constructor.prototype.write = redis.write;
  acct.constructor.prototype.remove = redis.remove;

  return acct;
}
