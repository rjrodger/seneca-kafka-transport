require('seneca')()
  .use('..')
  .use('foo')
  .listen( {type:'queue',partition:0} )
