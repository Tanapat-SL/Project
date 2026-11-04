"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../lib/prisma");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// 1. เธชเนเธเธเธนเนเนเธเนเนเธเธซเธเนเธฒเธฅเนเธญเธเธญเธดเธ Discord
router.get('/discord', (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (!clientId || !process.env.DISCORD_CLIENT_SECRET || !redirectUri) {
        return res.redirect(`${frontendUrl}/login?error=discord_not_configured`);
    }
    const query = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'identify email',
    });
    const discordLoginUrl = `https://discord.com/api/oauth2/authorize?${query.toString()}`;
    res.redirect(discordLoginUrl);
});
// 2. เธฃเธฑเธเธเนเธญเธกเธนเธฅเธเธฅเธฑเธเธเธฒเธ Discord
router.get('/discord/callback', async (req, res) => {
    const { code } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (typeof code !== 'string' || !code) {
        return res.redirect(`${frontendUrl}/login?error=discord_cancelled`);
    }
    try {
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI,
        });
        // เนเธฅเธ Token เธเธฒเธ Discord
        const tokenResponse = await axios_1.default.post('https://discord.com/api/oauth2/token', params.toString(), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        const { access_token } = tokenResponse.data;
        // เธ”เธถเธเธเนเธญเธกเธนเธฅเนเธเธฃเนเธเธฅเนเธเธนเนเนเธเน
        const userResponse = await axios_1.default.get('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        const discordUser = userResponse.data;
        const avatarUrl = discordUser.avatar
            ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
            : `https://cdn.discordapp.com/embed/avatars/0.png`; // Default Discord avatar
        // เธเธฑเธเธ—เธถเธเธซเธฃเธทเธญเธญเธฑเธเน€เธ”เธ•เธเธนเนเนเธเนเนเธ Database
        let user = await prisma_1.prisma.user.findUnique({ where: { discordId: discordUser.id } });
        if (!user) {
            user = await prisma_1.prisma.user.create({
                data: {
                    discordId: discordUser.id,
                    username: discordUser.username,
                    displayName: discordUser.global_name || discordUser.username,
                    email: discordUser.email || `${discordUser.id}@discord.local`,
                    avatarUrl: avatarUrl,
                },
            });
        }
        else {
            user = await prisma_1.prisma.user.update({
                where: { id: user.id },
                data: { avatarUrl, username: discordUser.username, displayName: discordUser.global_name || discordUser.username }
            });
        }
        // เธชเธฃเนเธฒเธ JWT Token เธเธญเธเธฃเธฐเธเธเน€เธฃเธฒ
        const token = jsonwebtoken_1.default.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        // เธชเนเธ Token เธเธฅเธฑเธเนเธเธ—เธตเน Frontend
        res.redirect(`${frontendUrl}/?token=${token}`);
    }
    catch (error) {
        console.error('Discord OAuth Error:', error);
        res.redirect(`${frontendUrl}/login?error=auth_failed`);
    }
});
// 3. เน€เธชเนเธเธ—เธฒเธเธชเธณเธซเธฃเธฑเธเนเธซเน Frontend เธ”เธถเธเธเนเธญเธกเธนเธฅ Profile เธ•เธฑเธงเน€เธญเธ (เธ•เนเธญเธเนเธเธ Token เธกเธฒเธ”เนเธงเธข)
router.get('/me', auth_middleware_1.authenticate, async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                displayName: true,
                email: true,
                avatarUrl: true,
                bio: true,
                languages: true,
                timezone: true,
                contact: true,
                games: {
                    select: {
                        id: true,
                        rank: true,
                        platform: true,
                        playStyle: true,
                        micEnabled: true,
                        game: { select: { id: true, name: true, slug: true, ranks: true } },
                    },
                },
            }
        });
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching user data" });
    }
});
exports.default = router;
