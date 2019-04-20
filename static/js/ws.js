var pc;
var curPacketID = "";
// web socket

conn = new WebSocket(`ws://${location.host}/ws`);

// Clear old roomID
conn.onopen = () => {
    log("WebSocket is opened. Send ping");
    log("Send ping pong frequently")
    pingpongTimer = setInterval(sendPing, 1000 / PINGPONGPS)

    startWebRTC();
}

conn.onerror = error => {
    log(`Websocket error: ${error}`);
}

conn.onclose = () => {
    log("Websocket closed");
}

conn.onmessage = e => {
    d = JSON.parse(e.data);
    switch (d["id"]) {
    case "sdp":
        log("Got remote sdp");
        pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(d["data"]))));
        break;
    case "requestOffer":
        curPacketID = d["packet_id"];
        log("Received request offer ", curPacketID)
        startWebRTC();

    //case "sdpremote":
        //log("Got remote sdp");
        //pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(atob(d["data"]))));
        //conn.send(JSON.stringify({"id": "remotestart", "data": GAME_LIST[gameIdx].nes, "room_id": roomID.value, "player_index": parseInt(playerIndex.value, 10)}));inputTimer
        //break;
    case "pong":
        // TODO: Change name use one session
        log("Recv pong. Start webrtc");
        //startWebRTC();
        break;
    case "pingpong":
        // TODO: Calc time
        break;
    case "start":
        log("Got start");
        roomID.value = ""
        currentRoomID.innerText = d["room_id"]
        break;
    case "save":
        log(`Got save response: ${d["data"]}`);
        break;
    case "load":
        log(`Got load response: ${d["data"]}`);
        break;
    }
}

function sendPing() {
    // TODO: format the package with time
    //conn.send(JSON.stringify({"id": "pingpong", "data": "pingpong"}));
}

function startWebRTC() {
    // webrtc
    pc = new RTCPeerConnection({iceServers: [{urls: 'stun:stun.l.google.com:19302'}]})

    // input channel
    inputChannel = pc.createDataChannel('foo', {ordered: false})
    inputChannel.onclose = () => {
        log('inputChannel has closed');
    }

    inputChannel.onopen = () => {
        log('inputChannel has opened');
    }

    inputChannel.onmessage = e => {
        log(`Message from DataChannel '${inputChannel.label}' payload '${e.data}'`);
    }

    pc.oniceconnectionstatechange = e => {
        log(`iceConnectionState: ${pc.iceConnectionState}`);

        if (pc.iceConnectionState === "connected") {
            //conn.send(JSON.stringify({"id": "start", "data": ""}));
        }
        else if (pc.iceConnectionState === "disconnected") {
            endInput();
        }
    }

    // stream channel
    pc.ontrack = function (event) {
        log("New stream, yay!");
        document.getElementById("game-screen").srcObject = event.streams[0];
        $("#game-screen").show();
    }


    // candidate packet from STUN
    pc.onicecandidate = event => {
        if (event.candidate === null) {
            // send to ws
            session = btoa(JSON.stringify(pc.localDescription));
            localSessionDescription = session;
            log("Send SDP to remote peer");
            // TODO: Fix curPacketID
            conn.send(JSON.stringify({"id": "initwebrtc", "data": session, "packet_id": curPacketID}));
        } else {
            console.log(JSON.stringify(event.candidate));
        }
    }

    // receiver only tracks
    pc.addTransceiver('video', {'direction': 'recvonly'});

    // create SDP
    pc.createOffer({offerToReceiveVideo: true, offerToReceiveAudio: false}).then(d => {
        pc.setLocalDescription(d).catch(log);
    })

}

function startGame() {
    log("Starting game screen");
    screenState = "game";

    conn.send(JSON.stringify({"id": "start", "data": GAME_LIST[gameIdx].nes, "room_id": roomID.value, "player_index": parseInt(playerIndex.value, 10)}));inputTimer

    // clear menu screen
    //endInput();
    document.getElementById('div').innerHTML = "";
    if (!DEBUG) {
        $("#menu-screen").fadeOut(400, function() {
            $("#game-screen").show();
        });
    }
    // end clear

    startInput();
}
