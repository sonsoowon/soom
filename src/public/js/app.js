const socket = io();


// Phone call
const myFace = document.querySelector("#myFace");
const muteBtn = document.querySelector("#mute");
const cameraBtn = document.querySelector("#camera");
const camerasSelect = document.querySelector("#cameras")

let myStream; // stream = video + audio
let muted = false;
let cameraOff = false;
let roomName;
let myPeerConnection;

const getCameras = async () => {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind == "videoinput");
        const currCamera = myStream.getVideoTracks()[0];
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currCamera.label == camera.label) {
                option.selected = true;
            }
            camerasSelect.appendChild(option);
        });

    } catch (e) {
        console.log(e);
    }
}
getCameras();

const getMedia = async (deviceId) => {
    const initialConstraints = {
        audio: true,
        video: { facingMode: "user" },
    }

    const cameraConstraints = {
        audio: true,
        video: { deviceId: {exact: deviceId}}
    }

    try {
        myStream = await navigator.mediaDevices.getUserMedia(
            deviceId ? cameraConstraints : initialConstraints
        );
        myFace.srcObject = myStream;
        if (!deviceId) {
            await getCameras();
        }
        console.log(myStream);
    } catch (e) {
        console.log(e);
    }
}

const handleMuteClick = () => {
    myStream
        .getAudioTracks()
        .forEach(track => (track.enabled = !track.enabled));
    muteBtn.innerText = muted ? "Mute" : "Unmute";
    muted = !muted;
}

const handleCameraClick = () => {
    myStream
        .getVideoTracks()
        .forEach(track => (track.enabled = !track.enabled));
    cameraBtn.innerText = cameraOff ? "Turn Camera Off" : "Turn Camera On";
    cameraOff = !cameraOff;
}


const handleCameraChange = async () => {
    await getMedia(camerasSelect.value);
    if(myPeerConnection) {
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find(sender => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);



// Welcome Form (choose a room)


const welcome = document.querySelector("#welcome");
const call = document.querySelector("#call");

call.hidden = true;

welcomeForm = welcome.querySelector("form");

const initCall = async () => {
    welcome.hidden = true;
    call.hidden = false;
    await getMedia();
    makeConnection();
}

const handleWelcomeSubmit = async (event) => {
    event.preventDefault();
    const input = welcomeForm.querySelector("input");
    roomName = input.value;
    await initCall();
    socket.emit("join_room", roomName, initCall);
    input.value = "";
}

welcomeForm.addEventListener("submit", handleWelcomeSubmit);




// Socket Code
socket.on("welcome", async () => {
    const offer = await myPeerConnection.createOffer();
    myPeerConnection.setLocalDescription(offer);
    console.log("send the offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    console.log("got offer");
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("send answer");
});

socket.on("answer", answer => {
    console.log("recieve answer");
    myPeerConnection.setRemoteDescription(answer);
})

socket.on("ice", ice => {
    console.log("receive candidate");
    myPeerConnection.addIceCandidate(ice);
})

//RTC Code

const makeConnection = () => {
    myPeerConnection = new RTCPeerConnection({
        
    });
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
        .getTracks()
        .forEach(track => myPeerConnection.addTrack(track, myStream));
}

const handleIce = (data) => {
    console.log("send candidate");
    socket.emit("ice", data.candidate, roomName);
}

const handleAddStream = (data) => {
    console.log("got an event from my peer");
    console.log(data);

    const peerFace = document.querySelector("#peerFace");
    peerFace.srcObject = data.stream;
}