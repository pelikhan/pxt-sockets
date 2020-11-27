game.consoleOverlay.setVisible(true)
control.runInParallel(function() {
    console.log(`connecting to https://www.websocket.org/echo.html`)
    const ws = new WebSocket("wss://echo.websocket.org")
    console.log(`socket state: ${ws.readyState}`)
    ws.onmessage = (msg) => {
        const data = msg.data;
        console.log(`message ${typeof data}`)
        console.log(data)
    }
    ws.onopen = () => {
        while(true) {
            console.log(`socket state: ${ws.readyState}`)
            ws.send(JSON.stringify({ message: "hello from makecode", time: control.millis() }));    
            pause(1000)
            ws.send(Buffer.fromArray([control.millis()]));
            pause(1000)
        }
    }    
})
