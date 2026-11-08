import app from './app';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma';
import { isAdminUser } from './middlewares/admin.middleware';
import { env } from './config/env';

dotenv.config();

const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

// Setup Socket.io for Real-time Chat & Party System
const io = new Server(httpServer, {
  cors: {
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.data.userId = null;
    return next();
  }
  try {
    const payload = jwt.verify(String(token), process.env.JWT_SECRET as string) as { userId: number };
    const userId = Number(payload.userId);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true } });
    if (!user) return next(new Error('UNAUTHORIZED'));
    socket.data.userId = userId;
    // ผู้ถูกแบนยังเชื่อมต่อได้ (เพื่อรับผลคำอุทธรณ์แบบเรียลไทม์) แต่จะเข้าห้องปาร์ตี้ไม่ได้
    socket.data.isBanned = user.isBanned && !(await isAdminUser(userId));
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  // เข้าห้องส่วนตัวฝั่งเซิร์ฟเวอร์เลย (frontend ไม่เคยส่ง join_user_room ทำให้แชทส่วนตัวไม่ realtime)
  if (socket.data.userId) {
    socket.join(`user_${socket.data.userId}`);
    // แอดมินเข้าห้อง 'admins' เพื่อรับรีพอร์ต/คำอุทธรณ์ใหม่แบบเรียลไทม์
    void isAdminUser(socket.data.userId)
      .then((isAdmin) => { if (isAdmin) socket.join('admins'); })
      .catch(() => undefined);
  }
  const publishOnlineCount = () => io.emit('online_count', io.of('/').sockets.size);
  publishOnlineCount();

  socket.on('request_online_count', () => {
    socket.emit('online_count', io.of('/').sockets.size);
  });

  // Join Personal Room (for direct messages & invites)
  socket.on('join_user_room', (userId) => {
    if (!socket.data.userId || Number(userId) !== socket.data.userId) return;
    socket.join(`user_${userId}`);
    console.log(`User ${socket.id} joined personal room user_${userId}`);
  });

  // Join Party Room
  socket.on('join_party_room', async (partyId) => {
    if (!socket.data.userId || socket.data.isBanned || !Number.isInteger(Number(partyId))) return;
    const member = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId: Number(partyId), userId: socket.data.userId } } });
    if (!member || member.status !== 'ACCEPTED') return;
    socket.join(`party_${partyId}`);
    console.log(`User ${socket.id} joined party room party_${partyId}`);
  });

  // Messages are published only by authenticated REST routes after persistence and safety checks.

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    publishOnlineCount();
  });
});

httpServer.listen(PORT, () => {
  console.log(`MATCHFOUND Server running on port ${PORT}`);
});
