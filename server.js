const express=require('express');
const path=require("path");
const socket=require('socket.io');
const cors = require('cors');

const PORT =5001;

const app=express(); //initializing express app
app.use(cors()); //use CORS as middleware
app.use(express.static("public"));

const server = app.listen(PORT,()=>{ //initialze http server on given port
    console.log(`server started on http://localhost:${PORT}`);
});

const io = socket(server,{
    cors:{
        origin:"*",
        methods:["GET","POST"]
    }
});


let rooms=[];

io.on('connection',(socket)=>{ //when connection made by browser
    console.log('new socket: ', socket.id);
    socket.on('chat', (data)=>{
        io.sockets.emit('chat', data);
    });

    socket.on('join-room',({username,roomID})=>{


        if(!rooms.includes(roomID)){ //push roomID to rooms if not exist already
            rooms.push(roomID);
        }
        if(io.sockets.adapter.rooms.get(roomID) && io.sockets.adapter.rooms.get(roomID).has(socket.id) )
        {
            return;
        }
        socket.join(roomID); //join current user to given room name
        socket.to(roomID).emit('new-user-joined',socket.id);
        

        socket.on('offer',({offer,target})=>{
            io.to(target).emit('recieve-offer',{
                offer:offer,
                target:socket.id
            })
        })

        socket.on('answer',({answer,target})=>{//answer should be private 
            io.to(target).emit('recieve-answer',{answer:answer,target:socket.id});
        })


        socket.on('disconnect', ()=> {
            socket.to(roomID).emit('user-disconnected',socket.id); //not listen in front-end
            if(io.sockets.adapter.rooms.get(roomID)===undefined){//if room was empty 
                rooms=rooms.filter(elem => elem !== roomID); //remove room from rooms array
            }
        })
        
    });

    socket.on("ice-candidate", ({target,candidate}) => {
        io.to(target).emit("ice-candidate", {incoming:candidate,target:socket.id});
    });

})





app.get('*', (req,res) =>{ //redirect other requests to index.html 
    res.sendFile(path.join(__dirname+'/public/index.html'));
});