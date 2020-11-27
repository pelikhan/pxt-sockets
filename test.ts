const ws = new WebSocket("https://www.wss-websocket.net/")

ws.onopen = () => {
    ws.send(JSON.stringify({ message: "hello from makecode"}));
}