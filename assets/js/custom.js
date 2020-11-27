document.addEventListener("DOMContentLoaded", function () {
    const CHANNEL = "WSS"
    const SEND_MESSAGE = 1 << 0;
    const CLOSE_MESSAGE = 1 << 1;
    const MESSAGE_MESSAGE = 1 << 2;
    const OPEN_MESSAGE = 1 << 3;
    const ERROR_MESSAGE = 1 << 4
    const STRING_DATA = 1 << 5;
    const BUFFER_DATA = 1 << 6;

    let sockets = {};

    const proxy = data => {
        console.log(`post`, {data})
        simPostMessage({
            type: 'messagepacket',
            channel: CHANNEL,
            data
        });
    }

    addSimMessageHandler("wss", (msg) => {
        console.log(msg)
        const type = msg[0]
        if (type === OPEN_MESSAGE) {
            const url = uint8ArrayToString(msg.slice(1))
            const id = Object.keys(sockets).length + 1; // less than 0xff

            console.log(`open ${url} -> ${id}`)
            const ws = new WebSocket(url);
            ws.onerror = (e) => {
                const data = new Uint8Array([ERROR_MESSAGE, id])
                console.log(`error`, { data })
                proxy(data)
            }
            ws.onopen = () => {
                const data = new Uint8Array([OPEN_MESSAGE, id]);
                console.log(`open`, { data })
                proxy(data)
            }
            ws.onclose = (e) => {
                const code = e.code;
                const data = new Uint8Array([CLOSE_MESSAGE, id, (code >> 24) & 0xff, (code >> 16) & 0xff, (code >> 8) & 0xff, code & 0xff]);
                console.log(`close`, { data })
                proxy(data)
            }
            ws.onmessage = (e) => {
                console.log(`message`, { e })
                let d = e.data;
                const isstring = typeof d === "string";
                // type, id, isstring, size, data
                const data = new Uint8Array(2 + 4 + d.length);
                data[0] = MESSAGE_MESSAGE | (isstring ? STRING_DATA : BUFFER_DATA);
                data[1] = id;
                if (isstring) {
                    // TODO convert string to buffer
                    const b = new Uint8Array(d.length)
                    for (let i = 0; i < d.length; ++i)
                        b[i] = d.charCodeAt(i);
                    d = b;
                }
                for (let i = 0; i < d.length; ++i)
                    data[i + 2] = d[i];
                proxy(data)
            }
        }
    })
})