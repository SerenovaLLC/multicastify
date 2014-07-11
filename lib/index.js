var PubSub = require('./redisPubSub');
var Socket = require('./socket');

var logger = require('./logger');
var log    = logger.info;
var debug  = logger.debug;


module.exports = function(conf){
  var pubsub = new PubSub(conf);
  var socket = new Socket(conf);

  pubsub.socket = socket;
  socket.pubsub = pubsub;

  pubsub.init();
  socket.init();
};
