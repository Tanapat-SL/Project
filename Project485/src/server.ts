import app from './app';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';

dotenv.config();

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Setup Socket.io for Real-time Chat & Party System
const io = new Server(httpServer, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

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
  });
});

httpServer.listen(PORT, () => {
  console.log(`MATCHFOUND Server running on port ${PORT}`);
});
