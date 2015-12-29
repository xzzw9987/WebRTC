var server = require("ws").Server,
    wss = new server({port: 7500}),
    socketList = {},
    id = 0;
wss.on("connection", function (ws) {
    ws.socketID = id++;
    socketList[ws.socketID] = ws;
    ws.on("message", function (data) {
        data = JSON.parse(data);
        //转发
        if (data.event !== "join") {
            var socket = socketList[data.socketID];
            data.socketID = ws.socketID;
            socket.send(JSON.stringify(data));
        }
        //获取在线用户列表
        else {
            var socks = []
            for (var i in socketList) {
                if (socketList[i] !== ws)
                    socks.push(i);
            }
            ws.send(JSON.stringify({
                event: "peers",
                peers: socks
            }))
        }
    });
    for (var i in socketList) {
        if (socketList[i] !== ws) {
            socketList[i].send(JSON.stringify({
                event: "newpeer",
                socketID: ws.socketID
            }));
        }
    }
    ws.on("close", function (code, message) {
        delete socketList[ws.socketID];
        for (var i in socketList) {
            socketList[i].send(JSON.stringify({
                event: "close",
                socketID: ws.socketID
            }));
        }
    });
});
