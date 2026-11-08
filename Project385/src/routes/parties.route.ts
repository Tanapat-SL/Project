import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';
import { checkContent } from '../services/safety.service';

const router = Router();

const PARTY_STATUSES = ['OPEN', 'FULL', 'CLOSED'];
const GAME_MODES = ['RANKED', 'CASUAL', 'COOP', 'CUSTOM'];
const MAX_PARTY_SIZE = 20;

// ตรวจ :id / :userId ให้เป็นจำนวนเต็มบวกก่อนเข้า handler (กัน NaN ส่งเข้า Prisma)
const requirePositiveInt = (_req: any, res: any, next: any, value: string) => {
  if (!/^\d+$/.test(value) || Number(value) < 1) return res.status(400).json({ message: 'Invalid ID' });
  next();
};
router.param('id', requirePositiveInt);

/** ถอนทุก socket ของผู้ใช้ออกจากห้องแชทปาร์ตี้ (ออกเอง / ถูกเตะ) เพื่อไม่ให้ยังรับข้อความอยู่ */
const removeFromPartyRoom = (req: any, userId: number, partyId: number) => {
  req.app.get('io')?.in(`user_${userId}`).socketsLeave(`party_${partyId}`);
};
router.param('userId', requirePositiveInt);

router.get('/mine', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const memberships = await prisma.partyMember.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: {
      party: {
        include: {
          game: true,
          owner: { select: { id: true, username: true, avatarUrl: true } },
          members: { where: { status: 'ACCEPTED' }, include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
  res.json(memberships.map((membership) => membership.party));
});

router.get('/', async (req, res) => {
  const requestedStatus = req.query.status ? String(req.query.status).toUpperCase() : null;
  if (requestedStatus && !PARTY_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ message: 'Invalid status filter' });
  }
  const parties = await prisma.party.findMany({
    take: 100,
    where: {
      status: requestedStatus ? requestedStatus as any : { in: ['OPEN', 'FULL'] } as any,
      game: req.query.game ? { name: String(req.query.game) } : undefined,
      region: req.query.region ? String(req.query.region) : undefined,
      OR: req.query.rank ? [{ rankMin: String(req.query.rank) }, { rankMax: String(req.query.rank) }] as any : undefined,
    },
    include: {
      game: true,
      owner: { select: { id: true, username: true, avatarUrl: true } },
      members: { where: { status: 'ACCEPTED' }, include: { user: { select: { id: true, username: true } } } },
    },
    orderBy: [{ bumpedAt: 'desc' }, { createdAt: 'desc' }],
  });
  res.json(parties);
});

router.post('/', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const { gameId, title, description, mode, rankMin, rankMax, maxMembers, micRequired, language, region } = req.body;
  const cleanTitle = String(title || '').trim().slice(0, 100);
  const cleanDescription = description ? String(description).trim().slice(0, 1000) : null;
  const partyMode = String(mode || 'CASUAL').toUpperCase();
  if (!GAME_MODES.includes(partyMode)) return res.status(400).json({ message: 'Invalid game mode' });
  const safety = await checkContent(`${cleanTitle}\n${cleanDescription || ''}`);
  if (safety.level === 'BLOCK') {
    return res.status(400).json({ code: safety.code, message: 'The party details do not follow our community safety rules.' });
  }
  const parsedGameId = Number(gameId);
  const parsedMax = Number(maxMembers);
  if (!Number.isInteger(parsedGameId) || parsedGameId < 1 || !cleanTitle || !Number.isInteger(parsedMax) || parsedMax < 2 || parsedMax > MAX_PARTY_SIZE) {
    return res.status(400).json({ message: `gameId, title and maxMembers (2-${MAX_PARTY_SIZE}) are required` });
  }
  const activeParty = await prisma.party.findFirst({
    where: { ownerId: userId, status: { in: ['OPEN', 'FULL'] } },
    select: { id: true, title: true },
  });
  if (activeParty) {
    return res.status(409).json({
      code: 'ACTIVE_PARTY_LIMIT',
      message: `คุณมีห้องเปิดอยู่แล้ว "${activeParty.title}" กรุณาปิดหรือลบห้องเดิมก่อนสร้างห้องใหม่`,
    });
  }
  const selectedGame = await prisma.game.findUnique({ where: { id: parsedGameId }, select: { id: true, ranks: true } });
  if (!selectedGame) return res.status(400).json({ message: 'Selected game was not found' });
  const minRank = rankMin ? String(rankMin) : null;
  const maxRank = rankMax ? String(rankMax) : null;
  if ((minRank && !selectedGame.ranks.includes(minRank)) || (maxRank && !selectedGame.ranks.includes(maxRank))) {
    return res.status(400).json({ message: 'Rank must be available for the selected game' });
  }
  if (minRank && maxRank && selectedGame.ranks.indexOf(minRank) > selectedGame.ranks.indexOf(maxRank)) {
    return res.status(400).json({ message: 'Minimum rank cannot be higher than maximum rank' });
  }
  const party = await prisma.party.create({
    data: {
      ownerId: userId,
      gameId: parsedGameId,
      title: cleanTitle,
      description: cleanDescription,
      mode: partyMode as any,
      rankMin: minRank,
      rankMax: maxRank,
      maxMembers: parsedMax,
      micRequired: Boolean(micRequired),
      language: language ? String(language).slice(0, 50) : null,
      region: region ? String(region).slice(0, 50) : null,
    },
  });
  await prisma.partyMember.create({
    data: { partyId: party.id, userId, role: 'OWNER', status: 'ACCEPTED' },
  });
  req.app.get('io')?.emit('party_created', { partyId: party.id });
  res.status(201).json(party);
});

