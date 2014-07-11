var redis  = require('haredis');
var hash   = require('./utils').hash;
var log    = require('./logger');

var Pubsub = function(){
  this.socket;
  this.channelNames;
  this.client;
  this.publish = function(){};
};

var RedisPubSub = function(conf){
  var that = this;
  this.client = redis.createClient(conf.redisNodes);
  this.endpoints = conf.multicastEndpoints;

  // setup callbacks
  this.client.on('subscribe', function( channel, count ){
    log.info("subscribed to channel:" + channel ); 
  });

  this.client.on('message', function( channel, messageStr ){
    var message = JSON.parse(messageStr);
    // ignore messages that this client sent

    if( message.headers.origin != that.socket.clientId ){
      log.debug("Redis channel '" + channel + "' sent '" + messageStr + "'");
      var msgHash = hash(new Buffer(message.data));

      // have we sent this message already? If not send it.
      if( that.socket.sentDatagramStack.indexOf(msgHash) < 0 ){

        that.socket.sentDatagramStack.unshift(msgHash);
        that.socket.send( channel, message );

      } else {
        log.debug( "Duplicate message with hash: " + msgHash );
      }
    } else {
      log.debug( "Recieved echo from Redis" );
    }
  });

  //this.publish = this.client.publish;
  this.publish = function(channelName, msg){
    log.debug("Publish message to " + channelName );
    that.client.publish(channelName, msg);
  };

  this.init = function(){
    // subscribe to all the channelNames
    for( i in that.endpoints ){
      log.info("Subscribing to " + that.endpoints[i].channelName);
      that.client.subscribe(that.endpoints[i].channelName);
    }
  };
}
RedisPubSub.prototype = new Pubsub();

module.exports = RedisPubSub;
