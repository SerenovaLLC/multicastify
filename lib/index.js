var os     = require('os');
var xxhash = require('xxhash');
var dgram  = require('dgram');
var socket = dgram.createSocket('udp4'); // TODO IPv6 as config option?

var redis  = require('haredis');
var logger = require('./logger');
var log    = logger.info;
var debug  = logger.debug;

// util
var hash = function(str){
  return xxhash.hash(new Buffer(str+process.pid), 0xCAFEBEEF);
}

// TODO get a correct client IP for the clientId
//var clientId = os.networkInterfaces().en1[1].address+":"+process.pid;
var clientId = "192.168.1.1:"+process.pid;

module.exports = function(conf){

  //var nodes  = ['172.17.8.101:6379','172.17.8.101:6380'];
  var client = redis.createClient(conf.redisNodes);

  // TODO Should be a loop to listen to all the endpoints
  var multicastAddress = conf.multicastEndpoints[0].ip;
  var multicastPort = conf.multicastEndpoints[0].port;

  var maxStackSize = 10;
  var sentDatagramStack = [];
  var messageIndex = 0;

  client.on('subscribe', function( channel, count ){
    log("subscribed to channel:" + channel ); 
  });

  client.on('message', function( channel, messageStr ){
    var message = JSON.parse(messageStr);
    // ignore messages that this client sent
    if( message.headers.origin != clientId ){
      debug("Redis channel '" + channel + "' sent '" + messageStr + "'");
      var msgHash = hash(new Buffer(message.data));

      // have we sent this message already?
      if( sentDatagramStack.indexOf(msgHash) < 0 ){
        debug("Adding "+msgHash);
        sentDatagramStack.unshift(msgHash);
        debug("<< Multicast message sent "+message.data);
        socket.send(new Buffer(message.data), 
          0, 
          message.data.length, 
          multicastPort, 
          multicastAddress, 
          function (err) {
            if (err) logger.error(err);
            debug("Message proxied locally");
          }
        );
      } else {
        debug( "duplicate message with hash: " + msgHash );
      }
    }
  });

  // channel name // TODO subscribe to multiple ports
  client.subscribe("port"+multicastPort);

  socket.bind(multicastPort, function() {
    socket.setMulticastLoopback(true);
    socket.setBroadcast(false);
    socket.addMembership(multicastAddress);
  });

  socket.on("message", function ( data, rinfo ) {
    debug(">> Multicast message received from ", rinfo, ":", data.toString());

    // check sent stack
    var myHash = hash(data);
    var messageIndex = sentDatagramStack.indexOf(hash(data));
    if( messageIndex < 0 ){
      // we are not the origin of this message, so we send to redis
      client.publish(
        "port"+multicastPort, 
        JSON.stringify({ 
          headers:{
            mulitcastPort:multicastPort,
            origin:clientId
          },
          data: data.toString()
        }));
      debug( 'publish message to redis' );
    } else {
      // remove the known item 
      /*logger.warn('removing '+sentDatagramStack[messageIndex]+' from stack');
      sentDatagramStack.splice(messageIndex, 1);*/
      debug("stack size: "+sentDatagramStack.length);
      while( sentDatagramStack.length > maxStackSize ){
        sentDatagramStack.pop();
      }
    }
  });

};