router.patch('/:id', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) return res.status(404).json({ message: 'Party not found' });
  if (party.ownerId !== userId) return res.status(403).json({ message: 'Only the party owner can edit this party' });

  const title = req.body.title === undefined ? party.title : String(req.body.title).trim().slice(0, 100);
  const description = req.body.description === undefined ? party.description : String(req.body.description ?? '').trim().slice(0, 1000);
  const maxMembers = req.body.maxMembers === undefined ? party.maxMembers : Number(req.body.maxMembers);
  const micRequired = req.body.micRequired === undefined ? party.micRequired : Boolean(req.body.micRequired);
  if (!title || !Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > MAX_PARTY_SIZE) {
    return res.status(400).json({ message: 'Invalid party title or member limit' });
  }
  const acceptedMembers = await prisma.partyMember.count({ where: { partyId, status: 'ACCEPTED' } });
  if (maxMembers < acceptedMembers) return res.status(400).json({ message: 'Maximum members cannot be lower than the current roster' });
  const safety = await checkContent(`${title}\n${description}`);
  if (safety.level === 'BLOCK') {
    return res.status(400).json({ code: safety.code, message: 'The party details do not follow our community safety rules.' });
  }
  const updated = await prisma.party.update({
    where: { id: partyId },
    data: { title, description, maxMembers, micRequired },
  });
  req.app.get('io')?.emit('party_updated', { partyId });
  res.json(updated);
});

router.post('/:id/bump', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) return res.status(404).json({ message: 'Party not found' });
  if (party.ownerId !== userId) return res.status(403).json({ message: 'Only the party owner can bump this party' });
  const cooldownSeconds = 30 * 60;
  const elapsed = (Date.now() - new Date(party.bumpedAt).getTime()) / 1000;
  if (elapsed < cooldownSeconds) {
    const waitMinutes = Math.ceil((cooldownSeconds - elapsed) / 60);
    return res.status(429).json({ code: 'PARTY_BUMP_COOLDOWN', message: `ดันโพสต์ได้อีกใน ${waitMinutes} นาที`, waitMinutes });
  }
  const updated = await prisma.party.update({ where: { id: partyId }, data: { bumpedAt: new Date() } });
  req.app.get('io')?.emit('party_updated', { partyId });
  res.json({ bumpedAt: updated.bumpedAt, message: 'โพสต์ของคุณถูกดันขึ้นหน้าแรกแล้ว' });
});

router.delete('/:id', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const party = await prisma.party.findUnique({ where: { id: Number(req.params.id) } });
  if (!party) return res.status(404).json({ message: 'Party not found' });
  if (party.ownerId !== userId) return res.status(403).json({ message: 'Only the party owner can delete this party' });
  await prisma.party.delete({ where: { id: party.id } });
  req.app.get('io')?.emit('party_deleted', { partyId: party.id });
  res.status(204).send();
});

router.get('/:id', async (req, res) => {
  const party = await prisma.party.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      game: true,
      owner: { select: { id: true, username: true, avatarUrl: true } },
      members: { include: { user: { select: { id: true, username: true, avatarUrl: true } } } },
    },
  });
  if (!party) return res.status(404).json({ message: 'Party not found' });
  res.json(party);
});

