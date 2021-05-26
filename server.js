const express=require('express');
const path=require("path");
const socket=require('socket.io');
const cors = require('cors');

const PORT =5001;

const app=express(); //initializing express app
app.use(cors()); //use CORS as middleware

const server = app.listen(PORT,()=>{ //initialze http server on given port
    console.log(`server started on http://localhost:${PORT}`);
});


const io = socket(server,{
    cors:{
        origin:"*",
        methods:["GET","POST"]
    }
});

io.on('connection',(socket)=>{ //when connection made by browser

    console.log('socket connection id: ', socket.id);
    socket.on('chat', function(data){
        // console.log(data);
        io.sockets.emit('chat', data);
    });

    // Handle typing event
    socket.on('typing', function(data){
        socket.broadcast.emit('typing', data);
    });
    
    
    
    
    
    
    
    
    
    // socket.emit('me',socket.id);

    // socket.on('disconnect',()=>{
    //     socket.broadcast.emit('callended')
    // });

    // socket.on('calluser',(data)=>{
    //     const {userToCall,signalData,from,name} = data;

    //     io.to(userToCall).emit('calluser',{signal:signalData,from:from,name:name})
        
    // });

    // socket.on('answercall',(data)=>{
    //     io.to(data.to).emit('callaccepted',data.signal)
    // })
})











app.get('*', (req,res) =>{ //redirect other requests to index.html 
    res.sendFile(path.join(__dirname+'/public/index.html'));
});