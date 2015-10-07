![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js][] transport plugin

# seneca-kafka-transport
[![Build Status][travis-badge]][travis-url]
[![Gitter][gitter-badge]][gitter-url]

[![js-standard-style][standard-badge]][standard-style]

A transport plugin that uses [Kafka][] as it's engine. It may also be used as an 
example on how to implement a transport plugin for Seneca.

- __Version:__ 0.2.4
- __Tested on:__ Seneca 0.5.16
- __Node:__ 0.10, 0.11, 0.12, 4

If you're using this module, and need help, you can:

- Post a [github issue][],
- Tweet to [@senecajs][],
- Ask on the [Gitter][gitter-url].

If you are new to Seneca in general, please take a look at [senecajs.org][]. We have everything from
tutorials to sample apps to help get you up and running quickly.

## Install
To install, simply use npm. Remember you will need to install [Seneca.js][] if you haven't already.

```
npm install seneca
npm install seneca-kafka-transport
```

## Test
To run tests, simply use npm:

```
npm run test
```

## Example
To run the example code:

Download the latest Kafka build from the [Kafka builds][] page, (tested on 0.8.1).
Unpack and follow the build instructions to create Kafka binaries for your system.
Move to the kafka directory.

```
cd kafka-0.8.1-src/kafka
```

Start zookeeper.

```
nohup bin/zookeeper-server-start.sh config/zookeeper.properties >zk.log 2>&1 &
```

Start kafka.

```
nohup bin/kafka-server-start.sh config/server.properties >kafka1.log 2>&1 &
```

Create a request topic.

```
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 3 --topic request
```

Create a reponse topic.

```
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 3 --topic response
```

Move into the module test folder.

```
cd seneca-kafka-transport/test
```

Initialize the zookeeper configuration.

```
node setConfig.js
```

Run the server.

```
node server.js
```

Run the client.

```
node client.js
```

## Contributing
The [Senecajs org][] encourage open participation. If you feel you can help in any way, be it with
documentation, examples, extra testing, or new features please get in touch.

## License
Copyright Richard Rodger and other contributors 2015, Licensed under [MIT][].

[Kafka]: http://kafka.apache.org
[Kafka builds]: http://kafka.apache.org/downloads.html
[travis-badge]: https://travis-ci.org/rjrodger/seneca-kafka-transport.svg
[travis-url]: https://travis-ci.org/rjrodger/seneca-kafka-transport
[gitter-badge]: https://badges.gitter.im/Join%20Chat.svg
[gitter-url]: https://gitter.im/senecajs/seneca
[standard-badge]: https://raw.githubusercontent.com/feross/standard/master/badge.png
[standard-style]: https://github.com/feross/standard

[MIT]: ./LICENSE
[Senecajs org]: https://github.com/senecajs/
[Seneca.js]: https://www.npmjs.com/package/seneca
[senecajs.org]: http://senecajs.org/
[github issue]: https://github.com/rjrodger/seneca-kafka-transport/issues
[@senecajs]: http://twitter.com/senecajs

