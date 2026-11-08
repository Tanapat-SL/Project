import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/', async (_req, res) => {
  const games = await prisma.game.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { players: true } } },
  });
  res.json(games);
});

export default router;
