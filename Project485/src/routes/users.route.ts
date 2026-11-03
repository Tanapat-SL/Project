import { Router } from 'express';
import { prisma } from '../lib/prisma';
const router = Router();

router.get('/search', async (req, res) => {
  const { game, rank } = req.query;
  const users = await prisma.user.findMany({
    where: {
      game: game ? String(game) : undefined,
      rank: rank ? String(rank) : undefined
    }
  });
  res.json(users);
});

export default router;