import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// ─── รายชื่อเพื่อน ───────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;

  const blocks = await prisma.userBlock.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  const blockedIds = new Set(blocks.map(b => b.blockerId === userId ? b.blockedId : b.blockerId));

  const accepted = await prisma.friendRequest.findMany({
    where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { receiverId: userId }] },
    include: {
      requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      receiver:  { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(
    accepted
      .map(r => r.requesterId === userId ? r.receiver : r.requester)
      .filter(f => !blockedIds.has(f.id)),
  );
});

// ─── คำขอเป็นเพื่อนที่ยังรออนุมัติ (ที่ตัวเองรับ) ────────────────
router.get('/requests', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: userId, status: 'PENDING' },
    include: { requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(requests);
});

// ─── ตรวจสถานะความเป็นเพื่อนกับผู้ใช้คนหนึ่ง ────────────────────
router.get('/status/:userId', authenticate, async (req, res) => {
  const userId   = (req as any).user.userId;
  const targetId = Number(req.params.userId);
  if (!Number.isInteger(targetId) || targetId < 1)
    return res.status(400).json({ message: 'Invalid userId' });
  if (targetId === userId) return res.json({ status: 'SELF' });

  const request = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { requesterId: userId,   receiverId: targetId },
        { requesterId: targetId, receiverId: userId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!request)                        return res.json({ status: 'NONE' });
  if (request.status === 'ACCEPTED')   return res.json({ status: 'FRIENDS',   requestId: request.id });
  if (request.status === 'REJECTED')   return res.json({ status: 'NONE' });
  return res.json({
    status:    request.requesterId === userId ? 'REQUESTED' : 'INCOMING',
    requestId: request.id,
  });
});

// ─── ส่งคำขอเป็นเพื่อน ───────────────────────────────────────────
router.post('/requests', authenticate, async (req, res) => {
  const requesterId = (req as any).user.userId;
  const receiverId  = Number(req.body.userId);

  if (!Number.isInteger(receiverId) || receiverId < 1 || receiverId === requesterId)
    return res.status(400).json({ message: 'Invalid userId' });
  const receiverExists = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } });
  if (!receiverExists) return res.status(404).json({ message: 'User not found' });

  // บล็อกกันอยู่ → ส่งไม่ได้
  const blocked = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: requesterId, blockedId: receiverId }, { blockerId: receiverId, blockedId: requesterId }] },
  });
  if (blocked) return res.status(403).json({ message: 'Cannot send a friend request to this user' });

  // เป็นเพื่อนกันแล้ว
  const existing = await prisma.friendRequest.findFirst({
    where: { status: 'ACCEPTED', OR: [{ requesterId, receiverId }, { requesterId: receiverId, receiverId: requesterId }] },
  });
  if (existing) return res.status(200).json(existing);

  // อีกฝ่ายส่งมาก่อน → ยอมรับอัตโนมัติ
  const reverse = await prisma.friendRequest.findFirst({
    where: { requesterId: receiverId, receiverId: requesterId, status: 'PENDING' },
  });
  if (reverse) {
    const updated = await prisma.friendRequest.update({
      where: { id: reverse.id },
      data:  { status: 'ACCEPTED' },
    });
    await prisma.notification.create({
      data: { userId: receiverId, type: 'FRIEND_REQUEST_ACCEPTED', payload: { userId: requesterId } },
    });
    return res.status(200).json(updated);
  }

  // ส่งคำขอใหม่
  const request = await prisma.friendRequest.upsert({
    where:  { requesterId_receiverId: { requesterId, receiverId } },
    update: { status: 'PENDING' },
    create: { requesterId, receiverId },
  });
  await prisma.notification.create({
    data: { userId: receiverId, type: 'FRIEND_REQUEST', payload: { requesterId, requestId: request.id } },
  });
  res.status(201).json(request);
});

// ─── ยอมรับ / ปฏิเสธคำขอ ─────────────────────────────────────────
router.patch('/requests/:id', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const status = String(req.body.status || '').toUpperCase();

  if (!['ACCEPTED', 'REJECTED'].includes(status))
    return res.status(400).json({ message: 'status must be ACCEPTED or REJECTED' });

  const request = await prisma.friendRequest.findFirst({
    where: { id: Number(req.params.id), receiverId: userId },
  });
  if (!request) return res.status(404).json({ message: 'Friend request not found' });

  const updated = await prisma.friendRequest.update({
    where: { id: request.id },
    data:  { status } as any,
  });

  if (status === 'ACCEPTED') {
    await prisma.notification.create({
      data: { userId: request.requesterId, type: 'FRIEND_REQUEST_ACCEPTED', payload: { userId } },
    });
  }
  res.json(updated);
});

// ─── ลบเพื่อน ─────────────────────────────────────────────────────
router.delete('/:userId', authenticate, async (req, res) => {
  const userId   = (req as any).user.userId;
  const targetId = Number(req.params.userId);
  if (!Number.isInteger(targetId) || targetId < 1 || targetId === userId)
    return res.status(400).json({ message: 'Invalid userId' });

  await prisma.friendRequest.deleteMany({
    where: {
      status: 'ACCEPTED',
      OR: [
        { requesterId: userId,   receiverId: targetId },
        { requesterId: targetId, receiverId: userId },
      ],
    },
  });
  res.status(204).send();
});

export default router;