router.get('/:id/join-requests', authenticate, async (req, res) => {
  const ownerId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.ownerId !== ownerId) return res.status(403).json({ message: 'Only the party owner can view requests' });
  const requests = await prisma.partyMember.findMany({
    where: { partyId, status: 'PENDING' },
    include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    orderBy: { joinedAt: 'asc' },
  });
  res.json(requests);
});

router.post('/:id/join-requests', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.status !== 'OPEN') return res.status(400).json({ message: 'Party is not open' });
  if (party.ownerId === userId) return res.status(400).json({ message: 'You own this party' });

  const blocked = await prisma.userBlock.findFirst({
    where: { OR: [{ blockerId: userId, blockedId: party.ownerId }, { blockerId: party.ownerId, blockedId: userId }] },
  });
  if (blocked) return res.status(403).json({ message: 'You cannot join this party' });

  // เดิม upsert จะรีเซ็ตสถานะเป็น PENDING เสมอ → สมาชิกที่ถูกเตะส่งคำขอใหม่ได้ และคำขอซ้ำสร้างแจ้งเตือนซ้ำ
  const existing = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId } } });
  if (existing?.status === 'ACCEPTED') return res.status(409).json({ message: 'You are already in this party' });
  if (existing?.status === 'KICKED') return res.status(403).json({ message: 'You were removed from this party' });
  if (existing?.status === 'PENDING') return res.status(200).json(existing);

  const joinMessage = req.body.message ? String(req.body.message).trim().slice(0, 300) : null;
  if (joinMessage) {
    const safety = await checkContent(joinMessage);
    if (safety.level === 'BLOCK') {
      return res.status(400).json({ code: safety.code, message: 'Your message does not follow our community safety rules.' });
    }
  }
  const request = await prisma.partyMember.upsert({
    where: { partyId_userId: { partyId, userId } },
    update: { status: 'PENDING', message: joinMessage },
    create: { partyId, userId, status: 'PENDING', message: joinMessage },
  });
  await prisma.notification.create({
    data: { userId: party.ownerId, type: 'PARTY_JOIN_REQUEST', payload: { partyId, requesterId: userId } },
  });
  res.status(201).json(request);
});

router.patch('/:id/members/:userId', authenticate, async (req, res) => {
  const ownerId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party || party.ownerId !== ownerId) return res.status(403).json({ message: 'Only the party owner can manage members' });
  const status = String(req.body.status).toUpperCase();
  if (!['ACCEPTED', 'REJECTED', 'LEFT'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
  if (targetUserId === party.ownerId) return res.status(400).json({ message: 'The party owner status cannot be changed' });

  const current = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId: targetUserId } } });
  if (!current) return res.status(404).json({ message: 'Member not found' });
  if (status === 'ACCEPTED' || status === 'REJECTED') {
    if (current.status !== 'PENDING') return res.status(400).json({ message: 'Only pending requests can be accepted or rejected' });
  }
  if (status === 'ACCEPTED') {
    const currentCount = await prisma.partyMember.count({ where: { partyId, status: 'ACCEPTED' } });
    if (currentCount >= party.maxMembers) return res.status(409).json({ message: 'Party is already full' });
  }
  if (status === 'LEFT' && current.status !== 'ACCEPTED') {
    return res.status(400).json({ message: 'Only accepted members can be removed' });
  }

  const member = await prisma.partyMember.update({
    where: { partyId_userId: { partyId, userId: targetUserId } },
    data: { status: status as any },
  });
  if (status !== 'LEFT') {
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: status === 'ACCEPTED' ? 'PARTY_REQUEST_ACCEPTED' : 'PARTY_REQUEST_REJECTED',
        payload: { partyId },
      },
    });
  }
  // คำนวณสถานะห้องใหม่ (ไม่แตะห้องที่ปิดเอง) — เดิมไม่เคยเปลี่ยน FULL กลับเป็น OPEN เมื่อมีคนออก
  if (party.status !== 'CLOSED') {
    const acceptedCount = await prisma.partyMember.count({ where: { partyId, status: 'ACCEPTED' } });
    await prisma.party.update({ where: { id: partyId }, data: { status: acceptedCount >= party.maxMembers ? 'FULL' : 'OPEN' } });
  }
  if (status !== 'ACCEPTED') removeFromPartyRoom(req, targetUserId, partyId);
  req.app.get('io')?.emit('party_updated', { partyId });
  res.json(member);
});

