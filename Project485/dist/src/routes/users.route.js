"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.patch('/me', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const { bio, languages, timezone, contact } = req.body;
    const user = await prisma_1.prisma.user.update({
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
router.put('/me/games', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const games = Array.isArray(req.body.games) ? req.body.games : [];
    const allowedPlatforms = ['PC', 'PLAYSTATION', 'XBOX', 'SWITCH', 'MOBILE'];
    const allowedPlayStyles = ['COMPETITIVE', 'CASUAL', 'CHILL', 'LEARNING'];
    const normalizedGames = games.map((item) => ({
        userId,
        gameId: Number(item.gameId),
        rank: item.rank ? String(item.rank).slice(0, 100) : null,
        platform: allowedPlatforms.includes(item.platform) ? item.platform : 'PC',
        playStyle: allowedPlayStyles.includes(item.playStyle) ? item.playStyle : 'CASUAL',
        micEnabled: item.micEnabled !== false,
    }));
    const gameIds = normalizedGames.map((item) => item.gameId);
    if (gameIds.some((id) => !Number.isInteger(id) || id < 1) || new Set(gameIds).size !== gameIds.length) {
        return res.status(400).json({ message: 'Game profiles must contain unique valid game IDs' });
    }
    const existingGames = await prisma_1.prisma.game.findMany({ where: { id: { in: gameIds } }, select: { id: true, ranks: true } });
    if (existingGames.length !== gameIds.length)
        return res.status(400).json({ message: 'One or more games were not found' });
    const ranksByGame = new Map(existingGames.map(game => [game.id, game.ranks]));
    if (normalizedGames.some((item) => item.rank && !ranksByGame.get(item.gameId)?.includes(item.rank))) {
        return res.status(400).json({ message: 'Rank must be available for the selected game' });
    }
    await prisma_1.prisma.$transaction([
        prisma_1.prisma.userGame.deleteMany({ where: { userId } }),
        ...(normalizedGames.length ? [prisma_1.prisma.userGame.createMany({ data: normalizedGames })] : []),
    ]);
    res.json(await prisma_1.prisma.userGame.findMany({ where: { userId }, include: { game: true } }));
});
router.get('/:id', async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: Number(req.params.id) },
        include: { games: { include: { game: true } }, availability: true },
    });
    if (!user)
        return res.status(404).json({ message: 'User not found' });
    res.json(user);
});
router.get('/search', async (req, res) => {
    const { game, rank } = req.query;
    const users = await prisma_1.prisma.user.findMany({
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
exports.default = router;
