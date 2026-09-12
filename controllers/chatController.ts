import OpenAI from 'openai';
import { nanoid } from 'nanoid';
import { Request, Response } from 'express';
import ChatSession from '../models/ChatSession';
import MINIBAZAR_SYSTEM_PROMPT from '../config/systemPrompt';

// ✅ TypeScript: req.body ka type
interface MessageBody {
  sessionId: string;
  message: string;
}

// ✅ OpenAI instance banao
const getOpenAI = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured');
  return new OpenAI({ apiKey });
};

// ─────────────────────────────────────────
// POST /api/chat/start
// ─────────────────────────────────────────
export const startSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = nanoid(20);

    const session = await ChatSession.create({
      sessionId,
      messages: [
        {
          role: 'system',
          content: MINIBAZAR_SYSTEM_PROMPT
        }
      ]
    });

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: MINIBAZAR_SYSTEM_PROMPT },
        { role: 'user', content: 'Greet the customer with a short welcome message in Urdu/English mix.' }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    const openingMessage = completion.choices[0].message.content

    session.messages.push({
      role: 'assistant',
      content: openingMessage as string
    });
    await session.save();

    res.json({
      success: true,
      sessionId,
      message: openingMessage
    });

  } catch (err: unknown) {
    console.error('Start session error:', (err as Error).message);
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};

// ─────────────────────────────────────────
// POST /api/chat/message
// ─────────────────────────────────────────
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, message } = req.body as MessageBody;

    if (!sessionId || !message?.trim()) {
      res.status(400).json({ success: false, error: 'sessionId aur message required hain' });
      return;
    }

    const session = await ChatSession.findOne({ sessionId });
    if (!session) {
      res.status(404).json({ success: false, error: 'Session nahi mila, page refresh karein' });
      return;
    }

    session.messages.push({ role: 'user', content: message });
    session.lastActivity = new Date();

    // ✅ TypeScript: map ka type explicit diya
    const chatMessages = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'system' | 'user' | 'assistant',
      content: m.content
    }));

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500
    });

    const aiReply = completion.choices[0].message.content

    session.messages.push({ role: 'assistant', content: aiReply as string });
    await session.save();

    res.json({
      success: true,
      message: aiReply
    });

  } catch (err: unknown) {
    console.error('Send message error:', (err as Error).message);
    res.status(500).json({ success: false, error: 'AI response mein masla hua, dobara try karein' });
  }
};

// ─────────────────────────────────────────
// GET /api/chat/history/:sessionId
// ─────────────────────────────────────────
export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    if (!session) {
      res.status(404).json({ success: false, error: 'Session nahi mila' });
      return;
    }

    // ✅ TypeScript: filter aur map ka type
    const history = session.messages
  .filter((m: { role: string }) => m.role !== 'system')
  .map((m: { role: string; content: string; timestamp?: Date }) => ({
    role: m.role,
    content: m.content,
    timestamp: m.timestamp ?? null  // ✅ undefined ho to null do
  }));

    res.json({ success: true, history });

  } catch (err: unknown) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
};