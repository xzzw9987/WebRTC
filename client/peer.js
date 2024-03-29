/**
 * Desktop broadcast
 */
const stunServerAddress = 'stun:182.61.59.132:3478'
const turnServerAddress = 'turn:182.61.59.132:3478'
// const wsServerAddress = 'wss://182.61.59.132:8888'
const wsServerAddress = 'wss://webrtc-signal-x.herokuapp.com'
// const stunServerAddress = 'stun:localhost:3478'
// const turnServerAddress = 'turn:localhost:3478'
// const wsServerAddress = 'ws://localhost:8888'
const username = 'test'
const credential = '12345'

export default class Peer {
    socketPromise = null
    captureStream = null
    peerConnection = null
    collection = {}

    constructor () {
        this.createWebSocket()
    }

    createWebSocket() {
        this.socketPromise = new Promise(resolve => {
            const ws = new WebSocket(wsServerAddress)
            ws.addEventListener('open', () => {
                console.log('connected')
                resolve(ws)
            })
            ws.addEventListener('message', e => {
                console.log('recv message', e.data)
            })
        })
    }

    async broadcastBindWebSocketEvent() {
        const socket = await this.socketPromise
        socket.send(JSON.stringify({
            type: 'new-broadcast',
            id: `broadcast-${Math.floor(10000 * Math.random())}`
        }))
        socket.addEventListener('message', e => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'new-recv') {
                    this.initializeBroadcastClient(data)
                }
                if (data.type === 'answer') {
                    this.recvAnswer(data)
                }
                if (data.type === 'candidate') {
                    this.addIceCandidate(data)
                    // this.peerConnection.addIceCandidate(new RTCIceCandidate(data.data))
                }
            } catch (e) {
                console.log('on message', e)
            }
        })
        socket.addEventListener('close', () => {
            console.log('close')
            this.createWebSocket()
            this.broadcastBindWebSocketEvent()
        })
    }

    async initializeBroadcastClient (recvInfo) {
        try {
            const peerId = recvInfo.from
            const socket = await this.socketPromise
            const peerConnection = new RTCPeerConnection({
                iceServers: [
                    // {urls: stunServerAddress},
                    {urls: turnServerAddress, username, credential}
                ],
                iceTransportPolicy: 'relay'
            })

            for (const track of this.captureStream.getTracks()) {
                peerConnection.addTrack(track)
            }

            peerConnection.addEventListener('negotiationneeded', async () => {
                console.log('negotiationneeded')
                const offer = await peerConnection.createOffer()
                socket.send(
                    JSON.stringify({
                        type: 'offer',
                        data: offer,
                        to: peerId
                    })
                )
                await peerConnection.setLocalDescription(offer)
                console.log('localDescription', peerConnection.localDescription.sdp)
            })

            peerConnection.addEventListener('icecandidate', async event => {
                if (event.candidate) {
                    console.log('icecandidate', event.candidate)
                    socket.send(
                        JSON.stringify({
                            type: 'candidate',
                            data: event.candidate,
                            to: peerId
                        })
                    )
                }
            })

            this.collection[peerId] = peerConnection

        } catch (err) {
            console.error('Error: ' + err)
        }
    }

    recvAnswer (d) {
        console.log('recv answer', d)
        const peerConnection = this.collection[d.from]
        if (peerConnection) {
            return peerConnection.setRemoteDescription(new RTCSessionDescription(d.data))
        }
    }

    async recvOffer (d) {
        const socket = await this.socketPromise
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(d.data))
        const answer = await this.peerConnection.createAnswer()
        console.log('create answer', answer)
        await this.peerConnection.setLocalDescription(answer)
        socket.send(
            JSON.stringify({
                type: 'answer',
                data: answer
            })
        )
    }

    async addIceCandidate (d) {
        console.log('add ice candidate', d)
        const peerConnection = this.peerConnection || this.collection[d.from]
        if (peerConnection) {
            return peerConnection.addIceCandidate(d.data)
        }
    }

    async receive () {
        const socket = await this.socketPromise
        socket.send(JSON.stringify({
            type: 'new-recv',
            id: `recv-${Math.floor(10000 * Math.random())}`
        }))
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                {urls: turnServerAddress, username, credential}
            ],
            iceTransportPolicy: 'relay'
        })

        this.peerConnection.addEventListener('track', event => {
            const video = document.createElement('video')
            video.style.width = '100vw'
            video.style.height = '100vh'
            if (event.streams.length) {
                video.srcObject = event.streams[0]
            } else {
                video.srcObject = new MediaStream([event.track])
            }
            document.body.appendChild(video)
            video.controls = true
        })

        this.peerConnection.addEventListener('icecandidate', async event => {
            if (event.candidate) {
                console.log('icecandidate', event.candidate)
                socket.send(
                    JSON.stringify({
                        type: 'candidate',
                        data: event.candidate
                    })
                )
            }
        })

        socket.addEventListener('message', e => {
            try {
                const data = JSON.parse(e.data)
                if (data.type === 'offer') {
                    this.recvOffer(data)
                }
                if (data.type === 'candidate') {
                    this.addIceCandidate(data)
                    // this.peerConnection.addIceCandidate(new RTCIceCandidate(data.data))
                }
            } catch (e) {
                console.log('on message', e)
            }
        })
    }

    async broadcast () {
        const captureStream = await navigator.mediaDevices./*getDisplayMedia*/getUserMedia({
            video: {
                width: 1920,
                height: 1080,
                // facingMode: { exact: "environment" }
            }
        })
        const video = document.querySelector('video')
        video.srcObject = captureStream
        video.play()
        this.captureStream = captureStream
        this.broadcastBindWebSocketEvent()
    }
}
