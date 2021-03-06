/**
 *
 * @author Matthieu Holzer
 * @version 0.1
 */

var _ = require('underscore'),
    peers = require('./lib/collections/peers'),
    WebSocketServer = require('ws').Server,
    wss = new WebSocketServer(
        {
            host: process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1',
            port: 8080
        }
    );

var HEARTBEAT_INTERVAL = 1000 * 60; //1m

//Global Exception Handling
process.on('uncaughtException', function (err) {
    console.error(err.stack);
});


wss.on('connection', function (socket) {

    var heartbeat = setInterval(function () {
            sendToPeer(socket, {cmd: 'node:heartbeat'});
        }, HEARTBEAT_INTERVAL
    );

    socket.on('message', function (data) {
        console.log('received: %s', data);
        messageHandler(socket, JSON.parse(data));
    });

    socket.on('close', function (e) {
        peers.remove(peers.getPeerBySocket(socket));
        clearInterval(heartbeat);
    });

});


function messageHandler(socket, data) {
    var peer;

    if (!data.cmd) return;

    switch (data.cmd.toLowerCase()) {
        case 'peer:auth' :

            //TODO Test if peers authToken matches
            var success = peers.add({
                location: data.location,
                socket: socket,
                uuid: data.uuid
            });

            sendToPeer(socket, {cmd: 'peer:auth', data: {success: success}});

            //https://github.com/einaros/ws/blob/master/lib/ErrorCodes.js
            if (!success) socket.close(1008, 'Missing auth-credentials or already registered.');

            break;
        case 'peer:list' :
            sendToPeer(socket, {cmd: 'peer:list', data: peers.list()});
            break;
        case 'peer:offer' :
            peer = peers.getPeerByUuid(data.targetPeerUuid);
            //swap data.targetUuid <-> data.uuid
            sendToPeer(peer.socket, {cmd: 'peer:offer', data: {targetPeerUuid: data.uuid, offer: data.offer, location: data.location}});
            break;
        case 'peer:answer' :
            peer = peers.getPeerByUuid(data.targetPeerUuid);
            //swap data.targetUuid <-> data.uuid
            sendToPeer(peer.socket, {cmd: 'peer:answer', data: {targetPeerUuid: data.uuid, answer: data.answer}});
            break;
        case 'peer:candidate' :
            peer = peers.getPeerByUuid(data.targetPeerUuid);
            sendToPeer(peer.socket, {cmd: 'peer:candidate', data: {targetPeerUuid: data.uuid, candidate: data.candidate}});
            break;
        default:
            break;

    }
}


function sendToPeer(socket, data) {
    //state 1 = ready
    if (!socket || socket.readyState !== 1) {
        peers.remove(peers.getPeerBySocket(socket));
        return;
    }
    try {
        socket.send(JSON.stringify(data));
    }
    catch (e) {
        peers.remove(peers.getPeerBySocket(socket));
        socket.close();
    }

}