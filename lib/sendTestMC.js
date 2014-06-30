var dgram  = require('dgram');
var socket = dgram.createSocket('udp4'); // IPv6 as config option?

var testMessage = "CCBM;10.200.4.34,6268;heartbeat;role=callmanager;seq=35923;tstamp="+Date.now();
var multicastAddress = '224.0.0.1';
var multicastPort = 48812;

var log = console.log;

/*socket.bind(multicastPort, function() {
  socket.setMulticastLoopback(true);
  socket.setBroadcast(false);
  socket.addMembership(multicastAddress);
});*/

// send test message to multicast
socket.send(new Buffer(testMessage), 
  0, 
  testMessage.length, 
  multicastPort, 
  multicastAddress, 
  function (err) {
    if (err) log(err);
    log("Multicast test message sent");
    process.exit(0);
  }
);

