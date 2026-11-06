import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';
import { checkContent, getActiveChatMute, registerProfanityStrike } from '../services/safety.service';

const router = Router();

router.get('/status', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profanityWarnings: true, chatMutedUntil: true },
  });
  const mutedUntil = user?.chatMutedUntil && user.chatMutedUntil > new Date() ? user.chatMutedUntil : null;
  res.json({ warnings: user?.profanityWarnings || 0, mutedUntil });
});

router.get('/party/:partyId', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const partyId = Number(req.params.partyId);
  const member = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId } } });
  if (!member || member.status !== 'ACCEPTED') return res.status(403).json({ message: 'Party membership required' });

  const conversation = await prisma.conversation.upsert({
    where: { partyId },
    update: {},
    create: { type: 'PARTY', partyId },
  });
  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedUserIds = blocks.map(block => block.blockerId === userId ? block.blockedId : block.blockerId);
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id, senderId: { notIn: blockedUserIds } },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.post('/party/:partyId', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const partyId = Number(req.params.partyId);
  const content = String(req.body.content || '').trim().slice(0, 2000);
  if (!content) return res.status(400).json({ message: 'Message content is required' });
  const member = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId } } });
  if (!member || member.status !== 'ACCEPTED') return res.status(403).json({ message: 'Party membership required' });
  const mutedUntil = await getActiveChatMute(userId);
  if (mutedUntil) return res.status(403).json({ code: 'CHAT_MUTED', mutedUntil, message: 'บัญชีของคุณถูกระงับการแชทชั่วคราว' });
  const safety = await checkContent(content);
  if (safety.code === 'PROFANITY_DETECTED') {
    const strike = await registerProfanityStrike(userId);
    if (strike.mutedUntil) {
      return res.status(403).json({ code: 'CHAT_MUTED', warnings: strike.warnings, mutedUntil: strike.mutedUntil, message: 'ครบ 3 คำเตือนแล้ว ระงับการแชททุกห้องเป็นเวลา 30 นาที' });
    }
    return res.status(400).json({ code: 'PROFANITY_WARNING', warnings: strike.warnings, warningsRemaining: 3 - strike.warnings, message: `พบคำหยาบ ข้อความไม่ได้ถูกส่ง (คำเตือน ${strike.warnings}/3)` });
  }
  if (safety.level === 'BLOCK') {
    return res.status(400).json({ code: safety.code, message: 'Your message does not follow our community safety rules. Please revise it.' });
  }

  const conversation = await prisma.conversation.upsert({
    where: { partyId },
    update: {},
    create: { type: 'PARTY', partyId },
  });
  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: userId, content },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  });
  req.app.get('io')?.to(`party_${partyId}`).emit('receive_party_message', { ...message, partyId });
  res.status(201).json(message);
});

router.get('/direct/:friendId', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const friendId = Number(req.params.friendId);
  if (!Number.isInteger(friendId) || friendId < 1 || friendId === userId) return res.status(400).json({ message: 'Invalid friend ID' });
  const block = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: userId, blockedId: friendId }, { blockerId: friendId, blockedId: userId }] },
  });
  if (block) return res.status(403).json({ message: 'Direct chat is unavailable because one user has blocked the other' });
  const friendship = await prisma.friendRequest.findFirst({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId, receiverId: friendId }, { requesterId: friendId, receiverId: userId }] },
  });
  if (!friendship) return res.status(403).json({ message: 'Direct chat requires an accepted friend' });
  const conversation = await prisma.conversation.findFirst({
    where: {
      type: 'DIRECT',
      members: { some: { userId } },
      AND: { members: { some: { userId: friendId } } },
    },
  });
  if (!conversation) return res.json([]);
  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  });
  res.json(messages);
});

router.post('/direct/:friendId', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const friendId = Number(req.params.friendId);
  if (!Number.isInteger(friendId) || friendId < 1 || friendId === userId) return res.status(400).json({ message: 'Invalid friend ID' });
  const block = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: userId, blockedId: friendId }, { blockerId: friendId, blockedId: userId }] },
  });
  if (block) return res.status(403).json({ message: 'Direct chat is unavailable because one user has blocked the other' });
  const friendship = await prisma.friendRequest.findFirst({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId, receiverId: friendId }, { requesterId: friendId, receiverId: userId }] },
  });
  if (!friendship) return res.status(403).json({ message: 'Direct chat requires an accepted friend' });
  const content = String(req.body.content || '').trim().slice(0, 2000);
  if (!content) return res.status(400).json({ message: 'Message content is required' });
  const mutedUntil = await getActiveChatMute(userId);
  if (mutedUntil) return res.status(403).json({ code: 'CHAT_MUTED', mutedUntil, message: 'บัญชีของคุณถูกระงับการแชทชั่วคราว' });
  const safety = await checkContent(content);
  if (safety.code === 'PROFANITY_DETECTED') {
    const strike = await registerProfanityStrike(userId);
    if (strike.mutedUntil) {
      return res.status(403).json({ code: 'CHAT_MUTED', warnings: strike.warnings, mutedUntil: strike.mutedUntil, message: 'ครบ 3 คำเตือนแล้ว ระงับการแชททุกห้องเป็นเวลา 30 นาที' });
    }
    return res.status(400).json({ code: 'PROFANITY_WARNING', warnings: strike.warnings, warningsRemaining: 3 - strike.warnings, message: `พบคำหยาบ ข้อความไม่ได้ถูกส่ง (คำเตือน ${strike.warnings}/3)` });
  }
  if (safety.level === 'BLOCK') {
    return res.status(400).json({ code: safety.code, message: 'Your message does not follow our community safety rules. Please revise it.' });
  }
  let conversation = await prisma.conversation.findFirst({
    where: { type: 'DIRECT', members: { some: { userId } }, AND: { members: { some: { userId: friendId } } } },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: { create: [{ userId }, { userId: friendId }] },
      },
    });
  }
  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: userId, content },
    include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
  });
  const payload = { ...message, receiverId: friendId, senderId: userId };
  req.app.get('io')?.to(`user_${friendId}`).emit('receive_direct_message', payload);
  req.app.get('io')?.to(`user_${userId}`).emit('receive_direct_message', payload);
  res.status(201).json(message);
});

export default router;