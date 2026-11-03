import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middlewares/auth.middleware';
const router = Router();

router.patch('/me', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const { bio, languages, timezone, contact } = req.body;
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      bio: bio === undefined ? undefined : String(bio).slice(0, 500),
      languages: Array.isArray(languages) ? languages.map(String) : undefined,
      timezone: timezone ? String(timezone) : undefined,
      contact: contact === undefined ? undefined : String(contact).slice(0, 200),
    },
  });
  res.json(user);
});

router.put('/me/games', authenticate, async (req, res) => {
  const userId = (req as any).user.userId;
  const games = Array.isArray(req.body.games) ? req.body.games : [];
  await prisma.userGame.deleteMany({ where: { userId } });
  await prisma.userGame.createMany({
    data: games.map((item: any) => ({
      userId,
      gameId: Number(item.gameId),
      rank: item.rank ? String(item.rank) : null,
      platform: item.platform || 'PC',
      playStyle: item.playStyle || 'CASUAL',
      micEnabled: item.micEnabled !== false,
    })),
  });
  res.json(await prisma.userGame.findMany({ where: { userId }, include: { game: true } }));
});

router.get('/:id', async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    include: { games: { include: { game: true } }, availability: true },
  });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

router.get('/search', async (req, res) => {
  const { game, rank } = req.query;
  const users = await prisma.user.findMany({
    where: {
      games: {
        some: {
          game: game ? { name: String(game) } : undefined,
          rank: rank ? String(rank) : undefined,
        },
      },
    }
  });
  res.json(users);
});

export default router;