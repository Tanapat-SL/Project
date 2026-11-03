"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/notifications', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const notifications = await prisma_1.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
    res.json(notifications);
});
router.patch('/notifications/:id/read', auth_middleware_1.authenticate, async (req, res) => {
    const notification = await prisma_1.prisma.notification.update({
        where: { id: Number(req.params.id), userId: req.user.userId },
        data: { readAt: new Date() },
    });
    res.json(notification);
});
router.post('/blocks', auth_middleware_1.authenticate, async (req, res) => {
    const blockerId = req.user.userId;
    const blockedId = Number(req.body.userId);
    if (!blockedId || blockedId === blockerId)
        return res.status(400).json({ message: 'Invalid userId' });
    const block = await prisma_1.prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        update: {},
        create: { blockerId, blockedId },
    });
    res.status(201).json(block);
});
router.get('/blocks', auth_middleware_1.authenticate, async (req, res) => {
    const blockerId = req.user.userId;
    const blocks = await prisma_1.prisma.userBlock.findMany({
        where: { blockerId },
        include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json(blocks.map(({ blocked, createdAt }) => ({ ...blocked, blockedAt: createdAt })));
});
router.delete('/blocks/:userId', auth_middleware_1.authenticate, async (req, res) => {
    await prisma_1.prisma.userBlock.deleteMany({
        where: { blockerId: req.user.userId, blockedId: Number(req.params.userId) },
    });
    res.status(204).send();
});
router.post('/friends/requests', auth_middleware_1.authenticate, async (req, res) => {
    const requesterId = req.user.userId;
    const receiverId = Number(req.body.userId);
    if (!receiverId || receiverId === requesterId)
        return res.status(400).json({ message: 'Invalid userId' });
    const request = await prisma_1.prisma.friendRequest.upsert({
        where: { requesterId_receiverId: { requesterId, receiverId } },
        update: { status: 'PENDING' },
        create: { requesterId, receiverId },
    });
    await prisma_1.prisma.notification.create({
        data: { userId: receiverId, type: 'FRIEND_REQUEST', payload: { requesterId, requestId: request.id } },
    });
    res.status(201).json(request);
});
router.get('/friends', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const requests = await prisma_1.prisma.friendRequest.findMany({
        where: { status: 'ACCEPTED', OR: [{ requesterId: userId }, { receiverId: userId }] },
        include: {
            requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            receiver: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
    });
    res.json(requests.map(request => request.requesterId === userId ? request.receiver : request.requester));
});
router.get('/friends/requests', auth_middleware_1.authenticate, async (req, res) => {
    const requests = await prisma_1.prisma.friendRequest.findMany({
        where: { receiverId: req.user.userId, status: 'PENDING' },
        include: { requester: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
});
router.patch('/friends/requests/:id', auth_middleware_1.authenticate, async (req, res) => {
    const userId = req.user.userId;
    const status = String(req.body.status).toUpperCase();
    if (!['ACCEPTED', 'REJECTED'].includes(status))
        return res.status(400).json({ message: 'Invalid status' });
    const request = await prisma_1.prisma.friendRequest.findFirst({ where: { id: Number(req.params.id), receiverId: userId } });
    if (!request)
        return res.status(404).json({ message: 'Friend request not found' });
    const updated = await prisma_1.prisma.friendRequest.update({ where: { id: request.id }, data: { status } });
    if (status === 'ACCEPTED') {
        await prisma_1.prisma.notification.create({
            data: { userId: request.requesterId, type: 'FRIEND_REQUEST_ACCEPTED', payload: { userId } },
        });
    }
    res.json(updated);
});
router.post('/reports', auth_middleware_1.authenticate, async (req, res) => {
    const reporterId = req.user.userId;
    const { targetUserId, reason } = req.body;
    if (!targetUserId || !String(reason || '').trim())
        return res.status(400).json({ message: 'targetUserId and reason are required' });
    const report = await prisma_1.prisma.report.create({
        data: { reporterId, targetUserId: Number(targetUserId), reason: String(reason).trim() },
    });
    res.status(201).json(report);
});
exports.default = router;
