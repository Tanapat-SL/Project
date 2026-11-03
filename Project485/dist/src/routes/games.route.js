"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const router = (0, express_1.Router)();
router.get('/', async (_req, res) => {
    const games = await prisma_1.prisma.game.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { players: true } } },
    });
    res.json(games);
});
exports.default = router;
