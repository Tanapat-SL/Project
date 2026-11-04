"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
const httpServer = (0, http_1.createServer)(app_1.default);
// Setup Socket.io for Real-time Chat & Party System
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
app_1.default.set('io', io);
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    const publishOnlineCount = () => io.emit('online_count', io.of('/').sockets.size);
    publishOnlineCount();
    socket.on('request_online_count', () => {
        socket.emit('online_count', io.of('/').sockets.size);
    });
    // Join Personal Room (for direct messages & invites)
    socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${socket.id} joined personal room user_${userId}`);
    });
    // Join Party Room
    socket.on('join_party_room', (partyId) => {
        socket.join(`party_${partyId}`);
        console.log(`User ${socket.id} joined party room party_${partyId}`);
    });
    // Send Direct Message
    socket.on('send_dm', (data) => {
        // data: { receiverId, content, senderId, senderName }
        io.to(`user_${data.receiverId}`).emit('receive_dm', data);
    });
    socket.on('send_direct_message', (data) => {
        io.to(`user_${data.receiverId}`).emit('receive_direct_message', data);
        io.to(`user_${data.senderId}`).emit('receive_direct_message', data);
    });
    // Send Party Message
    socket.on('send_party_message', (data) => {
        // data: { partyId, content, senderId, senderName }
        io.to(`party_${data.partyId}`).emit('receive_party_message', data);
    });
    // Party Join Request Notification
    socket.on('request_join_party', (data) => {
        // data: { partyOwnerId, partyId, requesterId, requesterName }
        io.to(`user_${data.partyOwnerId}`).emit('party_join_request', data);
    });
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        publishOnlineCount();
    });
});
httpServer.listen(PORT, () => {
    console.log(`MATCHFOUND Server running on port ${PORT}`);
});
