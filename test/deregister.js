'use strict';

var options = { zkroot: 'localhost:2181', namespace: 'seneca', start: 'config' };

var mcb = require('microbial')(options);

mcb.setup(function(err) {
  if (!err || (err && err.name && err.name === 'config_block_not_available')) {
    mcb.deregisterAll('seneca', 'request', function() {
      mcb.deregisterAll('seneca', 'response', function() {
        mcb.tearDown();
        if (err) {
          console.log(err);
        }
        console.log('done');
      });
    });
  }
  else {
    console.log(err);
  }
});

