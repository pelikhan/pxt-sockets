console.log(`connecting to https://www.wss-websocket.net/`)
const ws = new WebSocket("https://www.wss-websocket.net/")
ws.onmessage = (msg) => {
    const data = msg.data;
    console.log(`message ${typeof data}`)
    console.log(data)
}
ws.onopen = () => {
    ws.send(JSON.stringify({ message: "hello from makecode"}));
    ws.send(hex`0a0b0c0d0e0f`);
}
