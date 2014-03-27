/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var buffer = require('buffer')
var util   = require('util')

var _     = require('underscore')
var kafka = require('Kafkaesque')

var nid = require('nid')




module.exports = function( options ) {
  var seneca = this
  var plugin = 'kafka-transport'
  
  

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
  },options)


  if( !seneca.hasplugin('transport' ) ) {
    seneca.use( 'transport' )
  }


  seneca.add({role:'transport',hook:'listen',type:'queue'}, hook_listen_queue)
  seneca.add({role:'transport',hook:'client',type:'queue'}, hook_client_queue)





  

  function hook_listen_queue( args, done ) {
    var seneca = this

    var brokers = options.queue.brokers

    var in_opts = {
      group:    options.groupprefix+'listen',
      brokers:  options.queue.brokers,
      clientId: options.queue.clientid+'~LISTEN_IN',
      maxBytes: options.queue.maxbytes,
    }

    var out_opts = {
      brokers:  options.queue.brokers,
      clientId: options.queue.clientid+'~LISTEN_OUT',
      maxBytes: options.queue.maxbytes,
    }


    var kafka_in  = kafka(in_opts)
    var kafka_out = kafka(out_opts)

    kafka_in.tearUp(function(err){
      if(err) return done(err);
      
      kafka_out.tearUp(function(err){
        if(err) return done(err);

        kafka_in.metadata({topic:options.topicprefix+'act',}, function(err, metadata) {
          if( err) return done(err);

          var partition = args.partition

          kafka_in.poll({
            topic:options.topicprefix+'act',
            partition:partition
          }, function(err, k){
            if(err) return done(err);
            
            k.on('message', function(message,commit){
              commit()

              try {
                var data = JSON.parse(message.value)
              }
              catch(e) {
                console.log(e)
                return
              }

              if( 'act' == data.kind ) {
                seneca.act(data.act,function(err,res){
                  var outmsg = {
                    kind:'res',
                    id:data.id,
                    err:err?err.message:null,
                    res:res
                  }

                  var out_topic = options.topicprefix+'res'

                  kafka_out.metadata({topic:out_topic}, function(err, metadata) {

                    var addr = { topic: out_topic, partition: data.partition }

                    kafka_out.produce(addr, [ JSON.stringify(outmsg) ], function(err, response) {
                        err && console.log(err);
                      })
                  })
                })
              }
            })

            k.on('error', function(err) {
              console.dir(err)
            })
          })
        })
      })
    })

    seneca.log.info('listen', 'queue', 'kafka', options.queue, seneca.toString())

    done()
  }



  function hook_client_queue( args, done ) {
    var seneca = this

    var brokers = options.queue.brokers

    var out_opts = {
      brokers:  options.queue.brokers,
      clientId: options.queue.clientid+'~CLIENT_OUT',
      maxBytes: options.queue.maxbytes,
    }

    var in_opts = {
      brokers:  options.queue.brokers,
      clientId: options.queue.clientid+'~CLIENT_IN',
      maxBytes: options.queue.maxbytes,
    }

    var callmap = {}

    var kafka_in  = kafka(in_opts)
    var kafka_out = kafka(out_opts)


    //var in_topic = options.topicprefix+'res_'+options.queue.clientid
    var in_topic = options.topicprefix+'res'

    kafka_in.tearUp(function(err){
      if(err) return done(err);

      kafka_in.metadata({topic:in_topic}, function(err, metadata) {
        if( err ) return done(err);

        var partition = args.partition

        kafka_in.poll({
          topic:in_topic,
          partition:partition

        }, function(err, k){
          if(err) return done(err);
          
          k.on('message', function(message,commit){
            commit()

            try {
              var data = JSON.parse(message.value)
            }
            catch(e) {
              console.log(e)
              return
            }

            if( 'res' == data.kind ) {
              var call = callmap[data.id]

              if( call ) {
                delete callmap[data.id]
                call.done( data.err ? new Error(data.err) : null, data.res )
              }
            }
          })

          k.on('error', function(err) {
            console.dir(err)
          })
        })
      })
    })


    kafka_out.tearUp(function(err){
      if(err) return done(err);

      kafka_out.metadata({topic:options.topicprefix+'act'}, function(err, metadata) {
        if( err ) return done(err);

        var partition = args.partition

        var client = function( args, done ) {
          var outmsg = {
            id:        nid(),
            kind:      'act',
            client:    options.queue.clientid,
            partition: partition,
            act:       seneca.util.clean(args)
          }


          var outstr = JSON.stringify(outmsg)
          callmap[outmsg.id] = {done:done}

          var addr = {topic:options.topicprefix+'act', partition: partition}

          kafka_out.produce( addr, [ outstr ], function(err, response) {
            err && console.log(err);
          })

          partition += 1
          partition = partition % 2
        }


        seneca.log.info('listen', 'client', 'kafka', options.queue, seneca.toString())

        done(null,client)
      })
    })
  }


  return {
    name: plugin,
  }
}
