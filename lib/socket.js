var os     = require('os');
var dgram  = require('dgram');
var hash   = require('./utils').hash;
var log    = require('./logger');

var Socket = function(){
  this.endpoints = [];
  this.clientId = require('./utils').getClientId;
  this.send = function(){};
  this.pubsub = function(){};
}

var MulticastSocket = function(conf){
  var that = this;
  var maxStackSize = 10;
  var messageIndex = 0;

  this.sentDatagramStack = [];
  this.endpoints = conf.multicastEndpoints;

  // This function is returning another function. This is so the value of 
  // 'endpoint' can be specific to each channel and the messages published back 
  // to the correct IP:PORT combination of each endpoint.
  function generateMessageCallback( endpoint ){
    return function gotDatagramMessage ( data, rinfo ) {
      log.debug(">> Multicast message received from ", 
        rinfo, ":", data.toString()
      );

      // check sent stack
      var messageIndex = that.sentDatagramStack.indexOf(hash(data));
      if( messageIndex < 0 ){
        // we are not the origin of this message, so we send to pubsub
        that.pubsub.publish(
          endpoint.channelName, 
          JSON.stringify({ 
            headers:{
              multicastAddress:endpoint.ip,
              multicastPort:endpoint.port,
              origin: that.clientId
            },
            data: data.toString()
          }));
        log.debug('Publish message to pubsub',endpoint.channelName);
      } else {
        //log.debug("stack size: "+sentDatagramStack.length);

        // Trim the stack size
        while( that.sentDatagramStack.length > that.maxStackSize ){
          that.sentDatagramStack.pop();
        }
      }
    };
  }

  this.send = function(channelName, message){
    log.debug("Trying to broadcast " + JSON.stringify(message) );
    // Find the endpoint and broadcast to its socket
    // NOTE: This is iterating thorugh all the endpoints assuming they could 
    // have duplicate names.
    for( i in that.endpoints){
      if( that.endpoints[i].channelName === channelName ){
        log.debug("<< Multicast message sent ",message);
        log.debug("port type",typeof message.headers.multicastPort);
        log.debug( JSON.stringify(message) );
        that.endpoints[i].socket.send(new Buffer(message.data), 
          0, 
          message.data.length, 
          parseInt(message.headers.multicastPort), 
          message.headers.multicastAddress, 
          function (err) {
            if (err) log.error(err);
            log.debug("Message proxied locally to ", channelName);
          }
        );
      }
    }
  };

  function socketBind(endpoint){
    var sock = dgram.createSocket('udp4'); 
    sock.bind(endpoint.port, function() {
      sock.setMulticastLoopback(true);
      sock.setBroadcast(false);
      sock.addMembership(endpoint.ip);
      log.info('Listening to '+endpoint.ip+':'+endpoint.port);
    });
    sock.on("message", generateMessageCallback(endpoint));
    return sock;
  }

  this.init = function(){
    for( i in this.endpoints ){
      that.endpoints[i].socket = socketBind( this.endpoints[i] );
    }
  }
}
MulticastSocket.prototype = new Socket();

module.exports = MulticastSocket;

