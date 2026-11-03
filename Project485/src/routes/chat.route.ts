import { Router } from 'express';
const router = Router();
router.get('/:userId', (req, res) => res.json({ message: 'Chat history placeholder' }));
router.post('/send', (req, res) => res.json({ message: 'Send message placeholder' }));
export default router;