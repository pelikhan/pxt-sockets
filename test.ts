game.consoleOverlay.setVisible(true)
control.runInParallel(function() {
    console.log(`connecting to https://www.websocket.org/echo.html`)
    const ws = new WebSocket("wss://echo.websocket.org")
    console.log(`socket state: ${ws.readyState}`)
    ws.onerror = () => console.log("error")
    ws.onmessage = (msg) => {
        console.log(`message`)
        const data = msg.data;
        console.log(data)
    }
    ws.onopen = () => {
        forever(() => {
            console.log(`socket state: ${ws.readyState}`)
            ws.send(`makecode ${control.millis()}`);    
            pause(5000)
            ws.send(Buffer.fromArray([control.millis()]));
            pause(5000)
        })
    }    
})
