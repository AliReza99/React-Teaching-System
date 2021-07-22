const express = require('express');
const path = require("path");
const socket = require('socket.io');
const cors = require('cors');
const { v4: uuid } = require('uuid');

const PORT = 5001;

const app = express(); //initializing express app
app.use(cors()); //use CORS as middleware
app.use(express.static("public"));

const server = app.listen(PORT, () => { //initialze http server on given port
    console.log(`server started on http://localhost:${PORT}`);
});

const io = socket(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});



let rooms = [];

function Room(id, admin) {
    this.id = id,
        this.admin = admin,
        this.users = [],
        this.messages = []

    this.addUser = (username) => {
        this.users.push(username)
    }
}

function Message(id, sender, text, date, role, rate, hardness,repliedID) {
    this.id = id,
    this.sender = sender,
    this.text = text,
    this.date = new Date(date),
    this.role = role,
    this.rate = rate,
    this.hardness = hardness,
    this.repliedID=repliedID

    this.setRate=(rate)=>{
        this.rate=rate
    }
}

function User(username) {
    this.username = username,
        this.joinDate = new Date(),
        this.leaveDate = null

    this.setLeaveDate = (leaveDate) => {
        this.leaveDate = leaveDate
    }
}

//io.in(roomID) to all clients in room1
//socket.to(roomID) to all clients in room1 except the sender
//io.to(socketID) to specific socket id (private message )

io.on('connection', (socket) => { //when connection made by browser
    // console.log('new socket: ', socket.id);

    socket.on('join-room', ({ username , roomID }) => {
        let isAdmin = false;

        let myRoom = rooms.filter((room) => {
            return room.id === roomID;
        })[0] //return first founded room

        if (myRoom) { //if room existed
            if (myRoom.users.includes(username)) {
                console.log('user already existed in this room', username)
                return;
            }
            myRoom.addUser(username);
            console.log('new user added', rooms);

            io.to(socket.id).emit('full-chat-update',myRoom.messages);//send previous chat messages to entered user
            
        } 
        else {
            isAdmin = true;
            myRoom = new Room(roomID, username); //create new room with that id and set user as admin
            rooms.push(myRoom);
            console.log('room created', myRoom);
        }

        // if (io.sockets.adapter.rooms.get(roomID) && io.sockets.adapter.rooms.get(roomID).has(socket.id)) {
        //     return;
        // }
        socket.join(roomID); //join current user to given room name
        socket.to(roomID).emit('new-user-joined', {target:socket.id,username:username});



        if(isAdmin){
            io.to(socket.id).emit('set-is-admin');
            
            socket.on('clear-chat',()=>{
                myRoom.messages=[];
                io.in(roomID).emit('full-chat-update',myRoom.messages);
            });
            
            socket.on('rate-message',({rate,messageID})=>{
                const message = myRoom.messages.filter(message=>message.id===messageID)[0]
                message.setRate(rate);
                console.log(message);
    
                io.in(roomID).emit('update-message',message);
            })
        }


        
        socket.on('chat', (data) => {

            const chatID = uuid();//generate unique id
            let role= "message";
            let hardness = null;
            const rate = isAdmin ? data.rate : null;
            
            if(data.repliedID){
                role="answer";
            }
            else if(isAdmin && data.hardness){
                role="question";
                hardness=data.hardness;
            }

            const msg = new Message(chatID, username, data.text, new Date(), role, rate, hardness,data.repliedID);
            myRoom.messages.push(msg);
            io.in(roomID).emit('chat',msg);

        });




        socket.on('offer', ({
            offer,
            target
        }) => {
            io.to(target).emit('offer', {
                offer: offer,
                target: socket.id,
                username:username
            })
        })

        socket.on('answer', ({
            answer,
            target
        }) => { //answer should be private 
            io.to(target).emit('answer', {
                answer: answer,
                target: socket.id
            });
        })


        socket.on('disconnect', () => {
            socket.to(roomID).emit('user-disconnected', socket.id); //not listen in front-end
            if (io.sockets.adapter.rooms.get(roomID) === undefined) { //if room was empty 
                rooms = rooms.filter(r => r.id !== roomID); //remove room from rooms array
            }
        })

    });

    socket.on("ice-candidate", ({
        target,
        candidate
    }) => {
        io.to(target).emit("ice-candidate", {
            incoming: candidate,
            target: socket.id
        });
    });

})





app.get('*', (req, res) => { //redirect other requests to index.html 
    res.sendFile(path.join(__dirname + '/public/index.html'));
});