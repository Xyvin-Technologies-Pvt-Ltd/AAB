import mongoose from 'mongoose';

const toolCallSchema = new mongoose.Schema(
  {
    id: { type: String },
    name: { type: String, required: true },
    arguments: { type: mongoose.Schema.Types.Mixed },
    result: { type: mongoose.Schema.Types.Mixed },
    executedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ['user', 'assistant', 'tool', 'system'],
      required: true,
    },
    content: { type: String, default: '' },
    toolCalls: [toolCallSchema],
    toolCallId: { type: String },
    toolName: { type: String },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const chatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Conversation',
      trim: true,
    },
    messages: [messageSchema],
    context: {
      pageContext: { type: String, default: null },
      contextData: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    messageCount: { type: Number, default: 0 },
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

chatSessionSchema.index({ userId: 1, updatedAt: -1 });

const ChatSession = mongoose.model('ChatSession', chatSessionSchema);

export default ChatSession;
