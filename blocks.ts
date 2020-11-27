namespace dom {
    let socket: WebSocket;

    /**
     * Optionally open a new socket
     */
    //% blockId="wssopen" block="socket open $url"
    export function open(url: string) {
        // close previous if url specified
        if (socket && url && socket.url !== url) {
            socket.close();
            socket = undefined;
        }
        // open new socket if needed
        if (!socket) {
            socket = new WebSocket(url);        
            // wait until socket is opened
            pauseUntil(() => socket.readyState === WebSocket.OPEN, 30000);
        }
    }

    /**
     * Sends a string over the web socket
     */
    //% blockId="wsssendstring" block="socket send string $msg"
    export function sendString(msg: string) {
        open(""); // let the host decide if needed
        socket.send(msg);
    }

    /**
     * Sends a buffer over the web socket
     */
    //% blockId="wsssendbuffer" block="socket send buffer $msg"
    export function sendBuffer(msg: Buffer) {
        open(""); // let the host decide if needed
        socket.send(msg);
    }

    /** 
     * Registers a handler when a string message is received
    */
    //% blockId="wssonstringmessage" block="socket on string message received $msg"
    export function onStringMessageReceived(handler: (msg: string) => void) {
        open("");
        socket.addEventListener(MESSAGE_EVENT_TYPE, (evt: MessageEvent) => {
            const data = evt.data;
            if (handler && typeof data === "string")
                handler(data as string);
        })
    }

    /** 
     * Registers a handler when a buffer message is received
    */
    //% blockId="wssonbuffermessage" block="socket on buffer message received $msg"
    export function onBufferMessage(handler: (msg: Buffer) => void) {
        open("");
        socket.addEventListener(MESSAGE_EVENT_TYPE, (evt: MessageEvent) => {
            const data = evt.data;
            if (handler && typeof data !== "string")
                handler(data);
        })
    }
}
