const express = require("express")
const http = require("http")
const { Server } = require("socket.io")
const mongoose = require("mongoose")
const Message = require("./models/messages")
const app = express()
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

mongoose.connect(
  "mongodb+srv://babaganpat72:NHmBXpObkp0pVnA4@cluster0.apti0ez.mongodb.net/chat-app?retryWrites=true&w=majority&appName=Cluster0"
)
.then(() => console.log("Connected to MongoDB Atlas"))
.catch(err => console.log("MongoDB connection error:", err));

const users = {}

io.on("connection", (socket) => {
    console.log("user connected", socket.id)

    socket.on("login", (username) => {
        socket.data.username = username || "Anonymous"
        users[socket.data.username] = socket.id

        io.emit("users", users, username)
        socket.emit("messageFromServer", `welcome ${username}`)
        socket.broadcast.emit("messageFromServer", `new user joined: ${username}`)
    })

    socket.on("privateMessage", async ({ to, msg }) => {
        const fromUser = socket.data.username
        const receiverId = users[to]
        if (!users[to]) {
            socket.emit("messageFromServer", `${to} is offline`)
            return
        }
        const message = new Message({
            sender: fromUser,
            receiver: to,
            message: msg
        }
        )
        await message.save()

        socket.to(receiverId).emit("messageFromServer", ` ${msg}`,"other-message")
        socket.emit("messageFromServer", ` ${msg}`, "my-message")
    })

    socket.on("getPrivateMessages", async (withUser) => {
        const myUsername = socket.data.username

        const messages = await Message.find({
            $or: [
                { sender: myUsername, receiver: withUser },
                { sender: withUser, receiver: myUsername }
            ]
        }).sort({ createdAt: 1 })
        console.log(messages)
        socket.emit("loadOldMessages", messages, myUsername, withUser)
    })

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id)
        delete users[socket.data.username]
        io.emit("users", users)

    })
})
const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log("server is running on port 3000")
})
