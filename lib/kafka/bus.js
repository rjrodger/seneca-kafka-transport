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
var uuid = require('uuid');



/**
 * bus interface
 */
module.exports = function(options) {
  assert(options);
  var _options;
  var _cfg;
  var _bus;
  var _responseChannel;



  /**
   * setup 
   */
  var setup = function(cb) {
    _cfg.setup(function(err) {
      var config = _cfg.get();
      config.bus = {};
      //config.bus.callback = receive;
      config.bus.error = error;
      _bus = require('./kafka-driver')(config);
      cb(err);
    });
  };



  /**
   * tear down the bus
   */
  var tearDown = function() {
    _bus.tearDown();
    _cfg.tearDown();
  };



  /**
   * register as a consumer on a topic / partition pair
   */
  var register = function(topic, cb, msgCb) {
    _cfg.register(topic.topicName, function(err, slot){
      if (topic.responseChannel) {
        _responseChannel = topic;
        _responseChannel.slot = slot;
      }
      _bus.register(topic, slot, function() { cb(err, slot); }, msgCb, respond);
    });
  };



  /**
   * deregister from the named topic and slot
   */
  var deregister = function(topicName, slot, cb) {
    _cfg.deregister(topicName, slot, cb);
  };



  /**
   * create a unique id for this request and place it onto the bus
   * create a matching entry in the callback table
   */
  var request = function(topic, req) {
    var id = uuid.v4();
    req.$id = id;
    console.log('REQUEST: ' + JSON.stringify(req));
    debugger;
    _bus.request(topic, req, _responseChannel);
  };



  /**
   * place a response onto the bus, ensuring that the response has the correct id
   * put this into the correct topic and partition as identified in the request
   */
  var respond = function(req, res) {
    if (req.request && req.request.$id) {
      res.$id = req.request.$id;
    }
    res.context = req.request;
    console.log('RESPOND: ' + JSON.stringify(res));
    _bus.respond(req, res);
  };



  /**
   * bus error handler
   */
  var error = function(err) {
    console.log('**********');
    console.log(err);
    console.log('**********');
  };



  /**
   * add default request channel for subsciption and create a unique id for this processes
   * response channel. Pass these to the bus for subscription.
   */
  var construct = function() {
    _options = options;
    _cfg = require('../config/config')(_options);
  };



  construct();
  return {
    setup: setup,
    register: register,
    deregister: deregister,
    request: request,
    respond: respond,
    error: error,
    tearDown: tearDown
  };
};

