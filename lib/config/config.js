/*
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY EXPRESSED OR IMPLIED
 * WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT,
 * INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
 * IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

'use strict';

var assert = require('assert');
var _ = require('underscore');
var zk = require('node-zookeeper-client');
var cf = require('./cfg')();


/**
 * config interface
 *
 * read and write configuration to/from zookeeper
 * options: { zkroot: 'localhost:2181'
 *            namespace: 'namespace' }
 */
module.exports = function(options) {
  assert(options);
  assert(options.zkroot);
  assert(options.namespace);

  var _options = options;
  var _config;
  var _client;



  /**
   * read the namespace key value and place a watcher to update config on
   * data change
   */
  var readAndWatchNamespace = function(namespace, cb) {
    _client.getData(_options.rootPath,
    function (evt) {
      if (evt.getName() === 'NODE_CREATED' || evt.getName() === 'NODE_DATA_CHANGED') {
        _client.getData(evt.getPath(), function(err, data) {
          if (!err) { _config = JSON.parse(data.toString('utf8')); }
        });
      }
    },
    function (err, data) {
      if (err) { return cb(err); }
      if (data) {
        _config = JSON.parse(data.toString('utf8'));
      }
      cb(null, data);
    });
  };



  /**
   * tear up connection to zk
   */
  var setup = function(cb) {
    _options = options;
    _options.rootPath = '/' + options.namespace;
    _client = zk.createClient(options.zkroot, { sessionTimeout: 300000, spinDelay : 1000, retries : 10 });
    _client.once('connected', function () {
      _client.exists(_options.rootPath, function(err, exists) {
        if (err) { return cb(err); }
        if (exists) {
          readAndWatchNamespace(_options.rootPath, function(err, data) {
            if (err) { return cb(err); }
            cb(null, data);
          });
        }
        else {
          cb({ name: 'config_block_not_available' });
        }
      });
    });
    _client.connect();
  };



  /**
   * tear down zk connection
   */
  var tearDown = function() {
    _client.close();
  };



  /**
   * return the config block
   */
  var get = function() {
    return _config;
  };



  /**
   * write the config block
   */
  var write = function(config, cb) {
    _client.exists(_options.rootPath, function(err, exists) {
      if (err) { return cb(err); }
      if (!exists) {
        _client.create(_options.rootPath,
                       new Buffer(JSON.stringify(config)),
                       function(err) {
                          cb(err);
                        });
      }
      else {
        _client.setData(_options.rootPath, new Buffer(JSON.stringify(config)), function(err) {
          cb(err);
        });
      }
    });
  };



  /**
   * check if there is an available slot for a client to register
   * for queue based semantics
   *
   * better imp is to poll all of the nodes...
   */
  var slot = function(topic, idx, cb) {
    if (topic.semantics !== 'queue') {
      cb(null, {available: true, index: 0}); //TODO: fix this us a random number between 0 and parition count for pubsub balance
    }
    else {
      if (idx < topic.partitions) {
        _client.exists(_options.rootPath + '/' + topic.name + '/' + idx, function(err, exists) {
          if (err) { return cb(err); }
          if (exists) {
            slot(topic, idx + 1, cb);
          }
          else {
            cb(null, {available: true, index: idx});
          }
        });
      }
      else {
        cb(null, {available: false});
      }
    }
  };



  /**
   * register a client as responsible for a partition
   * more efficent would be to listen to child changes and keep a cache of available slots - v 0.2
   */
  var register = function(topicName, cb) {

    var topic = _.find(_config.topology.topics, function(t) {
      return t.name === topicName;
    });
    assert(topic);
    
    slot(topic, 0, function(err, result) {
      if (err) { return cb(err); }
      if (result.available) {
        _client.create(_options.rootPath + '/' + topicName, function(err) {
          if (err && err.name !== 'NODE_EXISTS') { return cb(err); } // TODO: clean this up
          _client.create(_options.rootPath + '/' + topicName + '/' + result.index, function(err) {
            if (err) { return cb(err); }
            cb(null, result.index);
          });
        });
      }
      else {
        cb('no slots available', -1);
      }
    });
  };



  /**
   * deregister a client as responsible for a partition
   */
  var deregister = function(topicName, index, cb) {
    _client.exists(_options.rootPath, function(err, exists) {
      if (exists) {
        _client.remove(_options.rootPath + '/' + topicName + '/' + index, function(err) {
          if (err) { return cb(err, index); }
          cb(err, index);
        });
      }
      else {
        cb(err, index);
      }
    });
  };



  /**
   * deregister all clients - use for debug only
   */
  var deregisterAll = function(topicName, cb) {
    var topic = _.find(_config.topology.topics, function(t) {
      return t.name === topicName;
    });
    assert(topic);
    
    for (var idx = 0; idx < topic.partitions; ++idx) {
      deregister(topicName, idx, function(err, index) {
        if (index === topic.partitions - 1) {
          cb(err);
        }
      });
    }
  };



  return {
    setup: setup,
    get: get,
    write: write,
    register: register,
    deregister: deregister,
    tearDown: tearDown,
    deregisterAll: deregisterAll,
    blankConfig: function() { return cf.blank(_options); },
    addTopic: function(config, name, semantics, group, partitionCount, produceAlgorithm) { cf.addTopic(config, name, semantics, group, partitionCount, produceAlgorithm); },
    addBroker: function(config, hostname, port, maxBytes) { cf.addBroker(config, hostname, port, maxBytes); },
    setMaxBytes: function(config, maxBytes) { cf.seMaxBytes(config, maxBytes); },
    setClientId: function(config, clientId) { cf.setClientId(config, clientId); }
  };
};

