import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdminUser, requireAdmin } from '../middlewares/admin.middleware';

const router = Router();

const appealUserSelect = { id: true, username: true, displayName: true, avatarUrl: true, isBanned: true, banReason: true } as const;

/** อัปเดตสถานะแบนของ socket ที่ออนไลน์อยู่ และแจ้งผู้ใช้ทันที */
function syncBanState(io: any, userId: number, banned: boolean) {
  if (!io) return;
  for (const socket of io.of('/').sockets.values()) {
    if (socket.data.userId !== userId) continue;
    socket.data.isBanned = banned;
    if (banned) {
      // ถอนออกจากห้องปาร์ตี้ทั้งหมด เหลือไว้แค่ห้องส่วนตัว (เพื่อรับผลอุทธรณ์)
      for (const room of [...socket.rooms]) {
        if (room !== socket.id && room !== `user_${userId}`) socket.leave(room);
      }
    }
  }
  io.to(`user_${userId}`).emit(banned ? 'account_banned' : 'account_unbanned');
}

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
  const { targetUserId, reason, category } = req.body;
  const parsedTargetId = Number(targetUserId);
  const categories = ['PROFANITY', 'TOXIC', 'AFK', 'DISRUPTION', 'HARASSMENT'];
  if (!Number.isInteger(parsedTargetId) || parsedTargetId < 1 || !categories.includes(String(category))) {
    return res.status(400).json({ message: 'A valid targetUserId and report category are required' });
  }
  if (parsedTargetId === reporterId) return res.status(400).json({ message: 'You cannot report yourself' });
  const targetExists = await prisma.user.findUnique({ where: { id: parsedTargetId }, select: { id: true } });
  if (!targetExists) return res.status(404).json({ message: 'User not found' });
  const created = await prisma.report.create({
    data: {
      reporterId,
      targetUserId: parsedTargetId,
      category: category as any,
      reason: String(reason || '').trim().slice(0, 1000) || String(category),
    },
    include: {
      reporter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      targetUser: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBanned: true, banReason: true, bannedAt: true } },
    },
  });
  req.app.get('io')?.to('admins').emit('report_created', {
    ...created,
    targetUser: { ...created.targetUser, isAdmin: await isAdminUser(parsedTargetId) },
  });
  const { reporter: _reporter, targetUser: _targetUser, ...report } = created;
  res.status(201).json(report);
});

router.get('/appeals/mine', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const appeals = await prisma.banAppeal.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  res.json(appeals);
});

router.post('/appeals', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const message = String(req.body.message || '').trim();
  if (message.length < 20) return res.status(400).json({ message: 'คำอุทธรณ์ต้องมีอย่างน้อย 20 ตัวอักษร' });
  if (message.length > 2000) return res.status(400).json({ message: 'คำอุทธรณ์ยาวเกินกำหนด' });
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { isBanned: true } });
  if (!user?.isBanned) return res.status(400).json({ message: 'บัญชีนี้ไม่ได้ถูกระงับ' });
  const pending = await prisma.banAppeal.findFirst({ where: { userId, status: 'OPEN' } });
  if (pending) return res.status(409).json({ message: 'มีคำอุทธรณ์ที่รอพิจารณาอยู่แล้ว' });
  const appeal = await prisma.banAppeal.create({
    data: { userId, message },
    include: { user: { select: appealUserSelect } },
  });
  req.app.get('io')?.to('admins').emit('appeal_created', appeal);
  res.status(201).json(appeal);
});

router.post('/admin/users/:id/ban', authenticate, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId < 1) return res.status(400).json({ message: 'Invalid user ID' });
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } });
  if (!target) return res.status(404).json({ message: 'User not found' });
  if (targetId === (req as any).user.userId || await isAdminUser(targetId)) {
    return res.status(400).json({ message: 'Admins and your own account cannot be banned here' });
  }
  const reason = String(req.body.reason || '').trim().slice(0, 500);
  const admin = await prisma.user.findUnique({ where: { id: (req as any).user.userId }, select: { discordId: true } });
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { isBanned: true, bannedAt: new Date(), banReason: reason || 'ละเมิดกฎชุมชน', bannedByDiscordId: admin?.discordId || null },
    select: { id: true, isBanned: true, bannedAt: true, banReason: true },
  });
  syncBanState(req.app.get('io'), targetId, true);
  res.json(user);
});

router.delete('/admin/users/:id/ban', authenticate, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  if (!Number.isInteger(targetId) || targetId < 1) return res.status(400).json({ message: 'Invalid user ID' });
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { isBanned: false, bannedAt: null, banReason: null, bannedByDiscordId: null },
    select: { id: true, isBanned: true },
  });
  syncBanState(req.app.get('io'), targetId, false);
  res.json(user);
});

router.get('/admin/appeals', authenticate, requireAdmin, async (_req, res) => {
  const appeals = await prisma.banAppeal.findMany({
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBanned: true, banReason: true } } },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });
  res.json(appeals);
});

router.patch('/admin/appeals/:id', authenticate, requireAdmin, async (req, res) => {
  const appealId = Number(req.params.id);
  const status = String(req.body.status || '').toUpperCase();
  const adminNote = String(req.body.adminNote || '').trim().slice(0, 1000) || null;
  if (!Number.isInteger(appealId) || appealId < 1) return res.status(400).json({ message: 'Invalid appeal ID' });
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Invalid appeal status' });
  const admin = await prisma.user.findUnique({ where: { id: (req as any).user.userId }, select: { discordId: true } });
  const appeal = await prisma.$transaction(async tx => {
    const updated = await tx.banAppeal.update({
      where: { id: appealId },
      data: { status: status as any, adminNote, reviewedAt: new Date(), reviewedByDiscordId: admin?.discordId || null },
      include: { user: { select: appealUserSelect } },
    });
    if (status === 'APPROVED') {
      await tx.user.update({ where: { id: updated.userId }, data: { isBanned: false, bannedAt: null, banReason: null, bannedByDiscordId: null } });
      return { ...updated, user: { ...updated.user, isBanned: false, banReason: null } };
    }
    return updated;
  });
  const io = req.app.get('io');
  io?.to('admins').emit('appeal_updated', appeal);
  io?.to(`user_${appeal.userId}`).emit('appeal_reviewed', { id: appeal.id, status: appeal.status, adminNote: appeal.adminNote });
  if (status === 'APPROVED') syncBanState(io, appeal.userId, false);
  res.json(appeal);
});

router.get('/admin/reports', authenticate, requireAdmin, async (_req, res) => {
  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      targetUser: { select: { id: true, username: true, displayName: true, avatarUrl: true, isBanned: true, banReason: true, bannedAt: true } },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });
  const reportsWithAdminFlag = await Promise.all(reports.map(async report => ({
    ...report,
    targetUser: { ...report.targetUser, isAdmin: await isAdminUser(report.targetUser.id) },
  })));
  res.json(reportsWithAdminFlag);
});

router.patch('/admin/reports/:id', authenticate, requireAdmin, async (req, res) => {
  const reportId = Number(req.params.id);
  const status = String(req.body.status || '').toUpperCase();
  if (!Number.isInteger(reportId) || reportId < 1) return res.status(400).json({ message: 'Invalid report ID' });
  if (!['OPEN', 'REVIEWED', 'DISMISSED'].includes(status)) return res.status(400).json({ message: 'Invalid report status' });
  const report = await prisma.report.update({ where: { id: reportId }, data: { status: status as any } });
  res.json(report);
});

export default router;
