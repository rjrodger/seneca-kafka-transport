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

/*
 * Sample configuration 
 * creates topology settings in zookeeper and removes all service registrations
 */

'use strict';

var options = { zkroot: 'localhost:2181', namespace: 'canon', start: 'config' };
var cfg = require('../lib/config/config')(options);

cfg.setup(function(err) {
  if (!err || (err && err.name && err.name === 'config_block_not_available')) {
    console.log('updating config');
    var config = cfg.blankConfig();
    cfg.addBroker(config, 'localhost', 9092, 2000000);
    cfg.addTopic(config, 'request', 'queue', 'request', 3, 'roundRobin');
    cfg.addTopic(config, 'response', 'queue', 'response', 2, 'direct');

    console.log(JSON.stringify(config, null, 2));
    cfg.write(config, function(err) {
      cfg.deregisterAll('request', function() {
        cfg.deregisterAll('response', function() {
          cfg.tearDown();
          if (err) {
            console.log(err);
          }
          console.log('done');
        });
      });
    });
  }
  else {
    console.log(err);
  }
});


