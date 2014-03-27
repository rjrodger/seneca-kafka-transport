var nid = require('nid')

require('seneca')()
  .use('..')
  .client({type:'queue',partition:1})
  .ready(function(){
    var seneca = this
    seneca.act({foo:2,bar:'B',nid:nid()},function(err,out){console.log(out)})
  })
