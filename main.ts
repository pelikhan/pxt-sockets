const OPEN_EVENT_TYPE = "open"
const CLOSE_EVENT_TYPE = "close"
const MESSAGE_EVENT_TYPE = "message"
const ERROR_EVENT_TYPE = "error"

class Event {
    readonly type: string;
    constructor(type: string) {
        this.type = type;
    }
}
type EventListenerCallback = (evt: Event) => void;

/** EventTarget is a DOM interface implemented by objects that can receive events and may have listeners for them. */
class EventTarget {
    private readonly listeners: { [type: string]: EventListenerCallback[]; } = {};

    constructor() {
    }

    private getOrCreateTypeListeners(type: string) {
        let typeListeners = this.listeners[type];
        if (!typeListeners)
            typeListeners = this.listeners[type] = [];
        return typeListeners;
    }

    private deleteTypeListener(type: string) {
        this.listeners[type] = undefined;
    }

    /**
     * Appends an event listener for events whose type attribute value is type. The callback argument sets the callback that will be invoked when the event is dispatched.
     */
    public addEventListener(type: string, listener: (evt?: Event) => void): void {
        const typeListeners = this.getOrCreateTypeListeners(type);
        if (typeListeners.indexOf(listener) < 0)
            typeListeners.push(listener);
    }

    /**
     * Dispatches a synthetic event event to target and returns true if either event's cancelable attribute value is false or its preventDefault() method was not invoked, and false otherwise.
     */
    public dispatchEvent(event?: Event): boolean {
        const typeListeners = this.listeners[event.type];
        if (typeListeners) {
            for(const listener of typeListeners) {
                listener(event);
            }
        }
        return true;
    }
    /**
     * Removes the event listener in target's event listener list with the same type, callback, and options.
     */
    public removeEventListener(type: string, callback: (evt?: Event) => void): void {
        const typeListeners = this.getOrCreateTypeListeners(type);
        const i = typeListeners.indexOf(callback);
        if (i > 0) {
            typeListeners.splice(i, 1)
            if (typeListeners.length == 0)
                this.deleteTypeListener(type);
        }
    }
}

/** A CloseEvent is sent to clients using WebSockets when the connection is closed. This is delivered to the listener indicated by the WebSocket object's onclose attribute. */
class CloseEvent extends Event {
    /**
     * Returns the WebSocket connection close code provided by the server.
     */
    readonly code: number;

    constructor(code: number) {
        super(CLOSE_EVENT_TYPE);
        this.code = code;
    }
}

/** A message received by a target object. */
class MessageEvent extends Event {
    /**
     * Returns the data of the message.
     */
    readonly data: string | Buffer;

    constructor(data: string | Buffer) {
        super(MESSAGE_EVENT_TYPE);
        this.data = data;
    }
}

const SEND_MESSAGE = 1 << 0;
const CLOSE_MESSAGE = 1 << 1;
const STATE_MESSAGE = 1 << 2;
const MESSAGE_MESSAGE = 1 << 3;
const STRING_DATA = 1 << 2;
const BUFFER_DATA = 1 << 3;    

class Transport {        
    constructor(
        public readonly send: (msg: Buffer) => void,
        public readonly onReceived: (handler: (msg: Buffer) => void) => void
    ) {}
}

let transport: Transport;
function getTransport(): Transport {
    if (!transport) {
        transport = new Transport(
            (msg) => control.simmessages.send("wss", msg),
            (handler) => control.simmessages.onReceived("wss", function(msg: Buffer) {
                if (handler)
                    handler(msg);
            })
        );         
    }
    return transport;
}

/** Provides the API for creating and managing a WebSocket connection to a server, as well as for sending and receiving data on the connection. */
class WebSocket extends EventTarget {
    private _readyState: number = WebSocket.CLOSED;
    private _id: string;
    private readonly _url: string;

    /**
     * Creates a new web socket
     */
    constructor(url: string) {
        super();        
        this._url = url;
        this.registerHandlers();
    }

    private registerHandlers() {
        const t = getTransport();
        t.onReceived(msg => this.handleMessage(msg));
    }

    private handleMessage(msg: Buffer) {
        const type = msg[0];
        if (type === STATE_MESSAGE) {
            const state = msg[1];
            if (state !== this._readyState) {
                this._readyState = state;
                switch(this._readyState) {
                    case WebSocket.OPEN: this.dispatchEvent(new Event(OPEN_EVENT_TYPE)); break;
                    case WebSocket.CLOSING: 
                    case WebSocket.CONNECTING: break;
                    case WebSocket.CLOSED: this.dispatchEvent(new CloseEvent(msg.getNumber(NumberFormat.UInt32LE, 1))); break;
                }
            }
        } else if (type === MESSAGE_MESSAGE) {
            const dataType = msg[1];
            const dataBuffer = msg.slice(2);
            const data = dataType === STRING_DATA ? dataBuffer.toString() : dataBuffer;
            this.dispatchEvent(new MessageEvent(data));
        }
    }

    get onclose(): (evt?: CloseEvent) => void { return null; }
    set onclose(handler: (evt?: CloseEvent) => void) {
        if(handler)
            this.addEventListener(CLOSE_EVENT_TYPE, handler);
        else
            this.removeEventListener(CLOSE_EVENT_TYPE, handler);
    }
    get onerror(): (evt?: Event) => void { return null; }
    set onerror(handler: (evt?: Event) => void) {
        if(handler)
            this.addEventListener(ERROR_EVENT_TYPE, handler);
        else
            this.removeEventListener(ERROR_EVENT_TYPE, handler);
    }
    get onmessage(): (evt?: MessageEvent) => void { return null; }
    set onmessage(handler: (evt?: MessageEvent) => void) {
        if(handler)
            this.addEventListener(MESSAGE_EVENT_TYPE, handler);
        else
            this.removeEventListener(MESSAGE_EVENT_TYPE, handler);
    }
    get onopen(): (evt?: Event) => void { return null; }
    set onopen(handler: (evt?: Event) => void) {
        if(handler)
            this.addEventListener(OPEN_EVENT_TYPE, handler);
        else
            this.removeEventListener(OPEN_EVENT_TYPE, handler);
    }

    /**
     * Returns the state of the WebSocket object's connection. It can have the values described below.
     */
    get readyState(): number {
        return this._readyState;
    }
    /**
     * Returns the URL that was used to establish the WebSocket connection.
     */
    get url(): string {
        return this._url;
    }

    /**
     * Closes the WebSocket connection, optionally using code as the the WebSocket connection close code and reason as the the WebSocket connection close reason.
     */
    close(code?: number): void {
        const msg = Buffer.create(1 + 4);
        msg[0] = CLOSE_MESSAGE;
        if (code !== undefined)
            msg.setNumber(NumberFormat.UInt32LE, 1, code);
        transport.send(msg)
    }

    /**
     * Transmits data using the WebSocket connection. data can be a string or a Buffer
     */
    send(data: string | Buffer): void {
        const dataType = typeof data === "string" ? STRING_DATA : BUFFER_DATA;
        const dataBuffer: Buffer = dataType === BUFFER_DATA ? (data as Buffer) : Buffer.fromUTF8(data as string);
        const msg = Buffer.create(1 + dataBuffer.length);
        msg[0] = SEND_MESSAGE | dataType;
        msg.write(1, dataBuffer);
        // send message
        transport.send(msg);
    }

    static CLOSED: number = 3;
    static CLOSING: number = 2;
    static CONNECTING: number = 0;
    static OPEN: number = 1;
}