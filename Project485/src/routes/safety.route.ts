import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

router.get('/notifications', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(notifications);
});

router.patch('/notifications/:id/read', authenticate, async (req, res) => {
  const notification = await prisma.notification.update({
    where: { id: Number(req.params.id), userId: (req as any).user.userId },
    data: { readAt: new Date() },
  });
  res.json(notification);
});

router.post('/blocks', authenticate, async (req, res) => {
  const blockerId = (req as any).user.userId;
  const blockedId = Number(req.body.userId);
  if (!blockedId || blockedId === blockerId) return res.status(400).json({ message: 'Invalid userId' });
  const block = await prisma.userBlock.upsert({
    where: { blockerId_blockedId: { blockerId, blockedId } },
    update: {},
    create: { blockerId, blockedId },
  });
  res.status(201).json(block);
});

router.get('/blocks', authenticate, async (req, res) => {
  const blockerId = (req as any).user.userId;
  const blocks = await prisma.userBlock.findMany({
    where: { blockerId },
    include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(blocks.map(({ blocked, createdAt }) => ({ ...blocked, blockedAt: createdAt })));
});

router.delete('/blocks/:userId', authenticate, async (req, res) => {
  await prisma.userBlock.deleteMany({
    where: { blockerId: (req as any).user.userId, blockedId: Number(req.params.userId) },
  });
  res.status(204).send();
});

router.post('/reports', authenticate, async (req, res) => {
  const reporterId = (req as any).user.userId;
  const { targetUserId, reason } = req.body;
  if (!targetUserId || !String(reason || '').trim()) return res.status(400).json({ message: 'targetUserId and reason are required' });
  const report = await prisma.report.create({
    data: { reporterId, targetUserId: Number(targetUserId), reason: String(reason).trim() },
  });
  res.status(201).json(report);
});

export default router;
