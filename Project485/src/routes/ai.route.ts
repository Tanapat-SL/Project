import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';
import { checkContent } from '../services/safety.service';

const router = Router();

const normalizeQuery = (value: string) => value.toLowerCase();

router.get('/safety/status', authenticate, async (_req, res) => {
  const enabled = Boolean(process.env.OPENAI_API_KEY);
  res.json({
    enabled,
    provider: enabled ? 'openai' : 'local-fallback',
    notice: enabled
      ? 'Content is sent to OpenAI moderation for safety review.'
      : 'Basic local keyword filtering is active. Automated filtering can make mistakes.',
  });
});

router.post('/safety/check', authenticate, async (req, res) => {
  const content = String(req.body.content || '').slice(0, 2000);
  if (!content.trim()) return res.status(400).json({ message: 'content is required' });
  res.json(await checkContent(content));
});

router.post('/match-search', authenticate, async (req, res) => {
  const query = String(req.body.query || '').slice(0, 500);
  const gameName = String(req.body.game || '').trim();
  const normalized = normalizeQuery(query);
  const explicitlyNoMic = /(ไม่ใช้ไมค์|ไม่ใช้ไมค|ไม่ต้องใช้ไมค์|without mic|no mic)/u.test(normalized);
  const mic = req.body.requiresMic === true || (/mic|ไมค์|ไมค/u.test(normalized) && !explicitlyNoMic);
  if (!query && !gameName) return res.status(400).json({ message: 'A search query or game is required' });

  const inferredGame = gameName || ['Valorant', 'Apex Legends', 'CS2', 'Overwatch 2']
    .find(name => query.toLowerCase().includes(name.toLowerCase()));
  const languageMatch = /thai|ไทย/.test(normalized) ? 'th' : /english|อังกฤษ/.test(normalized) ? 'en' : '';

  const candidates = await prisma.user.findMany({
    where: {
      games: {
        some: {
          game: inferredGame ? { name: inferredGame } : undefined,
          micEnabled: mic || undefined,
        },
      },
      ...(languageMatch ? { languages: { has: languageMatch } } : {}),
    },
    include: { games: { include: { game: true } }, availability: true },
    take: 20,
  });

  const matches = candidates.map(user => ({
    ...user,
    compatibilityScore: 30 + (inferredGame ? 30 : 0) + (mic ? 5 : 0) + (user.games.length > 1 ? 10 : 0),
    reasons: [
      inferredGame ? `Both mention ${inferredGame}` : null,
      mic ? 'Mic preference matches' : null,
      user.languages.length ? `Languages: ${user.languages.join(', ')}` : null,
    ].filter(Boolean),
  })).sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  const parties = await prisma.party.findMany({
    where: {
      status: { in: ['OPEN', 'FULL'] as any },
      game: inferredGame ? { name: inferredGame } : undefined,
      micRequired: mic ? true : undefined,
    },
    include: {
      game: true,
      owner: { select: { id: true, username: true, avatarUrl: true } },
      members: { where: { status: 'ACCEPTED' } },
    },
    take: 20,
  });
  res.json({
    filters: {
      game: inferredGame || null,
      language: languageMatch || null,
      requiresMic: explicitlyNoMic ? false : mic,
      micSpecified: mic || explicitlyNoMic,
    },
    matches: parties.map(party => ({
      id: party.id,
      partyId: party.id,
      username: party.title,
      game: party.game.name,
      owner: party.owner,
      compatibilityScore: 55 + (inferredGame ? 25 : 0) + (party.micRequired === mic ? 10 : 0),
      reasons: [party.game.name, party.region || 'Any region', party.micRequired ? 'Mic required' : 'Mic optional'].filter(Boolean),
      currentMembers: party.members.length,
      maxMembers: party.maxMembers,
    })).sort((a, b) => b.compatibilityScore - a.compatibilityScore),
  });
});

router.post('/party-description', authenticate, async (req, res) => {
  const { game, mode = 'ranked', atmosphere = 'chill', maxMembers = 5 } = req.body;
  if (!game) return res.status(400).json({ message: 'game is required' });
  res.json({
    description: `Looking for teammates to play ${game} in ${mode} mode. We want a ${atmosphere} team, with space for up to ${maxMembers} players. Join if you communicate well and enjoy playing as a team.`,
  });
});

export default router;