router.post('/:id/leave', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) return res.status(404).json({ message: 'Party not found' });
  const membership = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId } } });
  if (!membership || membership.status !== 'ACCEPTED') {
    return res.status(400).json({ message: 'You are not a member of this party' });
  }

  if (party.ownerId === userId) {
    // เจ้าของออก → โอนให้สมาชิกที่เข้าร่วมก่อนสุด (ที่ยังไม่มีห้องเปิดของตัวเอง เพื่อไม่ให้ผิดกฎ 1 คน 1 ห้อง)
    const successor = await prisma.partyMember.findFirst({
      where: {
        partyId,
        status: 'ACCEPTED',
        userId: { not: userId },
        user: { partiesOwned: { none: { status: { in: ['OPEN', 'FULL'] } } } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    if (!successor) {
      // ไม่มีใครรับช่วงได้ → ปิดห้องทิ้ง
      await prisma.party.delete({ where: { id: partyId } });
      removeFromPartyRoom(req, userId, partyId);
      req.app.get('io')?.emit('party_deleted', { partyId });
      return res.json({ left: true, partyDeleted: true });
    }
    await prisma.$transaction([
      prisma.party.update({ where: { id: partyId }, data: { ownerId: successor.userId } }),
      prisma.partyMember.update({ where: { partyId_userId: { partyId, userId: successor.userId } }, data: { role: 'OWNER' } }),
      prisma.partyMember.update({ where: { partyId_userId: { partyId, userId } }, data: { status: 'LEFT', role: 'MEMBER' } }),
    ]);
    await prisma.notification.create({
      data: { userId: successor.userId, type: 'PARTY_REQUEST_ACCEPTED', payload: { partyId, reason: 'OWNERSHIP_TRANSFERRED' } },
    });
  } else {
    await prisma.partyMember.update({
      where: { partyId_userId: { partyId, userId } },
      data: { status: 'LEFT' },
    });
  }

  // คำนวณสถานะห้องใหม่ (ไม่แตะห้องที่ปิดเอง) — มีคนออกแล้วห้องที่เต็มต้องกลับมาเปิดรับ
  if (party.status !== 'CLOSED') {
    const acceptedCount = await prisma.partyMember.count({ where: { partyId, status: 'ACCEPTED' } });
    await prisma.party.update({ where: { id: partyId }, data: { status: acceptedCount >= party.maxMembers ? 'FULL' : 'OPEN' } });
  }
  removeFromPartyRoom(req, userId, partyId);
  req.app.get('io')?.emit('party_updated', { partyId });
  res.json({ left: true, partyDeleted: false });
});

router.post('/:id/members/:userId/kick', authenticate, async (req, res) => {
  const ownerId = (req as any).user.userId;
  const partyId = Number(req.params.id);
  const targetUserId = Number(req.params.userId);
  if (!Number.isInteger(partyId) || partyId < 1 || !Number.isInteger(targetUserId) || targetUserId < 1) {
    return res.status(400).json({ message: 'Invalid party or user ID' });
  }
  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) return res.status(404).json({ message: 'Party not found' });
  if (party.ownerId !== ownerId) return res.status(403).json({ message: 'Only the party owner can kick members' });
  if (targetUserId === party.ownerId) return res.status(400).json({ message: 'The party owner cannot be kicked' });

  const member = await prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId: targetUserId } } });
  if (!member || member.status !== 'ACCEPTED') return res.status(404).json({ message: 'Accepted party member not found' });
  const updatedMember = await prisma.partyMember.update({
    where: { partyId_userId: { partyId, userId: targetUserId } },
    data: { status: 'KICKED' },
  });
  const acceptedCount = await prisma.partyMember.count({ where: { partyId, status: 'ACCEPTED' } });
  await prisma.party.update({
    where: { id: partyId },
    data: { status: acceptedCount >= party.maxMembers ? 'FULL' : 'OPEN' },
  });
  await prisma.notification.create({
    data: { userId: targetUserId, type: 'PARTY_REQUEST_REJECTED', payload: { partyId, reason: 'KICKED' } },
  });
  removeFromPartyRoom(req, targetUserId, partyId);
  req.app.get('io')?.emit('party_updated', { partyId });
  res.json(updatedMember);
});

export default router;
