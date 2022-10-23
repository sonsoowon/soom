import http from "http";
import WebSocket from "ws";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug")
app.set("views", __dirname + "/views"); // __dirname은 폴더의 현재 경로를 나타내다
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home")); // 기본 루트에서 home을 렌더링하도록 설정
app.get("/*", (_, res) => res.redirect("/")); // 어떤 url로 이동하든 home으로 연결

console.log("hello");

// express는 ws를 지원하지 않고 http를 사용
// 함수를 추가해야한다

// 같은 서버에 http와 ws를 합치는 과정
const httpServer = http.createServer(app); // httpServer에 변수로 접근 가능
const wsServer = SocketIO(httpServer);
//const wss = new WebSocket.Server({ server }); // wss서버 위에 httpServer를 올림
// webSocket 서버만 작동하고 싶다면 httpServer를 전달할 필요는 없다


const publicRooms = () => {
    const {
        sockets: {
            adapter: {sids, rooms}
        },
    } = wsServer;

    const publicRooms = [];
    rooms.forEach((_, key) => {
        if (sids.get(key) === undefined)
            publicRooms.push(key);
    });
    return publicRooms;
}

const countRoomUser = (roomName) => {
    return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", socket => {
    socket["nickname"] = "Anon";
    console.log(socket);
    
    wsServer.sockets.emit("room_change", publicRooms());
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        console.log(`Socket Event: ${event}`);
        console.log(socket.id);

    });

    socket.on("enter_room", (roomName, done) => { // 프론트에서 보낸 개수 만큼 받아들인다
        console.log(roomName); // 백엔드 콘솔에서 출력
        socket.join(roomName);
        done(); // 호출은 백엔드에서, 실행은 프론트에서
        socket.to(roomName).emit("welcome", socket.nickname, countRoomUser(roomName)); // 방에 들어간 후 방의 모든 사람에게 welcome event 전달
        
        // 방이 추가된 정보를 모두에게 전달
        wsServer.sockets.emit("room_change", publicRooms());
    });

    socket.on("disconnecting", () => { // 연결이 끊어지기 전의 동작을 지정할 수 있다!
        socket.rooms.forEach(room => socket.to(room).emit("bye", socket.nickname, countRoomUser(roomName) - 1));
        // wsServer.sockets.emit("room_change", publicRooms()); 연결이 끊기기 전인 disconnecting에서 코드를 실행하면 방을 나간 것이 반영안됨

    });

    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());

    })

    socket.on("new_message", (msg, roomName, done) => {
        socket.to(roomName).emit("new_message", msg, socket.nickname);
        done();
    });

    socket.on("nickname", nickname => {
        socket["nickname"] = nickname;
    })
});

// const sockets = [];


// // event 발생을 기다리는 함수 on
// // 이벤트 발생 시 서버와 연결된 사람의 정보를 socket(브라우저로의 연결)에 담아서 전달
// // connection이 생겼을 때 socket으로 즉시 hello 메시지를 보내는 코드
// wss.on("connection", (socket) => {
//     sockets.push(socket); // 각 브라우저에 대해 생성한 socekt을 array에 저장 > 받은 메시지를 모든 socket(브라우저)에 전달 가능
//     socket["nickname"] = "Anon"; // socket에 nickname 속성 (default=익명) 추가. 정보를 저장할 수 있다!!
//     console.log("Connected to Browser");
//     socket.on("close", () => console.log("Disconnected from Browser")); // socket에서 발생하는 close event 처리. 연결된 브라우저를 닫으면 close발생
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch (message.type) {
//             case 'message':
//                 sockets.forEach(aSocket => aSocket.send(`${socket.nickname} : ${message.payload}`));
//             case 'nickname':
//                 socket["nickname"] = message.payload;
//         }
//         //socket.send(message.toString()); // message를 Blob type으로 보내기 때문에 string으로 변환 빌요
//     }); // 브라우저에서 받은 메시지 처리
//     socket.send("hello"); 
// }) // callback으로 socket을 받는다. socket은 브라우저와의 연락 라인

httpServer.listen(3000);


// 새로운 브라우저가 서버와 연결될 때, 각 브라우저에 대해 코드가 실행된다
// 하지만 서로 다른 브라우저는 서로 메시지를 주고받지 못한다
// 서버가 각 브라우저에서 받은 메시지를 해당 브라우저에만 전송함
