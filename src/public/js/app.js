// const messageList = document.querySelector("ul");
// const messageForm = document.querySelector("#message");
// const nickForm = document.querySelector("#nickname")

// // 서버로의 연결
// const socket = new WebSocket(`ws://${window.location.host}`);


// // type을 지정해 전송하는 메시지 종류를 지정할 수 있지만 서버로 object가 아닌 string을 보내야 한다
// // 서버에서 object 접근 못하나?? -> 서버가 javascript 서버임을 보장하지 못하므로, javascript object를 보내는 건 적절하지 못함
// // 어떤 종류의 서버이든 string으로 받을 수 있도록 변환해줘야함. string으로 뭘 할지는 서버에서 정하는 걸로
// // 서버에서 또 JSON.parse 사용해 객체로 변환해야 함

// const makeMessage = (type, payload) => {
//     const msg = {type, payload};
//     return JSON.stringify(msg);
// }



// socket.addEventListener("open", () => {
//     console.log("Connected to Server");
// });

// socket.addEventListener("message", (message) => {
//     const li = document.createElement("li");
//     li.innerText = message.data;
//     messageList.append(li);
// })

// socket.addEventListener("close", () => {
//     console.log("Disconnected from Server");
// })


// const handleMessageSubmit = (event) => {
//     event.preventDefault();
//     const input = messageForm.querySelector("input");
//     socket.send(makeMessage("message", input.value)); // 서버로 입력한 메시지 전송
//     input.value = "";
// }


// const handleNickSubmit = (event) => {
//     event.preventDefault();
//     const input = nickForm.querySelector("input");
//     socket.send(makeMessage("nickname", input.value)); // 서버로 입력한 메시지 전송
//     input.value = "";
// }


// messageForm.addEventListener("submit", handleMessageSubmit);
// nickForm.addEventListener("submit", handleNickSubmit);




/** Socket IO **/
const socket = io(); // 자동적으로 백엔드의 socket.io와 연결해주는 함수

// room !!
const welcome = document.querySelector("#welcome");
const form = welcome.querySelector("form");
const room = document.querySelector("#room");

room.hidden = true;

let roomName;

const handleMessageSubmit = (event) => {
    event.preventDefault();
    const input = room.querySelector("#msg input");
    const value = input.value;
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`);
        // emit할 때 전달하는 함수가 input.value가 빈 칸으로 초기화 된 후 실행되므로
        // 변수 value에 저장해 함수에 전달한다
    
    });
    input.value = "";
}

const handleNameSubmit = (event) => {
    event.preventDefault();
    const input = room.querySelector("#nickname input");
    const value = input.value;
    socket.emit("nickname", input.value);
    input.value = "";
}

const showRoom = () => {
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;

    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#nickname");
    msgForm.addEventListener("submit", handleMessageSubmit);
    nameForm.addEventListener("submit", handleNameSubmit);
}

const handleSubmit = (event) => {
    event.preventDefault();
    const input = form.querySelector("input");
    socket.emit("enter_room", input.value, showRoom); // 1. room 이라는 event를 emit 2. object 전송 가능
    // 2. websocket에서 javascript json을 받기 위해 stringfy, parse를 썼던 대신
    // 더 간편하게 javascript object 사용 가능
    // 1. 어떤 event 이든 전달할 수 있다
    // 3. 어떤 종류의 인자든 여러 개 전달 가능
    // 4. callback 함수는 맨 마지막으로 전달해야 한다.
    roomName = input.value;
    input.value = "";
}

form.addEventListener("submit", handleSubmit);

const addMessage = (message) => {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

socket.on("welcome", (user, newCount) => {
    addMessage(`${user} joined!`);
});

socket.on("bye", (user, newCount) => {
    addMessage(`${user} left!`);
});

socket.on("new_message", (msg, nickname) => addMessage(`${nickname}: ${msg}`));

socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    roomList.innerHTML = "";
    if (rooms.length === 0) { // 빈 리스트를 받으면 아무 동작 없이 이전 화면을 유지하는 것이 아닌 빈 목록을 화면에 띄우도록 처리
        roomList.innerHTML = "";
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.appendChild(li);
    })
});