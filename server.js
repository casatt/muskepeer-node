#!/bin/env node

var WebSocketServer = require('ws').Server;

var wss = new WebSocketServer(
    {
        host: process.env.OPENSHIFT_NODEJS_IP,
        port: 8443
    }
);

wss.on('connection', function (socket) {

    //socket.send('Hello');

    socket.on('message', function (data) {
        console.log(data);
    });

});