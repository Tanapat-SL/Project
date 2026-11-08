import { Router } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middlewares/auth.middleware';
import { isAdminUser } from '../middlewares/admin.middleware';
import { parseCookies } from '../utils/cookies';
import { randomBytes, timingSafeEqual } from 'crypto';
import { isProduction } from '../config/env';

const router = Router();

const STATE_COOKIE = 'mf_oauth_state';

const safeEqual = (a: string, b: string) => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
};

// 1. ส่งผู้ใช้ไปหน้าล็อกอิน Discord (พร้อม state กัน CSRF)
router.get('/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (!clientId || !process.env.DISCORD_CLIENT_SECRET || !redirectUri) {
    return res.redirect(`${frontendUrl}/login?error=discord_not_configured`);
  }

  const state = randomBytes(16).toString('hex');
  res.cookie(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 10 * 60 * 1000,
    path: '/api/auth',
  });

  const query = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
  });
  const discordLoginUrl = `https://discord.com/api/oauth2/authorize?${query.toString()}`;
  res.redirect(discordLoginUrl);
});

// 2. รับ code ที่ Discord ส่งกลับมา
router.get('/discord/callback', async (req, res) => {
  const { code, state } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  const expectedState = parseCookies(req.headers.cookie)[STATE_COOKIE];
  res.clearCookie(STATE_COOKIE, { path: '/api/auth' });
  if (typeof state !== 'string' || !expectedState || !safeEqual(state, expectedState)) {
    return res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }

  if (typeof code !== 'string' || !code) {
    return res.redirect(`${frontendUrl}/login?error=discord_cancelled`);
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID as string,
      client_secret: process.env.DISCORD_CLIENT_SECRET as string,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI as string,
    });

    // แลก code เป็น access token จาก Discord
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token } = tokenResponse.data;

    // ดึงข้อมูลโปรไฟล์ผู้ใช้จาก Discord
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userResponse.data;
    const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`; // Default Discord avatar

    // สร้างหรืออัปเดตผู้ใช้ในฐานข้อมูล
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

    // สร้าง JWT ของระบบเรา
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    // ส่ง Token กลับไปที่ Frontend ผ่าน URL fragment (#) ซึ่งไม่ถูกส่งไปกับ request / log / Referer
    res.redirect(`${frontendUrl}/#token=${token}`);

  } catch (error) {
    console.error('Discord OAuth Error:', error);
    res.redirect(`${frontendUrl}/login?error=auth_failed`);
  }
});

// 3. ให้ Frontend ดึงข้อมูลโปรไฟล์ตัวเอง (ต้องแนบ Token มาด้วย)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: {
        id: true,
        isBanned: true,
        bannedAt: true,
        banReason: true,
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
    res.json(user ? { ...user, isAdmin: await isAdminUser(userId) } : null);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

export default router;
