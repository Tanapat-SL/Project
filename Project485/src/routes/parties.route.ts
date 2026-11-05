import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';
import { checkContent } from '../services/safety.service';

const router = Router();

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
  const parties = await prisma.party.findMany({
    where: {
      status: req.query.status ? String(req.query.status).toUpperCase() as any : { in: ['OPEN', 'FULL'] } as any,
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
  const safety = await checkContent(`${String(title || '')}\n${String(description || '')}`);
  if (safety.level === 'BLOCK') {
    return res.status(400).json({ code: safety.code, message: 'The party details do not follow our community safety rules.' });
  }
  const parsedGameId = Number(gameId);
  if (!Number.isInteger(parsedGameId) || parsedGameId < 1 || !title || !Number.isInteger(Number(maxMembers)) || Number(maxMembers) < 2) {
    return res.status(400).json({ message: 'gameId, title and maxMembers (minimum 2) are required' });
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
      title: String(title),
      description: description ? String(description) : null,
      mode,
      rankMin: minRank,
      rankMax: maxRank,
      maxMembers: Number(maxMembers),
      micRequired: Boolean(micRequired),
      language: language || null,
      region: region || null,
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
  if (!title || !Number.isInteger(maxMembers) || maxMembers < 2 || maxMembers > 20) {
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
  const request = await prisma.partyMember.upsert({
    where: { partyId_userId: { partyId, userId } },
    update: { status: 'PENDING', message: req.body.message || null },
    create: { partyId, userId, status: 'PENDING', message: req.body.message || null },
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
  const member = await prisma.partyMember.update({
    where: { partyId_userId: { partyId, userId: targetUserId } },
    data: { status: status as any },
  });
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: status === 'ACCEPTED' ? 'PARTY_REQUEST_ACCEPTED' : 'PARTY_REQUEST_REJECTED',
      payload: { partyId },
    },
  });
  const acceptedCount = await prisma.partyMember.count({ where: { partyId, status: 'ACCEPTED' } });
  if (acceptedCount >= party.maxMembers) await prisma.party.update({ where: { id: partyId }, data: { status: 'FULL' } });
  req.app.get('io')?.emit('party_updated', { partyId });
  res.json(member);
});

export default router;
