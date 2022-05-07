var Turn = require('node-turn');
var server = new Turn({
    debugLevel: 'ALL',
    authMech: 'long-term',
    // relayIps: ['10.250.32.217'],
    externalIps: '127.0.0.1',
    credentials: {
        root: "12345"
    }
});
server.start();