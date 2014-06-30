var os     = require('os');
var xxhash = require('xxhash');
var dgram  = require('dgram');
var socket = dgram.createSocket('udp4'); // TODO IPv6 as config option?

var redis  = require('haredis');
var logger = require('./logger');
var log    = logger.info;

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

  client.on('message', function( channel, message ){
    // ignore messages that this client sent
    if( message.headers.origin != clientId ){
      log("Redis channel '" + channel + "' sent '" + message + "'");
      message = JSON.parse( message );
      var msgHash = hash(new Buffer(message.data));

      // have we sent this message already?
      if( sentDatagramStack.indexOf(msgHash) >= 0 ){
        logger.warn("Adding "+msgHash);
        sentDatagramStack.push(msgHash);
        log("<< Multicast message sent "+message.data);
        socket.send(new Buffer(message.data), 
          0, 
          message.data.length, 
          multicastPort, 
          multicastAddress, 
          function (err) {
            if (err) log(err);
            log("Message proxied locally");
          }
        );
      }
    }
  });

  // channel name
  client.subscribe("port"+multicastPort);

  socket.bind(multicastPort, function() {
    socket.setMulticastLoopback(true);
    socket.setBroadcast(false);
    socket.addMembership(multicastAddress);
  });

  socket.on("message", function ( data, rinfo ) {
    log(">> Multicast message received from ", rinfo, ":", data.toString());

    // check sent stack
    var myHash = hash(data);
    var messageIndex = sentDatagramStack.indexOf(hash(data));
    if( messageIndex < 0 ){
      //log(myHash+" is not in sentDatagramStack");

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
    } else {
      // remove the known item 
      logger.warn('removing '+sentDatagramStack[messageIndex]+' from stack');
      sentDatagramStack.splice(messageIndex, 1);
      log("stack size: "+sentDatagramStack.length);
      while( sentDatagramStack.length > maxStackSize ){
        sentDatagramStack.pop();
      }
    }
  });

};
