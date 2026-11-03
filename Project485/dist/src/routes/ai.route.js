"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post('/match-search', auth_middleware_1.authenticate, async (req, res) => {
    const query = String(req.body.query || '').slice(0, 500);
    const gameName = String(req.body.game || '').trim();
    const mic = req.body.requiresMic === true;
    if (!query && !gameName)
        return res.status(400).json({ message: 'A search query or game is required' });
    const inferredGame = gameName || ['Valorant', 'Apex Legends', 'CS2', 'Overwatch 2']
        .find(name => query.toLowerCase().includes(name.toLowerCase()));
    const languageMatch = /thai|ไทย/.test(query.toLowerCase()) ? 'th' : '';
    const candidates = await prisma_1.prisma.user.findMany({
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
    const parties = await prisma_1.prisma.party.findMany({
        where: {
            status: { in: ['OPEN', 'FULL'] },
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
        filters: { game: inferredGame || null, language: languageMatch || null, requiresMic: mic },
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
router.post('/party-description', auth_middleware_1.authenticate, async (req, res) => {
    const { game, mode = 'ranked', atmosphere = 'chill', maxMembers = 5 } = req.body;
    if (!game)
        return res.status(400).json({ message: 'game is required' });
    res.json({
        description: `Looking for teammates to play ${game} in ${mode} mode. We want a ${atmosphere} team, with space for up to ${maxMembers} players. Join if you communicate well and enjoy playing as a team.`,
    });
});
exports.default = router;
