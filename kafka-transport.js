'use strict';

var nid = require('nid');
var busOptions = { zkroot: 'localhost:2181', namespace: 'canon', start: 'all' };



module.exports = function( options ) {
  var seneca = this;
  var plugin = 'kafka-transport';
  var listenBus;
  var listenSlot;
  var clientBus;
  var clientSlot;


  options = seneca.util.deepextend({
    topicprefix:'seneca_',
    groupprefix:'seneca_',
    partition:0,
    queue: {
      brokers: [{
        host: 'localhost',
        port: 9092
      }],
      clientid:nid(),
      maxbytes:9999999
    }
  }, options);


  if (!seneca.hasplugin('transport')) {
    seneca.use('transport');
  }



  /**
   * TODO: topic name to come from config
   */
  function hookListenQueue(args, done) {
    var seneca = this;

    listenBus = require('./lib/kafka/bus')(busOptions);
    listenBus.setup(function(err) {
      if (err) {
        console.log(err);
      }

      listenBus.register({topicName: 'request'},
      function(err, slot) {
        if (err) { console.log(err); }
        listenSlot = slot;
      },
      function(message, respond) {
        if ('act' === message.request.kind) {
          seneca.act(message.request.act, function(err,res){
            var outmsg = {kind:'res',
                          id:message.request.id,
                          err:err?err.message:null,
                          res:res};
            respond(message, outmsg);
          });
        }
      });
    });
    seneca.log.info('listen', args.host, args.port, seneca.toString());
    done();
  }



  /**
   * TODO: topic name to come from config
   */
  function hookClientQueue( args, done ) {
    var seneca = this;
    var callmap = {};

    clientBus = require('./lib/kafka/bus')(busOptions);
    clientBus.setup(function(err) {

      if (err) {
        console.log(err);
      }

      clientBus.register({topicName: 'response', responseChannel: true},
      function(err, slot) {
        if (err) {
          console.log(err);
        }
        else {
          clientSlot = slot;

          var client = function(args, done) {
            var outmsg = {
              id:   nid(),
              kind: 'act',
              act:  args
            };
            callmap[outmsg.id] = {done:done};
            clientBus.request({topicName: 'request'}, outmsg);
          };
          seneca.log.info('client', 'pubsub', args.host, args.port, seneca.toString());
          done(null,client);
        }
      },
      function(message) {
        var call = callmap[message.response.id];
        if( call ) {
          delete callmap[message.response.id];
          call.done(message.response.err ? new Error(message.response.err) : null, message.response.res);
        }
      });
    });
  }



  var shutdown = function(args, done) {
    if (listenBus) {
      listenBus.deregister('request', listenSlot, function(err) {
        if (err) { console.log('shutdown error: ' + err); }
        done();
      });
    }
    else if (clientBus) {
      clientBus.deregister('response', clientSlot, function(err) {
        if (err) { console.log('shutdown error: ' + err); }
        done();
      });
    }
  };


  seneca.add({role:'transport',hook:'listen',type:'queue'}, hookListenQueue);
  seneca.add({role:'transport',hook:'client',type:'queue'}, hookClientQueue);
  seneca.add({role:'seneca',cmd:'close'}, shutdown);
 
  return {
    name: plugin,
  };
};

