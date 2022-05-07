import Peer from './peer.js';

document.querySelector('button').addEventListener('click', () => {
    const peer = new Peer()
    peer.broadcast()
})
