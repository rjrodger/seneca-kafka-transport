var nid = require('nid')

require('seneca')()
  .use('..')
  .client({type:'queue',partition:0})
  .ready(function(){
    var seneca = this
    seneca.act({foo:1,bar:'A',nid:nid()},function(err,out){console.log(out)})
  })
