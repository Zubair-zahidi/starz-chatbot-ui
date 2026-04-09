import mongoose, { Document, Schema } from 'mongoose';
import { IChatSession } from '../types/chat.types';

export interface IChatSessionDocument extends IChatSession, Document {
  updateLastActivity(): Promise<void>;
  archiveSession(): Promise<void>;
  pinSession(pin: boolean): Promise<void>;
  addTag(tag: string): Promise<void>;
  removeTag(tag: string): Promise<void>;
}

const chatSessionSchema = new Schema<IChatSessionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    guestId: {
      type: String,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    messages: [{
      type: Schema.Types.ObjectId,
      ref: 'Message',
    }],
    
    // Context for AI
    context: {
      astronomicalFocus: [{
        type: String,
        enum: [
          'exoplanets', 'blackholes', 'galaxies', 'stars',
          'nebulae', 'cosmology', 'solar-system', 'missions',
          'astrophotography', 'astronomy-basics'
        ],
      }],
      lastQuery: {
        type: String,
        default: '',
      },
      summary: {
        type: String,
        default: '',
      },
      expertiseLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'expert'],
        default: 'intermediate',
      },
      temperature: {
        type: Number,
        min: 0.1,
        max: 1.0,
        default: 0.7,
      },
      maxTokens: {
        type: Number,
        min: 100,
        max: 4000,
        default: 1000,
      },
    },
    
    // Metadata
    metadata: {
      messageCount: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalTokens: {
        type: Number,
        default: 0,
        min: 0,
      },
      lastActivity: {
        type: Date,
        default: Date.now,
        index: true,
      },
      isArchived: {
        type: Boolean,
        default: false,
        index: true,
      },
      isPinned: {
        type: Boolean,
        default: false,
        index: true,
      },
      tags: [{
        type: String,
        trim: true,
      }],
    },
    
    // Security & Sharing
    isPrivate: {
      type: Boolean,
      default: true,
    },
    sharedWith: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      permission: {
        type: String,
        enum: ['read', 'write', 'admin'],
        default: 'read',
      },
    }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
chatSessionSchema.index({ userId: 1, createdAt: -1 });
chatSessionSchema.index({ 'metadata.lastActivity': -1 });
chatSessionSchema.index({ 'metadata.isArchived': 1 });
chatSessionSchema.index({ 'metadata.isPinned': 1 });
chatSessionSchema.index({ 'metadata.tags': 1 });
chatSessionSchema.index({ title: 'text' });

// Virtuals
chatSessionSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

chatSessionSchema.virtual('messageList', {
  ref: 'Message',
  localField: 'messages',
  foreignField: '_id',
});

// Pre-save middleware
chatSessionSchema.pre('save', function(next) {
  // Require either userId or guestId (guest sessions are allowed)
  if (!this.userId && !this.guestId) {
    return next(new Error('Either userId or guestId is required'));
  }

  // Auto-generate title if not provided
  if (!this.title) {
    const date = new Date();
    this.title = `Chat ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  }
  
  // Ensure arrays are not null
  if (!this.context.astronomicalFocus) {
    this.context.astronomicalFocus = ['astronomy-basics'];
  }
  
  if (!this.metadata.tags) {
    this.metadata.tags = [];
  }
  
  next();
});

// Cleanup messages when a session is deleted (document middleware)
chatSessionSchema.pre(
  'deleteOne',
  { document: true, query: false },
  async function (next: (err?: any) => void) {
    await mongoose.model('Message').deleteMany({ sessionId: this._id });
    next();
  }
);

// Instance methods
chatSessionSchema.methods.updateLastActivity = async function(): Promise<void> {
  this.metadata.lastActivity = new Date();
  await this.save();
};

chatSessionSchema.methods.archiveSession = async function(): Promise<void> {
  this.metadata.isArchived = true;
  this.metadata.lastActivity = new Date();
  await this.save();
};

chatSessionSchema.methods.pinSession = async function(pin: boolean): Promise<void> {
  this.metadata.isPinned = pin;
  this.metadata.lastActivity = new Date();
  await this.save();
};

chatSessionSchema.methods.addTag = async function(tag: string): Promise<void> {
  if (!this.metadata.tags.includes(tag)) {
    this.metadata.tags.push(tag);
    await this.save();
  }
};

chatSessionSchema.methods.removeTag = async function(tag: string): Promise<void> {
  this.metadata.tags = this.metadata.tags.filter((t: string) => t !== tag);
  await this.save();
};

// Static methods
chatSessionSchema.statics.findByUser = function(userId: string, options: any = {}) {
  const { archived, pinned, search, tags } = options;
  
  let query: any = { userId };
  
  if (archived !== undefined) {
    query['metadata.isArchived'] = archived;
  }
  
  if (pinned !== undefined) {
    query['metadata.isPinned'] = pinned;
  }
  
  if (search) {
    query.$text = { $search: search };
  }
  
  if (tags && tags.length > 0) {
    query['metadata.tags'] = { $in: tags };
  }
  
  return this.find(query)
    .sort({ 'metadata.isPinned': -1, 'metadata.lastActivity': -1 })
    .populate('user', 'username avatar')
    .lean();
};

export const ChatSession = mongoose.model<IChatSessionDocument>('ChatSession', chatSessionSchema);
