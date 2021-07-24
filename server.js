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

class Room{
    constructor(id){
        this.id = id,
        // this.admin = admin,
        this.users = [],
        this.messages = []
    }

    addUser = (username) => {
        this.users.push(username)
    }
}

class Message {
    constructor(id, sender, text, date, role, rate, hardness,repliedID){
        this.id = id,
        this.sender = sender,
        this.text = text,
        this.date = new Date(date),
        this.role = role,
        this.rate = rate,
        this.hardness = hardness,
        this.repliedID=repliedID
    }

    setRate=(rate)=>{
        this.rate=rate
    }
}

class User{
    constructor(username,socketID,isAdmin=false){
        this.username = username,
        this.socketID=socketID;
        this.joinDate = new Date(),
        this.leaveDate = null,
        this.isAdmin = isAdmin;
    }

    setLeaveDate = (leaveDate) => {
        this.leaveDate = leaveDate
    }
    setIsAdmin=()=>{
        this.isAdmin=true;
    }
}

//io.in(roomID) to all clients in room1
//socket.to(roomID) to all clients in room1 except the sender
//io.to(socketID) to specific socket id (private message )

const isUsernameExist=(username,arr)=>{
    const dupsArr= arr.filter(u=>u.username === username);
    if(dupsArr.length> 0){
        return true;
    }
    return false;

}

io.on('connection', (socket) => { //when connection made by browser
    // console.log('new socket: ', socket.id);

    socket.on('join-room', ({ username , roomID }) => {

        let myRoom = rooms.filter((room) => {
            return room.id === roomID;
        })[0] //return first founded room

        const user=new User(username,socket.id,false);

        
        
        if (myRoom) { //if room existed

            for(let newName=user.username,i=2;;){
                if(!isUsernameExist(newName,myRoom.users))
                {
                    console.log('new name: ',newName);
                    user.username= newName;
                    break;
                }
                newName = `${user.username} ${i++}`;
            }

            myRoom.addUser(user);
            io.to(socket.id).emit('full-chat-update',myRoom.messages);//send previous chat messages to entered user
            
        } 
        else { //if room wasn't existed
            user.setIsAdmin();
            myRoom = new Room(roomID); //create new room with that id and set user as admin
            myRoom.addUser(user);
            rooms.push(myRoom);
        }

        socket.join(roomID); //join current user to given room name
        socket.to(roomID).emit('new-user-joined', {target:socket.id,username:user.username});


        io.to(socket.id).emit('self-info',{isAdmin:user.isAdmin,username:user.username});

        if(user.isAdmin){
            
            socket.on('clear-chat',()=>{
                myRoom.messages=[];
                io.in(roomID).emit('full-chat-update',myRoom.messages);
            });
            
            socket.on('rate-message',({rate,messageID})=>{
                const message = myRoom.messages.filter(message=>message.id===messageID)[0]
                message.setRate(rate);
    
                io.in(roomID).emit('update-message',message);
            })
        }


        
        socket.on('chat', (data) => {

            const chatID = uuid();//generate unique id
            let role= "message";
            let hardness = null;
            const rate = user.isAdmin ? data.rate : null;
            
            if(data.repliedID){
                role="answer";
            }
            else if(user.isAdmin && data.hardness){
                role="question";
                hardness=data.hardness;
            }

            const msg = new Message(chatID, user.username, data.text, new Date(), role, rate, hardness,data.repliedID);
            myRoom.messages.push(msg);
            io.in(roomID).emit('chat',msg);

        });




        socket.on('offer', ({ offer , target }) => {
            io.to(target).emit('offer', {
                offer: offer,
                target: socket.id,
                username:user.username
            })
        })

        socket.on('answer', ({ answer , target }) => { //answer should be private 
            io.to(target).emit('answer', {
                answer: answer,
                target: socket.id
            });
        })


        socket.on('disconnect', () => {
            socket.to(roomID).emit('user-disconnected', socket.id);
            //don't remove user but set disconnect status 
            myRoom.users=myRoom.users.filter(u=>u.socketID !== socket.id); //remove disconnected user from room
            
            if (io.sockets.adapter.rooms.get(roomID) === undefined) { //if room was empty 
                rooms = rooms.filter(r => r.id !== roomID); //remove room from rooms array
            }
        })

    });

    socket.on("ice-candidate", ({ target , candidate }) => {
        io.to(target).emit("ice-candidate", {
            incoming: candidate,
            target: socket.id
        });
    });

})

app.get('*', (req, res) => { //redirect other requests to index.html 
    res.sendFile(path.join(__dirname + '/public/index.html'));
});

/*
// if (io.sockets.adapter.rooms.get(roomID) && io.sockets.adapter.rooms.get(roomID).has(socket.id)) {
//     return;
// }
*/