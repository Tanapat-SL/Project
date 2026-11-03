import { Router } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// 1. ส่งผู้ใช้ไปหน้าล็อกอิน Discord
router.get('/discord', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = encodeURIComponent(process.env.DISCORD_REDIRECT_URI as string);
  const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=identify%20email`;
  
  res.redirect(discordLoginUrl);
});

// 2. รับข้อมูลกลับจาก Discord
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

    // แลก Token จาก Discord
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token } = tokenResponse.data;

    // ดึงข้อมูลโปรไฟล์ผู้ใช้
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const discordUser = userResponse.data;
    const avatarUrl = discordUser.avatar 
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : `https://cdn.discordapp.com/embed/avatars/0.png`; // Default Discord avatar

    // บันทึกหรืออัปเดตผู้ใช้ใน Database
    let user = await prisma.user.findUnique({ where: { discordId: discordUser.id } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          email: discordUser.email || `${discordUser.id}@discord.local`,
          password: '', // ไม่ใช้พาสเวิร์ด
          avatarUrl: avatarUrl,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl, username: discordUser.username }
      });
    }

    // สร้าง JWT Token ของระบบเรา
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET as string, { expiresIn: '7d' });

    // ส่ง Token กลับไปที่ Frontend
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);

  } catch (error) {
    console.error('Discord OAuth Error:', error);
    res.redirect(`${process.env.FRONTEND_URL}?error=auth_failed`);
  }
});

// 3. เส้นทางสำหรับให้ Frontend ดึงข้อมูล Profile ตัวเอง (ต้องแนบ Token มาด้วย)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, username: true, email: true, avatarUrl: true, game: true, rank: true } // ไม่ส่ง password กลับไป
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user data" });
  }
});

export default router;
