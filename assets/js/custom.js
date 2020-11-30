document.addEventListener("DOMContentLoaded", function () {
    const CHANNEL = "wss"
    const CLOSE_MESSAGE = 1 << 0;
    const MESSAGE_MESSAGE = 1 << 1;
    const OPEN_MESSAGE = 1 << 2;
    const ERROR_MESSAGE = 1 << 3;
    const STRING_DATA = 1 << 4;
    const BUFFER_DATA = 1 << 5;

    let sockets = {};

    const proxy = data => {
        simPostMessage({
            type: 'messagepacket',
            channel: CHANNEL,
            data
        });
    }

    function openSocket(id, url) {
        // TODO... close previous sockets
        if (sockets[id]) {
            sockets[id].close();
            delete sockets[id];
        }
        console.log(`${id}: open ${url} -> ${id}`)
        const ws = sockets[id] = new WebSocket(url);
        ws.onerror = (e) => {
            if (sockets[id] !== ws) return; // outdated message

            const data = new Uint8Array([ERROR_MESSAGE, id])
            console.log(`${id}: error`, { data })
            proxy(data)
        }
        ws.onopen = () => {
            if (sockets[id] !== ws) return; // outdated message

            const data = new Uint8Array([OPEN_MESSAGE, id]);
            console.log(`${id}: open`, { data })
            proxy(data)
        }
        ws.onclose = (e) => {
            if (sockets[id] !== ws) return; // outdated message
            const code = e.code;
            const data = new Uint8Array([CLOSE_MESSAGE, id, (code >> 24) & 0xff, (code >> 16) & 0xff, (code >> 8) & 0xff, code & 0xff]);
            console.log(`${id}: close`, { data })
            proxy(data)
        }
        ws.onmessage = async (e) => {
            if (sockets[id] !== ws) return; // outdated message

            let d = e.data;
            const isstring = typeof d === "string";
            // blob/arraybuffer -> uint8array
            if (!isstring) {
                // blob -> arrayBuffer
                if (ws.binaryType === "blob") {
                    d = await d.arrayBuffer();
                }
                // array buffer -> uint8array
                d = new Uint8Array(d);
            }
            // type, id, isstring, size, data
            const data = new Uint8Array(2 + d.length);
            data[0] = MESSAGE_MESSAGE | (isstring ? STRING_DATA : BUFFER_DATA);
            data[1] = id;
            if (isstring) {
                for (let i = 0; i < d.length; ++i)
                    data[i + 2] = d.charCodeAt(i);
            } else {
                for (let i = 0; i < d.length; ++i)
                    data[i + 2] = d[i];
            }
            proxy(data)
        }
    }

    addSimMessageHandler("wss", (msg) => {
        const type = msg[0]
        const id = msg[1];

        if (type === OPEN_MESSAGE) {
            const url = uint8ArrayToString(msg.slice(2))
            openSocket(id, url)
        } else if ((type & MESSAGE_MESSAGE) == MESSAGE_MESSAGE) {
            const socket = sockets[id];
            if (!socket) {
                console.warning(`socket not found`, { id })
                return;
            }

            let data = msg.slice(2);
            if ((type & STRING_DATA) === STRING_DATA)
                data = uint8ArrayToString(data);
            socket.send(data);
        }
    })

    window.addEventListener('message', function (ev) {
        const d = ev.data
        if (d.type === "simulator" && d.command === "restart") {
            // clean out sockets
            const temp = sockets;
            sockets = {};
            Object.keys(temp).forEach(id => {
                try {
                    temp[id].close();
                } catch (e) { }
            });
        }
    });
})