import express from 'express';
import { startSession, sendMessage, getChatHistory } from '../controllers/chatController';
import { requriedLoggedIn } from '../middlewares/authMiddle'; // ✅ Middleware import karein

const router = express.Router();

// 🔴 ROUTE LEVEL MIDDLEWARE: Is se niche ke saare chat routes automatic secure ho jayenge
// 🛡️ [CHECKED - POINT 2]: Yeh line ensure karti hai ke har chat action se pehle 'req.user' set ho chuka ho!
router.use(requriedLoggedIn);

// POST /api/chat/start       — naya session shuru karo (Sirf Logged-in User)
router.post('/start', startSession);

// POST /api/chat/message     — message bhejo (Sirf Logged-in User)
router.post('/message', sendMessage);

// GET  /api/chat/history/:id — history lo (Sirf Logged-in User)
router.get('/history/:sessionId', getChatHistory);

export default router;