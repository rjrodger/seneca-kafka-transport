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

var _ = require('underscore');
var assert = require('assert');


/**
 * microbial kafka.js driver
 */
module.exports = function(config) {
  assert(config && config.bus && config.topology.topics);

  var _config = config;
  var _sender;
  var _sendCtrl = {};
  var _listeners = { topics: {} };


  //TODO: needs to pick up dynamic config and then round robin accordingly
  /**
   * place a request onto kafka
   */
  var request = function(topic, req, responseChannel) {
    var topicConfig;
    var partition = 0;

    if (!_sendCtrl[topic.topicName]) {
      topicConfig = _.find(_config.topology.topics, function(t) {
        return t.name === topic.topicName;
      });
      _sendCtrl[topic.topicName] = topicConfig;
    }

    if (_sendCtrl[topic.topicName].produce === 'roundRobin') {
      if (!_sendCtrl[topic.topicName].rrIndex && _sendCtrl[topic.topicName].rrIndex !== 0) {
        _sendCtrl[topic.topicName].rrIndex = 0;
      }
      else {
        if (_sendCtrl[topic.topicName].rrIndex < _sendCtrl[topic.topicName].partitions - 1) {
          _sendCtrl[topic.topicName].rrIndex += 1;
        }
        else {
          _sendCtrl[topic.topicName].rrIndex = 0;
        }
      }
      partition = _sendCtrl[topic.topicName].rrIndex;
    }

    if (_sendCtrl[topic.topicName].produce === 'random') {
      // TODO: random partition selection
    }

    if (_sendCtrl[topic.topicName].produce === 'direct') {
      // TODO: direct partition selection - response channels only I think so can be ignored
    }

    _sender.produce({topic: topic.topicName, partition: partition},
                    JSON.stringify({request: req, $inf: {type: 'request', respondTo: {topicName: responseChannel.topicName, slot: responseChannel.slot}}}),
                    function(err/*, response*/) {
      if (err) { _config.bus.error(err); }
    });
  };



  /**
   * place a response onto kafka
   */
  var respond = function(req, res) {
    _sender.produce({topic: req.$inf.respondTo.topicName, partition: req.$inf.respondTo.slot}, JSON.stringify({response: res, $inf: {type: 'response'}}), function(err/*, response*/) {
      if (err) { _config.bus.error(err); }
    });
  };



  /**
   * register for messages on a given topic and partition 
   */
  var register = function(topic, partition, cb, msgCb, respondFn) {

    var topicConfig = _.find(_config.topology.topics, function(t) {
      return t.name === topic.topicName;
    });
    _listeners.topics[topic.topicName] = { name: topic.topicName, parition: partition, group: topicConfig.group };

    _listeners.topics[topic.topicName].listener = require('kafkaesque')(_config);
    var l = _listeners.topics[topic.topicName].listener;
    l.tearUp(function() {
      l.poll({topic: topic.topicName, partition: partition}, function(err, kafka) {
        if (err) { return _config.bus.error(err); }
        kafka.on('message', function(message, commit) {
          var reqData = JSON.parse(message.value);
          msgCb(reqData, respondFn);
          commit();
        });
        kafka.on('error', function(error) {
          _config.bus.error(error);
        });
      });
      cb();
    });
  };



  var construct = function() {
    _sender = require('kafkaesque')(_config);
    _sender.tearUp(function() {});
  };


  construct();
  return {
    register: register,
    request: request,
    respond: respond,
    //tearDown: tearDown
  };
};


