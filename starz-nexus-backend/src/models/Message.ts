import mongoose, { Document, Schema } from 'mongoose';
import { IMessage } from '../types/chat.types';
import { config } from '../config';
import { encryptString } from '../utils/crypto';

export interface IMessageDocument extends IMessage, Document {
  softDelete(userId: string): Promise<void>;
  restore(): Promise<void>;
  updateContent(content: string): Promise<void>;
}

const messageSchema = new Schema<IMessageDocument>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'ChatSession',
      required: [true, 'Session ID is required'],
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
    },

    // Optional application-level encryption (AES-256-GCM). When enabled, `content`
    // stores ciphertext (base64) and we store iv/authTag separately.
    encrypted: {
      type: Boolean,
      default: false,
      index: true,
    },
    contentIv: String,
    contentAuthTag: String,
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: [true, 'Message role is required'],
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    
    // Metadata
    metadata: {
      responseTime: {
        type: Number,
        default: 0,
        min: 0,
      },
      tokensUsed: {
        type: Number,
        default: 0,
        min: 0,
      },
      model: {
        type: String,
        default: 'llama3',
      },
      temperature: {
        type: Number,
        default: 0.7,
        min: 0.1,
        max: 1.0,
      },
      sources: [{
        type: String,
        trim: true,
      }],
      confidence: {
        type: Number,
        default: 0.9,
        min: 0,
        max: 1,
      },
      images: [{
        type: String,
      }],
    },
    
    // Soft delete fields
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: Date,
    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Version for optimistic updates
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        // Don't include deleted messages in JSON unless explicitly requested
        if (ret.isDeleted) {
          ret.content = '[This message was deleted]';
          ret.metadata = {};
        }
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
messageSchema.index({ sessionId: 1, timestamp: 1 });
messageSchema.index({ sessionId: 1, createdAt: -1 });
messageSchema.index({ 'metadata.tokensUsed': -1 });
messageSchema.index({ role: 1 });
messageSchema.index({ isDeleted: 1 });

// TTL index for automatic cleanup of deleted messages (30 days)
messageSchema.index(
  { deletedAt: 1 },
  { 
    expireAfterSeconds: 2592000, // 30 days
    partialFilterExpression: { isDeleted: true }
  }
);

    // Text index for search
    // NOTE: If ENABLE_MESSAGE_ENCRYPTION=true, searching plaintext is not possible.
    // We keep the index for non-encrypted deployments.
    messageSchema.index({ content: 'text' });

// Virtuals
messageSchema.virtual('session', {
  ref: 'ChatSession',
  localField: 'sessionId',
  foreignField: '_id',
  justOne: true,
});

messageSchema.virtual('deletedByUser', {
  ref: 'User',
  localField: 'deletedBy',
  foreignField: '_id',
  justOne: true,
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timestamp = new Date();
  }

  // Encrypt content at rest if enabled and not already encrypted
  if (config.ENABLE_MESSAGE_ENCRYPTION && !this.encrypted && this.isModified('content')) {
    const enc = encryptString(this.content);
    this.content = enc.ciphertext;
    this.contentIv = enc.iv;
    this.contentAuthTag = enc.authTag;
    this.encrypted = true;
  }
  
  // Increment version on update
  if (this.isModified()) {
    this.version += 1;
  }
  
  next();
});

// Instance methods
messageSchema.methods.softDelete = async function(userId: string): Promise<void> {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = new mongoose.Types.ObjectId(userId);
  this.version += 1;
  await this.save();
};

messageSchema.methods.restore = async function(): Promise<void> {
  this.isDeleted = false;
  this.deletedAt = undefined;
  this.deletedBy = undefined;
  this.version += 1;
  await this.save();
};

messageSchema.methods.updateContent = async function(content: string): Promise<void> {
  this.content = content;
  this.version += 1;
  await this.save();
};

// Static methods
messageSchema.statics.findActiveBySession = function(sessionId: string) {
  return this.find({ 
    sessionId, 
    isDeleted: false 
  })
  .sort({ timestamp: 1 })
  .lean();
};

messageSchema.statics.findDeletedBySession = function(sessionId: string) {
  return this.find({ 
    sessionId, 
    isDeleted: true 
  })
  .sort({ deletedAt: -1 })
  .lean();
};

messageSchema.statics.searchInSession = function(sessionId: string, query: string) {
  return this.find({
    sessionId,
    isDeleted: false,
    content: { $regex: query, $options: 'i' }
  })
  .sort({ timestamp: -1 })
  .lean();
};

export const Message = mongoose.model<IMessageDocument>('Message', messageSchema);
