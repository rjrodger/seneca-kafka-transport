'use strict';

var nid = require('nid');

module.exports = function(options) {
  var seneca = this;
  var plugin = 'kafka-transport';
  var listenBus;
  var clientBus;

  if (!seneca.hasplugin('transport')) {
    seneca.use('transport');
  }

  function hookListenQueue(args, done) {
    listenBus = require('microbial')(options.microbial);

    var handlerFn = function(req, res) {
      seneca.act(req.request.act, function(err, result){
        var outmsg = {kind:'res',
                      id:req.request.id,
                      err:err?err.message:null,
                      res:result};
        res.respond(outmsg);
      });
    };
    listenBus.run([{group: options.kafka.group, topicName: options.kafka.requestTopic}],
                  [{ match: { kind: 'act' }, execute: handlerFn}], function(err) {
      if (err) { return console.log(err); }
      seneca.log.info('listen', args.host, args.port, seneca.toString());
      done();
    });
  }

  function hookClientQueue(args, done) {
    var seneca = this;
    var callmap = {};
    clientBus = require('microbial')(options.microbial);

    function send(args, done) {
      var outmsg = {
        id:   nid(),
        kind: 'act',
        act:  args
      };
      callmap[outmsg.id] = {done:done};
      clientBus.request({topicName: options.kafka.requestTopic}, outmsg, function(res) {
        var call = callmap[res.response.id];
        if( call ) {
          delete callmap[res.response.id];
          call.done(res.response.err ? new Error(res.response.err) : null, res.response.res);
        }
      });
    }

    function match(args) {
      return true;
    }

    clientBus.run([{group: options.kafka.group, topicName: options.kafka.responseTopic, responseChannel: true}], [], function(err) {
      if (err) {
        return done(err)
      }

      seneca.log.info('client', 'pubsub', args.host, args.port, seneca.toString());
      done(null, {send: send, match: match});
    });
  }

  var shutdown = function(args, done) {
    if (listenBus) {
      listenBus.tearDown(function(err) {
        done(err);
      });
    }
    else if (clientBus) {
      clientBus.tearDown(function(err) {
        done(err);
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

