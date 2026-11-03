"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/party/:partyId', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const partyId = Number(req.params.partyId);
    const member = await prisma_1.prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId } } });
    if (!member || member.status !== 'ACCEPTED')
        return res.status(403).json({ message: 'Party membership required' });
    const conversation = await prisma_1.prisma.conversation.upsert({
        where: { partyId },
        update: {},
        create: { type: 'PARTY', partyId },
    });
    const messages = await prisma_1.prisma.message.findMany({
        where: { conversationId: conversation.id },
        include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
});
router.post('/party/:partyId', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const partyId = Number(req.params.partyId);
    const content = String(req.body.content || '').trim().slice(0, 2000);
    if (!content)
        return res.status(400).json({ message: 'Message content is required' });
    const member = await prisma_1.prisma.partyMember.findUnique({ where: { partyId_userId: { partyId, userId } } });
    if (!member || member.status !== 'ACCEPTED')
        return res.status(403).json({ message: 'Party membership required' });
    const conversation = await prisma_1.prisma.conversation.upsert({
        where: { partyId },
        update: {},
        create: { type: 'PARTY', partyId },
    });
    const message = await prisma_1.prisma.message.create({
        data: { conversationId: conversation.id, senderId: userId, content },
        include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.status(201).json(message);
});
router.get('/direct/:friendId', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const friendId = Number(req.params.friendId);
    const conversation = await prisma_1.prisma.conversation.findFirst({
        where: {
            type: 'DIRECT',
            members: { some: { userId } },
            AND: { members: { some: { userId: friendId } } },
        },
    });
    if (!conversation)
        return res.json([]);
    const messages = await prisma_1.prisma.message.findMany({
        where: { conversationId: conversation.id },
        include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
    });
    res.json(messages);
});
router.post('/direct/:friendId', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const friendId = Number(req.params.friendId);
    const friendship = await prisma_1.prisma.friendRequest.findFirst({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId, receiverId: friendId }, { requesterId: friendId, receiverId: userId }] },
    });
    if (!friendship)
        return res.status(403).json({ message: 'Direct chat requires an accepted friend' });
    const content = String(req.body.content || '').trim().slice(0, 2000);
    if (!content)
        return res.status(400).json({ message: 'Message content is required' });
    let conversation = await prisma_1.prisma.conversation.findFirst({
        where: { type: 'DIRECT', members: { some: { userId } }, AND: { members: { some: { userId: friendId } } } },
    });
    if (!conversation) {
        conversation = await prisma_1.prisma.conversation.create({
            data: {
                type: 'DIRECT',
                members: { create: [{ userId }, { userId: friendId }] },
            },
        });
    }
    const message = await prisma_1.prisma.message.create({
        data: { conversationId: conversation.id, senderId: userId, content },
        include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.status(201).json(message);
});
exports.default = router;
