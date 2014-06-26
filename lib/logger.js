var winston = require('winston');

// TODO add npm module 'winston-filerotatedate' so we don't blow up

var logger = new winston.Logger({
  transports:[
    new winston.transports.Console({
      level: 'verbose',
      handleExceptions: true,
      colorize: true
    })
  ],
  colors:{
    //info: 'blue'
  }
});

module.exports = logger;
