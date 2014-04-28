'use strict';

var options = { zkroot: 'localhost:2181', namespace: 'seneca', start: 'config' };

var mcb = require('microbial')(options);

mcb.setup(function(err) {
  if (!err || (err && err.name && err.name === 'config_block_not_available')) {
    console.log('updating config');
    var config = mcb.blankConfig();
    mcb.addBrokerToConfig(config, 'localhost', 9092, 2000000);
    mcb.addTopicToConfig(config, 'request', 'queue', 3, 'roundRobin');
    mcb.addTopicToConfig(config, 'response', 'queue', 3, 'direct');

    console.log(JSON.stringify(config, null, 2));
    mcb.writeConfig(config, function(err) {
      mcb.tearDown();
      if (err) {
        console.log(err);
      }
      console.log('done');
    });
  }
  else {
    console.log(err);
  }
});

