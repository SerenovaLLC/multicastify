var os = require('os');

var dgram = require('dgram');
var socket = dgram.createSocket('udp4'); // IPv6 as config option?

var redis = require('haredis');
var nodes = ['172.17.8.101:6379','172.17.8.101:6380'];
var client = redis.createClient(nodes);

// TODO replace with logging framework
var log = console.log;

var clientId = os.networkInterfaces().en1[1].address+":"+process.pid;

// TODO remove. Should come from command line params
var testMessage = "[hello world] pid: " + process.pid;
var multicastAddress = '224.0.0.1';
var multicastPort = 5554;


client.on('subscribe', function( channel, count ){
 log("subscribed to channel:" + channel ); 
 //client.publish("port48807:asdfasdf", testMessage);
});

client.on('message', function( channel, message ){
  log("channel '" + channel + "' sent '" + message + "'");
  message = JSON.parse( message );

  // ignore messages that this client sent
  if( message.headers.origin != clientId ){
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
});

// TODO port should come from command line parameters
client.subscribe("port48807");

socket.bind(multicastPort, function() {
  socket.setMulticastLoopback(false);
  socket.addMembership(multicastAddress);
});

socket.on("message", function ( data, rinfo ) {
  log("Multicast message received from ", rinfo, ":", data.toString());
  client.publish(
    "port48807", 
    JSON.stringify({ 
      headers:{
        origin:clientId
      },
      data: data.toString()
    }));
});

// send test message to multicast
socket.send(new Buffer(testMessage), 
  0, 
  testMessage.length, 
  multicastPort, 
  multicastAddress, 
  function (err) {
    if (err) log(err);
    log("Multicast message sent");
  }
);

