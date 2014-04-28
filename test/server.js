'use strict';

var seneca = require('seneca')();

seneca
  .use('..', { kafka: { namespace: 'seneca', group: 'seneca', requestTopic: 'request', responseTopic: 'response'},
               microbial: { zkroot: 'localhost:2181', namespace: 'seneca', start: 'all'}})
  .use('foo')
  .listen( {type:'queue'} );


process.on('SIGINT', function() {
  seneca.close(function() {
    process.exit();
  });
});

