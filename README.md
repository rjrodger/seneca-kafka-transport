# seneca-kafka-transport

Kafka transport module for seneca. To run the example code:

download the latest Kafka build from http://kafka.apache.org/downloads.html (tested against 0.8.1)

unpack and follow the build instructions to create Kafka binaries for your system

cd to the kafka directory

```
cd kafka-0.8.1-src/kafka
```

start zookeeper

```
nohup bin/zookeeper-server-start.sh config/zookeeper.properties >zk.log 2>&1 &
```

start kafka

```
nohup bin/kafka-server-start.sh config/server.properties >kafka1.log 2>&1 &
```

create a request topic

```
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 3 --topic request
```

create a reponse topic

```
bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 3 --topic response
```

cd into the module test folder

```
cd seneca-kafka-transport/test
```

initialize the zookeeper configuration

```
node setConfig.js
```

run the server

```
node server.js
```

and the client

```
node client.js
```


### Support

If you're using this module, feel free to contact me on twitter if you
have any questions! :) [@rjrodger](http://twitter.com/rjrodger)

Current Version: 0.1.1

Tested on: node 0.10.24

