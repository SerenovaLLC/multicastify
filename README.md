Multicastify
============

Multicastify is a multicast proxy that allows the use of multicast in environments that don't generally support it (namely AWS). It works by listening to the multicast loopback, and sending datagrams to a [Redis] pub/sub. Messages received from the Redis pub/sub are replayed on the local loopback. The application is written in node.js and deployed through NPM.

[Multicastify image](docs/multicastify.png)

Dependencies
------------
 * Node.js > 0.10.0
 * Python \>2.5 and \<3.0

Installation
------------
To use the release version, simply run `npm install multicastify -g`. 

To install from source:
 * `npm install git://github.com/liveops/multicastify.git`

Usage
-----
Multicastify has helpful documentation built in to the command line. You will need to specify at least one Redis server IP and port and a multicast IP and port.

Multicastify has two primary arguments, the redis node(s) and the multicast address to proxy.

    Options:
      -v, --version                            Print version and exit.
      -S IP:PORT, --redisNode IP:PORT          Redis to use as pub/sub. Use option more than once for HA operation.
      -a IP:PORT, --multicastAddress IP:PORT   Multicast IP address and port to bind (eg. 224.0.0.1:5100). Can be used more than once.

Example
-------
Single redis on localhost:
    `multicastify --redisNode localhost:6379 --multicastAddress 225.0.0.1:48812`

Clustered Redis:
    `multicastify -S 172.17.8.101:6379 -S 172.17.8.102:6379 -a 225.13.13.1:48812`

TODO
----
 * IPv6 support
 * Change log level as a command line parameter 
 * Port for use with AMQ/ZMQ topics
 * Allow override of the pub/sub channel name from the command line

License
-------
Right to Use the Software Referenced Herein: Unless otherwise provided for a specific file, the product(s) and files referenced herein are licensed under the Apache License, Version 2.0 (the "License"); you may not use such files except in compliance with the License. You may obtain a copy of the License at:

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

