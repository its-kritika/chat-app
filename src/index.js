//Server
const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')  //returns a function
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const app = express()
//we have created server outside of express library, creating it ourselves so that we can later use webSockets through socket.io library
const server = http.createServer(app)
const io = socketio( server )   //check udemy notes for socket.io

//setting path for public folder
const publicDirectoryPath = path.join(__dirname, '../public')
app.use(express.static(publicDirectoryPath))


//connecting a client
//here at line 20 and 31 connection and disconnect are built-in events provided by socket.io and thus there names should match as it
//is but sendMessage or message are events created by user and can be named anything
io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', ({ username, room }, callback) => {
        //socket.id is unique id created for every socket accessible in whole of this connection setup
        const { error, user } = addUser({ id : socket.id, username, room })

        if (error){
            return callback(error)
        }

        socket.join(user.room) //join function allows user to join the room

        socket.emit('message', generateMessage(`Hey ${user.username}`, 'Welcome!'))
        //it will send the message to everybody in that particular room except the user who joined in and others not in room
        socket.broadcast.to( user.room ).emit('message', generateMessage(user.username, `${user.username} has joined`) )

        io.to(user.room).emit('roomData', {
            room : user.room,
            users : getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (text, callback) => {
        const user = getUser(socket.id)

        const filter = new Filter()
        if (filter.isProfane(text)){
            return callback('Profanity is not allowed!')
        }
    
        socket.emit('message', generateMessage('You', text))
        socket.broadcast.to(user.room).emit('message', generateMessage(user.username, text))
        callback()
    })

    socket.on('sendLocation', (location, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${location.lat},${location.long}`))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
        //this if statement is used in case someone tried to enter the room but error was thrown (if username or room, not provided)
        //and then closes the browser, i.e, disconnects, in this case no one needs to be notified about that user who tried to
        //enter but did not enter
        if (user){
            //sending left message to only those present in the particular room
            io.to(user.room).emit('message', generateMessage(user.username, `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room : user.room,
                users : getUsersInRoom(user.room)
            })
        }
    })

})

server.listen(3000, () => {
    console.log('Server has started functioning!')
})