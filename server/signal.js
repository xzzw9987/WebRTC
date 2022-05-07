const {WebSocketServer, WebSocket} = require('ws');

const wss = new WebSocketServer({port: 8888});

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
                        if (client !== ws && (!data.to || data.to === ws.id) && client.readyState === WebSocket.OPEN) {
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