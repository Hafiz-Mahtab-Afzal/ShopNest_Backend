
import { Schema, model, Document } from 'mongoose';

// 1. Message ke liye interface aur type define karein
export type MessageRole = 'user' | 'assistant' | 'system';

export interface IMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
}

// 2. ChatSession ke liye interface define karein (jo Document ko extend karega)
export interface IChatSession extends Document {
  sessionId: string;
  messages: IMessage[];
  startTime: Date;
  lastActivity: Date;
  createdAt: Date; // 'timestamps: true' ki wajah se automatically add hote hain
  updatedAt: Date;
}

// 3. Message Schema
const MessageSchema = new Schema<IMessage>({
  role: {
    type: String,
    enum: ['user', 'assistant', 'system'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// 4. ChatSession Schema
const ChatSessionSchema = new Schema<IChatSession>({
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  messages: [MessageSchema],
  startTime: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// 5. Model create aur export karein
const ChatSession = model<IChatSession>('ChatSession', ChatSessionSchema);
export default ChatSession;