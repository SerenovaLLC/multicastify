var xxhash = require('xxhash');

var hash = function(str){
  return xxhash.hash(new Buffer(str+process.pid), 0xCAFEBEEF);
}
var getClientId = function(){
  var interfaces = Object.keys(os.networkInterfaces());
  for( i in interfaces ){
    var curInterface = os.networkInterfaces()[interfaces[i]];
    for( j in curInterface ){
      if( curInterface[j].family == 'IPv4' // TODO fix for IPv6 support?
          && curInterface[j].internal == false ){
        return curInterface[j].address + process.pid;
      }
    }
  }
}

module.exports = {
  hash: hash,
  getClientId: getClientId
};
