document.addEventListener("DOMContentLoaded", function () {
    addSimMessageHandler("wss", (buf) => {
        console.log(buf)
    })
})