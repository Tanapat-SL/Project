import { Router } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 1. เธชเนเธเธเธนเนเนเธเนเนเธเธซเธเนเธฒเธฅเนเธญเธเธญเธดเธ Discord
router.get('/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI as string);
  const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
  
  res.redirect(discordLoginUrl);
});

// 2. เธฃเธฑเธเธเนเธญเธกเธนเธฅเธเธฅเธฑเธเธเธฒเธ Discord
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;

  try {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID as string,
      client_secret: process.env.DISCORD_CLIENT_SECRET as string,
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: process.env.DISCORD_REDIRECT_URI as string,
    });

    // เนเธฅเธ Token เธเธฒเธ Discord
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token } = tokenResponse.data;

    // เธ”เธถเธเธเนเธญเธกเธนเธฅเนเธเธฃเนเธเธฅเนเธเธนเนเนเธเน
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userResponse.data;
    const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`; // Default Discord avatar

    // เธเธฑเธเธ—เธถเธเธซเธฃเธทเธญเธญเธฑเธเน€เธ”เธ•เธเธนเนเนเธเนเนเธ Database
    let user = await prisma.user.findUnique({ where: { discordId: discordUser.id } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          displayName: discordUser.global_name || discordUser.username,
          email: discordUser.email || `${discordUser.id}@discord.local`,
          avatarUrl: avatarUrl,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl, username: discordUser.username, displayName: discordUser.global_name || discordUser.username }
      });
    }

    // เธชเธฃเนเธฒเธ JWT Token เธเธญเธเธฃเธฐเธเธเน€เธฃเธฒ
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    // เธชเนเธ Token เธเธฅเธฑเธเนเธเธ—เธตเน Frontend
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);

  } catch (error) {
    console.error('Discord OAuth Error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

// 3. เน€เธชเนเธเธ—เธฒเธเธชเธณเธซเธฃเธฑเธเนเธซเน Frontend เธ”เธถเธเธเนเธญเธกเธนเธฅ Profile เธ•เธฑเธงเน€เธญเธ (เธ•เนเธญเธเนเธเธ Token เธกเธฒเธ”เนเธงเธข)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ 
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
            rank: true,
            game: { select: { id: true, name: true, slug: true } },
          },
        },
      }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

export default router;
