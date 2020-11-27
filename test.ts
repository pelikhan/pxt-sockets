game.consoleOverlay.setVisible(true)
control.runInParallel(function() {
    console.log(`connecting to https://www.websocket.org/echo.html`)
    const ws = new WebSocket("wss://echo.websocket.org")
    ws.onerror = () => console.log("error")
    ws.onmessage = (msg) => {
        const data = msg.data;
        console.log(`--> ${typeof data === "string" ? data : data.toString()}`)
    }
    ws.onopen = () => {
        forever(() => {
            const m = `makecode ${control.millis()}`;
            console.log(`<-- ${m}`)
            ws.send(m);    
            pause(5000)
            const b = Buffer.fromArray([control.millis()]);
            console.log(`<-- ${b.toString()}`)
            ws.send(b);
            pause(5000)
        })
    }    
})
