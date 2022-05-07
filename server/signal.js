const {WebSocketServer, WebSocket} = require('ws');
/*const https = require('https');
const fs = require('fs');
const port = 8888

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options)
server.listen(port)
const wss = new WebSocketServer({server});*/

const wss = new WebSocketServer({port: process.env.PORT || 8888});
wss.on('connection', function connection(ws) {
    ws.on('close', (code, reason) => {
        console.log('disconnected', code, reason.toString())
    })

    ws.on('message', data => {
        console.log('received:', data.toString());
        data = JSON.parse(data.toString())
        if (typeof data === 'object') {
            switch (data.type) {
                case 'new-broadcast':
                    ws.id = data.id
                    ws.type = 'broadcast'
                    break
                case 'new-recv':
                    ws.id = data.id
                    ws.type = 'recv'
                    wss.clients.forEach(client => {
                        if (client.type === 'broadcast' && client.readyState === WebSocket.OPEN) {
                            data.from = ws.id
                            client.send(JSON.stringify(data))
                        }
                    })
                    break
                default:
                    wss.clients.forEach(client => {
                        if (client !== ws && ws.type !== client.type && (!data.to || data.to === ws.id) && client.readyState === WebSocket.OPEN) {
                            delete data.to
                            data.from = ws.id
                            client.send(JSON.stringify(data))
                        }
                    })
                    break
            }
        }
    });
});
