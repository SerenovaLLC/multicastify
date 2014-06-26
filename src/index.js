var os     = require('os');
var xxhash = require('xxhash');
var crypto = require('crypto');
var dgram  = require('dgram');
var socket = dgram.createSocket('udp4'); // IPv6 as config option?

var redis  = require('haredis');
var nodes  = ['172.17.8.101:6379','172.17.8.101:6380'];
var client = redis.createClient(nodes);

// TODO replace with logging framework
var logger = require('./logger');
var log    = logger.info;

var hash = function(str){
  //return xxhash.hash(new Buffer(str+process.pid), 0xCAFEBEEF);
  var md5 = crypto.createHash('md5');
  return crypto.createHash('md5').update(str+process.pid).digest("hex");
}

//var clientId = os.networkInterfaces().en1[1].address+":"+process.pid;
var clientId = "192.168.1.1:"+process.pid;

// TODO remove. Should come from command line params
var testMessage = "CCBM;10.200.4.34,6268;heartbeat;role=callmanager;seq=35923;tstamp="+Date.now();
var multicastAddress = '224.0.0.1';
var multicastPort = 48812;
var messageIndex = 0;

var maxStackSize = 10;
var sentDatagramStack = [];

client.on('subscribe', function( channel, count ){
 log("subscribed to channel:" + channel ); 
 //client.publish("port48807:asdfasdf", testMessage);
});

client.on('message', function( channel, message ){
  log("Redis channel '" + channel + "' sent '" + message + "'");
  message = JSON.parse( message );

  // ignore messages that this client sent
  if( message.headers.origin != clientId ){
    var msgHash = hash(new Buffer(message.data));

    // have we sent this message already?
    if( sentDatagramStack.indexOf(msgHash) >= 0 ){
      logger.warn("Adding "+msgHash);
      sentDatagramStack.push(msgHash);
      if( messageIndex++ > maxStackSize ){
        log( sentDatagramStack );
        process.nextTick(process.exit(1));
      }
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

// TODO port should come from command line parameters
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
          origin:clientId
        },
        data: data.toString()
      }));
  } else {
    // remove the known item 
    logger.error('removing '+sentDatagramStack[messageIndex]+' from stack');
    sentDatagramStack.splice(messageIndex, 1);
    log("stack size: "+sentDatagramStack.length);
    while( sentDatagramStack.length > maxStackSize ){
      sentDatagramStack.pop();
    }
  }
});

// send test message to multicast
sentDatagramStack.push(hash(new Buffer(testMessage)));
logger.warn("Test is Adding "+hash(new Buffer(testMessage)));
socket.send(new Buffer(testMessage), 
  0, 
  testMessage.length, 
  multicastPort, 
  multicastAddress, 
  function (err) {
    if (err) log(err);
    log("Multicast test message sent");
  }
);

