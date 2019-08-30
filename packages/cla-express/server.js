#!/usr/bin/env node

/* eslint-disable require-jsdoc */

const readFile = require('fs').readFileSync;
const jsonfile = require('jsonfile').readFileSync;

const specPath = process.argv[2] || process.env.SPEC;
if (!specPath) {
    console.error('Specification has to be provided!');
    process.exit(1);
}
const spec = jsonfile(specPath);
const openapi = require('cla-modules/openapi-tools')(spec);
const app = require('./app')(spec);

let host = process.env.HOST || '0.0.0.0';
let port = normalizePort(process.env.PORT || openapi.getPort(spec));
app.set('port', port);

/**
 * Create HTTP(s) server.
 */

let server = null;
const sslConfig = openapi.getSslConfig(spec);
if (sslConfig) {
    server = require('https').createServer({
        key: readFile(sslConfig.key),
        cert: readFile(sslConfig.cert),
    }, app);
} else {
    server = require('http').createServer(app);
}

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, host);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
    let port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}
