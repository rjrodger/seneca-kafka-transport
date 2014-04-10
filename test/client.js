'use strict';

var nid = require('nid');
var seneca = require('seneca')();

seneca
   .use('..')
  .client({type:'queue'})
  .ready(function(){
    var s= this;
    setInterval(function() {
      s.act({foo:1,bar:'A',nid:nid()},function(err,out){console.log(out);});
    }, 2000);
  });


process.on('SIGINT', function() {
  seneca.close(function() {
    process.exit();
  });
});

