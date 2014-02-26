/* Copyright (c) 2014 Richard Rodger, MIT License */
"use strict";


var buffer = require('buffer')
var util   = require('util')

var _           = require('underscore')
var async       = require('async')
var patrun      = require('patrun')
var connect     = require('connect')
var request     = require('request')
var zmq         = require('zmq')

var nid = require('nid')




module.exports = function( options ) {
  var seneca = this
  var plugin = 'zmq-transport'
  
  

  options = seneca.util.deepextend({
    msgprefix:'seneca_',
    pubsub: {
      listenpoint: 'tcp://127.0.0.1:10201',
      clientpoint: 'tcp://127.0.0.1:10202'
    }
  },options)


  if( !seneca.hasplugin('transport' ) ) {
    seneca.use( 'transport' )
  }


  seneca.add({role:'transport',hook:'listen',type:'pubsub'}, hook_listen_pubsub)
  seneca.add({role:'transport',hook:'client',type:'pubsub'}, hook_client_pubsub)




  function parseConfig( args ) {
    var out = {}

    var config = args.config || args
    var base = options.direct

    if( _.isArray( config ) ) {
      var arglen = config.length

      if( 0 === arglen ) {
        out.port = base.port
        out.host = base.host
        out.path = base.path
      }
      else if( 1 === arglen ) {
        if( _.isObject( config[0] ) ) {
          out = config[0]
        }
        else {
          out.port = parseInt(config[0])
          out.host = base.host
          out.path = base.path
        }
      }
      else if( 2 === arglen ) {
        out.port = parseInt(config[0])
        out.host = config[1]
        out.path = base.path
      }
      else if( 3 === arglen ) {
        out.port = parseInt(config[0])
        out.host = config[1]
        out.path = config[2]
      }

    }
    else out = config;

    out.type = null == out.type ? base.type : out.type

    if( 'direct' == out.type ) {
      out.port = null == out.port ? base.port : out.port 
      out.host = null == out.host ? base.host : out.host
      out.path = null == out.path ? base.path : out.path
    }

    return out
  }


  // only support first level
  function handle_entity( raw ) {
    raw = _.isObject( raw ) ? raw : {}
    
    if( raw.entity$ ) {
      return seneca.make$( raw )
    }
    else {
      _.each( raw, function(v,k){
        if( _.isObject(v) && v.entity$ ) {
          raw[k] = seneca.make$( v )
        }
      })
      return raw
    }
  }


  
  var mark = '~'
  


  function hook_listen_pubsub( args, done ) {
    var seneca = this

    var listenpoint = options.pubsub.listenpoint
    var clientpoint = options.pubsub.clientpoint

    var zmq_in  = zmq.socket('pull')
    var zmq_out = zmq.socket('push')

    zmq_in.identity  = 'listen-sub-'+process.id
    zmq_out.identity = 'listen-pub-'+process.id

    zmq_out.bind(clientpoint)


    zmq_in.connect(listenpoint, function(err){
      if( err ) return done(err);
    })



    if( args.pin ) {
      var pins = _.isArray(args.pin) ? args.pin : [args.pin]
      _.each( seneca.findpins( pins ), function(pin){
        var pinstr = options.msgprefix+util.inspect(pin)
        //zmq_in.subscribe(pinstr)
      })
    }

    //zmq_in.subscribe(options.msgprefix+'all')


    zmq_in.on('message',function(msgstr){
      msgstr = ''+msgstr
      var index = msgstr.indexOf(mark)
      var channel = msgstr.substring(0,index)
      var data = JSON.parse(msgstr.substring(index+1))

      if( 'act' == data.kind ) {
        seneca.act(data.act,function(err,res){
          var outmsg = {
            kind:'res',
            id:data.id,
            err:err?err.message:null,
            res:res
          }
          var outstr = JSON.stringify(outmsg)
          zmq_out.send(channel+mark+outstr)
        })
      }
    })


    seneca.log.info('listen', 'pubsub', 'zmq', listenpoint, clientpoint, seneca.toString())

    done()
  }



  function hook_client_pubsub( args, done ) {
    var seneca = this

    var listenpoint = options.pubsub.listenpoint
    var clientpoint = options.pubsub.clientpoint

    var zmq_in  = zmq.socket('pull')
    var zmq_out = zmq.socket('push')

    var callmap = {}

    zmq_in.identity  = 'client-sub-'+process.id
    zmq_out.identity = 'client-pub-'+process.id

    zmq_out.bind(listenpoint, function(err){
      if( err ) return done(err);
    })

    zmq_in.connect(clientpoint, function(err){
      if( err ) return done(err);
    })


    zmq_in.on('message',function(msgstr){
      msgstr = ''+msgstr

      var index = msgstr.indexOf(mark)
      var channel = msgstr.substring(0,index)
      var data = JSON.parse(msgstr.substring(index+1))

      if( 'res' == data.kind ) {
        var call = callmap[data.id]
        if( call ) {
          delete callmap[data.id]

          call.done( data.err ? new Error(data.err) : null, data.res )
        }
      }
    })

    var client = function( args, done ) {
      var outmsg = {
        id:   nid(),
        kind: 'act',
        act:  args
      }
      var outstr = JSON.stringify(outmsg)
      callmap[outmsg.id] = {done:done}

      var actmeta = seneca.findact(args)
      if( actmeta ) {
        var actstr = options.msgprefix+util.inspect(actmeta.args)
        zmq_out.send(actstr+mark+outstr)
      }
      else {
        zmq_out.send(options.msgprefix+'all'+mark+outstr)
      }
    }


    if( args.pin ) {
      var pins = _.isArray(args.pin) ? args.pin : [args.pin]
      _.each( seneca.findpins( pins ), function(pin){
        var pinstr = options.msgprefix+util.inspect(pin)
        seneca.add(pin,client)
        //zmq_in.subscribe(pinstr)
      })
    }

    //zmq_in.subscribe(options.msgprefix+'all')    



    seneca.log.info('client', 'pubsub', 'zmq', listenpoint, clientpoint, seneca.toString())

    done(null,client)
  }






  return {
    name: plugin,
  }
}
