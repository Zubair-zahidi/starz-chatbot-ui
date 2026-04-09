import mongoose from 'mongoose';
import { ChatSession, Message, User } from '../models';
import { ollamaService } from './ollama.service';
import { getSocketService } from './socket.service';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/apiError';
import { config } from '../config';
import { decryptString } from '../utils/crypto';
import { 
  IMessage, 
  IChatSession, 
  IChatSessionWithMessages,
  ChatContext,
  MessageCreateDTO,
  SessionCreateDTO,
  SessionUpdateDTO
} from '../types/chat.types';

export class ChatService {
  private ollamaService: typeof ollamaService;

  constructor() {
    this.ollamaService = ollamaService;
  }

  private toObjectId(id: string, label: string = 'id'): mongoose.Types.ObjectId {
    if (!mongoose.isValidObjectId(id)) {
      throw ApiError.badRequest(`Invalid ${label}`);
    }
    return new mongoose.Types.ObjectId(id);
  }

  private emitToSession(sessionId: string, event: string, data: any): void {
    try {
      getSocketService().emitToSession(sessionId, event, data);
    } catch {
      // Socket service isn't initialized (e.g. during tests) - ignore.
    }
  }

  private maybeDecryptMessage(message: any): any {
    if (!config.ENABLE_MESSAGE_ENCRYPTION) return message;
    if (!message?.encrypted) return message;

    try {
      const plaintext = decryptString({
        alg: 'aes-256-gcm',
        ciphertext: message.content,
        iv: message.contentIv,
        authTag: message.contentAuthTag,
      });

      return {
        ...message,
        content: plaintext,
      };
    } catch (e) {
      // If key is missing or invalid, don't crash the whole request.
      logger.error('Failed to decrypt message content:', e);
      return {
        ...message,
        content: '[Encrypted message - unable to decrypt]',
      };
    }
  }

  /**
   * Guest session: limited usage before sign-in.
   */
  async createGuestSession(guestId: string, data: SessionCreateDTO): Promise<IChatSession> {
    try {
      const sessionData = {
        guestId,
        title: data.title || `Guest Chat ${new Date().toLocaleString()}`,
        context: {
          astronomicalFocus: data.focusAreas || ['astronomy-basics'],
          expertiseLevel: data.expertiseLevel || 'intermediate',
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 1200,
          lastQuery: '',
          summary: '',
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          lastActivity: new Date(),
          isArchived: false,
          isPinned: false,
          tags: data.tags || [],
        },
        isPrivate: true,
        sharedWith: [],
      };

      const session = await ChatSession.create(sessionData);

      await this.addSystemMessage(
        session._id.toString(),
        `Welcome to STARZ.\n\nGuest access is limited to 4 messages. Sign in to continue and save your sessions.`
      );

      return session;
    } catch (error) {
      logger.error('Failed to create guest chat session:', error);
      throw new ApiError('Failed to create guest chat session', 500);
    }
  }

  async getGuestSession(sessionId: string, guestId: string): Promise<IChatSessionWithMessages> {
    const session = await ChatSession.findOne({ _id: this.toObjectId(sessionId, 'sessionId'), guestId }).lean();
    if (!session) throw ApiError.notFound('Chat session not found');

    const messages = await Message.find({ sessionId: this.toObjectId(sessionId, 'sessionId'), isDeleted: false })
      .sort({ timestamp: 1 })
      .lean();

    return {
      ...(session as any),
      messages: (messages as any[]).map((m) => this.maybeDecryptMessage(m)) as any,
    } as IChatSessionWithMessages;
  }

  private async enforceGuestLimit(sessionId: string, guestId: string): Promise<void> {
    // Limit: 4 user messages per guest session.
    const count = await Message.countDocuments({
      sessionId: this.toObjectId(sessionId, 'sessionId'),
      role: 'user',
      isDeleted: false,
    });

    if (count >= 4) {
      throw ApiError.forbidden('Please sign in to continue chatting');
    }
  }

  async sendGuestMessage(
    sessionId: string,
    guestId: string,
    data: MessageCreateDTO
  ): Promise<{ userMessage: IMessage; aiMessage: IMessage }> {
    const session = await ChatSession.findOne({ _id: this.toObjectId(sessionId, 'sessionId'), guestId });
    if (!session) throw ApiError.notFound('Chat session not found');

    await this.enforceGuestLimit(sessionId, guestId);

    // Create user message
    const userMessage = await Message.create({
      sessionId: this.toObjectId(sessionId, 'sessionId'),
      content: data.content,
      role: 'user',
      metadata: {
        tokensUsed: this.estimateTokens(data.content),
        model: 'guest',
        images: data.images,
      },
    });

    session.context.lastQuery = data.content;
    session.metadata.messageCount += 1;
    session.metadata.totalTokens += userMessage.metadata.tokensUsed;
    session.metadata.lastActivity = new Date();
    await session.save();

    const userMessagePublic = this.maybeDecryptMessage(
      (userMessage as any).toObject ? (userMessage as any).toObject() : userMessage
    );

    // AI response (same pipeline)
    let aiMessage: any;
    try {
      const startTime = Date.now();
      const recentContext = await this.getRecentContext(sessionId, 5);

      const model = data.model || config.OLLAMA_MODEL || 'llama3';

      const response = await this.ollamaService.generateResponse(
        data.content,
        {
          astronomicalFocus: session.context.astronomicalFocus,
          expertiseLevel: session.context.expertiseLevel,
          lastQuery: session.context.lastQuery,
          previousContext: recentContext,
        },
        {
          model,
          temperature: session.context.temperature,
          maxTokens: session.context.maxTokens,
          stream: data.stream,
        }
      );

      const responseTime = Date.now() - startTime;
      const chatResponse = response as any;
      const content = data.stream ? String(chatResponse?.content || '') : String(chatResponse?.content || '');

      aiMessage = await Message.create({
        sessionId: this.toObjectId(sessionId, 'sessionId'),
        content,
        role: 'assistant',
        metadata: {
          responseTime,
          tokensUsed: this.estimateTokens(content),
          model,
          temperature: session.context.temperature,
          confidence: 0.85,
        },
      });

      session.metadata.messageCount += 1;
      session.metadata.totalTokens += aiMessage.metadata.tokensUsed;
      session.metadata.lastActivity = new Date();
      await session.save();

      this.maybeUpdateSessionSummary(sessionId).catch(() => undefined);
    } catch (e) {
      logger.error('Guest AI response failed:', e);
      aiMessage = await Message.create({
        sessionId: this.toObjectId(sessionId, 'sessionId'),
        content: 'AI service unavailable. Please try again in a moment.',
        role: 'assistant',
        metadata: { responseTime: 0, tokensUsed: 0, model: 'error', confidence: 0 },
      });
    }

    const aiMessagePublic = this.maybeDecryptMessage(
      (aiMessage as any).toObject ? (aiMessage as any).toObject() : aiMessage
    );

    return { userMessage: userMessagePublic as any, aiMessage: aiMessagePublic as any };
  }

  /**
   * Clear all messages in a guest session (keeps the session).
   */
  async clearGuestSessionMessages(sessionId: string, guestId: string): Promise<void> {
    const session = await ChatSession.findOne({
      _id: this.toObjectId(sessionId, 'sessionId'),
      guestId,
    });
    if (!session) throw ApiError.notFound('Chat session not found');

    await Message.deleteMany({ sessionId: this.toObjectId(sessionId, 'sessionId') });

    session.metadata.messageCount = 0;
    session.metadata.totalTokens = 0;
    session.metadata.lastActivity = new Date();
    session.context.lastQuery = '';
    session.context.summary = '';
    await session.save();
  }

  /**
   * Create a new chat session
   */
  async createSession(userId: string, data: SessionCreateDTO): Promise<IChatSession> {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new ApiError('User not found', 404);
      }

      const sessionData = {
        userId: this.toObjectId(userId, 'userId'),
        title: data.title || `Chat ${new Date().toLocaleString()}`,
        context: {
          astronomicalFocus: data.focusAreas || ['astronomy-basics'],
          expertiseLevel: data.expertiseLevel || 'intermediate',
          temperature: data.temperature || 0.7,
          maxTokens: data.maxTokens || 1200,
          lastQuery: '',
        },
        metadata: {
          messageCount: 0,
          totalTokens: 0,
          lastActivity: new Date(),
          isArchived: false,
          isPinned: false,
          tags: data.tags || [],
        },
      };

      const session = await ChatSession.create(sessionData);
      
      // Update user stats
      await user.incrementStats('chatSessions');
      
      // Add welcome message
      await this.addSystemMessage(
        session._id.toString(),
        `Welcome to STARZ! I am your cosmic intelligence assistant. \n\n**Focus Areas:** ${session.context.astronomicalFocus.join(', ')}\n**Expertise Level:** ${session.context.expertiseLevel}\n\nHow can I help you explore the universe today?`
      );

      logger.info(`New chat session created: ${session._id} for user ${userId}`);
      
      return session;
    } catch (error) {
      logger.error('Failed to create chat session:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to create chat session', 500);
    }
  }

  /**
   * Get user's chat sessions with pagination
   */
  async getUserSessions(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      archived?: boolean;
      pinned?: boolean;
      search?: string;
      tags?: string[];
    } = {}
  ): Promise<{ sessions: IChatSession[]; total: number }> {
    try {
      const {
        page = 1,
        limit = 20,
        archived = false,
        pinned,
        search = '',
        tags = [],
      } = options;

      const skip = (page - 1) * limit;
      
      // Build query
      const query: any = { userId: this.toObjectId(userId, 'userId') };
      
      if (archived !== undefined) {
        query['metadata.isArchived'] = archived;
      }
      
      if (pinned !== undefined) {
        query['metadata.isPinned'] = pinned;
      }
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { 'context.astronomicalFocus': { $regex: search, $options: 'i' } },
        ];
      }
      
      if (tags.length > 0) {
        query['metadata.tags'] = { $in: tags };
      }

      const [sessions, total] = await Promise.all([
        ChatSession.find(query)
          .sort({ 
            'metadata.isPinned': -1,
            'metadata.lastActivity': -1 
          })
          .skip(skip)
          .limit(limit)
          .populate('user', 'username avatar')
          .lean(),
        ChatSession.countDocuments(query),
      ]);

      return { sessions, total };
    } catch (error) {
      logger.error('Failed to get user sessions:', error);
      throw new ApiError('Failed to retrieve chat sessions', 500);
    }
  }

  /**
   * Get session with messages
   */
  async getSession(
    sessionId: string, 
    userId: string,
    options: { includeDeleted?: boolean } = {}
  ): Promise<IChatSessionWithMessages> {
    try {
      const session = await ChatSession.findOne({
        _id: this.toObjectId(sessionId, 'sessionId'),
        userId: this.toObjectId(userId, 'userId'),
      }).lean();

      if (!session) {
        throw ApiError.notFound('Chat session not found');
      }

      // Get messages
      const messageQuery: any = { sessionId: this.toObjectId(sessionId, 'sessionId') };
      
      if (!options.includeDeleted) {
        messageQuery.isDeleted = false;
      }

      const messages = await Message.find(messageQuery)
        .sort({ timestamp: 1 })
        .lean();

      return {
        ...(session as any),
        messages: (messages as any[]).map((m) => this.maybeDecryptMessage(m)) as any,
      } as IChatSessionWithMessages;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to get session:', error);
      throw new ApiError('Failed to retrieve chat session', 500);
    }
  }

  /**
   * Send a message in chat session
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    data: MessageCreateDTO
  ): Promise<{ userMessage: IMessage; aiMessage: IMessage }> {
    try {
      const session = await ChatSession.findById(sessionId);
      
      if (!session) {
        throw ApiError.notFound('Chat session not found');
      }

      // Check permissions
      if (!session.userId) {
        throw ApiError.forbidden('Unauthorized to send message in this session');
      }

      if (session.userId.toString() !== userId) {
        const hasAccess = session.sharedWith?.some(
          share => share.user.toString() === userId && share.permission === 'write'
        );
        
        if (!hasAccess && session.isPrivate) {
          throw ApiError.forbidden('Unauthorized to send message in this session');
        }
      }

      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('User not found');
      }

      // Create user message
      const userMessage = await Message.create({
        sessionId: this.toObjectId(sessionId, 'sessionId'),
        content: data.content,
        role: 'user',
        metadata: {
          tokensUsed: this.estimateTokens(data.content),
          model: 'user',
          images: data.images,
        },
      });

      // Update session context
      session.context.lastQuery = data.content;
      session.metadata.messageCount += 1;
      session.metadata.totalTokens += userMessage.metadata.tokensUsed;
      session.metadata.lastActivity = new Date();
      await session.save();

      // Update user stats
      await user.incrementStats('messagesSent');
      await user.incrementStats('totalTokensUsed', userMessage.metadata.tokensUsed);

      const userMessagePublic = this.maybeDecryptMessage(
        (userMessage as any).toObject ? (userMessage as any).toObject() : userMessage
      );

      // Emit via WebSocket
      this.emitToSession(sessionId, 'new_message', {
        type: 'user',
        message: userMessagePublic,
      });

      // Generate AI response
      let aiMessage: IMessage;
      
      try {
        const startTime = Date.now();
        
        // Get recent context for AI
        const recentContext = await this.getRecentContext(sessionId, 5);
        
        const model = data.model || config.OLLAMA_MODEL || 'llama3';
        
        const response = await this.ollamaService.generateResponse(
          data.content,
          {
            astronomicalFocus: session.context.astronomicalFocus,
            expertiseLevel: session.context.expertiseLevel,
            lastQuery: session.context.lastQuery,
            previousContext: recentContext,
          },
          {
            model,
            temperature: session.context.temperature,
            maxTokens: session.context.maxTokens,
            stream: data.stream,
          }
        );

        const responseTime = Date.now() - startTime;
        
        if (data.stream) {
          // For streaming, we would handle this differently
          // This is a simplified implementation
          const streamResponse = response as AsyncIterable<any>;
          let streamedContent = '';
          
          for await (const chunk of streamResponse) {
            streamedContent += chunk.content;
          }
          
              aiMessage = await Message.create({
                sessionId: this.toObjectId(sessionId, 'sessionId'),
                content: streamedContent,
                role: 'assistant',
                metadata: {
                  responseTime,
                  tokensUsed: this.estimateTokens(streamedContent),
                  model,
                  temperature: session.context.temperature,
                  confidence: 0.9,
                },
              });
        } else {
          const chatResponse = response as any;
          
          aiMessage = await Message.create({
            sessionId: this.toObjectId(sessionId, 'sessionId'),
            content: chatResponse.content,
            role: 'assistant',
            metadata: {
              responseTime,
              tokensUsed: chatResponse.metadata.tokensUsed,
              model,
              temperature: session.context.temperature,
              confidence: 0.9,
            },
          });
        }

        // Update session
        session.metadata.messageCount += 1;
        session.metadata.totalTokens += aiMessage.metadata.tokensUsed;
        session.metadata.lastActivity = new Date();
        await session.save();

        // Update user stats
        await user.incrementStats('totalTokensUsed', aiMessage.metadata.tokensUsed);

        const aiMessagePublic = this.maybeDecryptMessage(
          (aiMessage as any).toObject ? (aiMessage as any).toObject() : aiMessage
        );

        // Emit via WebSocket
        this.emitToSession(sessionId, 'new_message', {
          type: 'assistant',
          message: aiMessagePublic,
        });

        logger.info(`Message processed: ${sessionId} in ${responseTime}ms with ${aiMessage.metadata.tokensUsed} tokens`);

        // Non-blocking memory update (keeps chat snappy).
        this.maybeUpdateSessionSummary(sessionId).catch((e) =>
          logger.error('Summary update failed:', e)
        );
        
      } catch (error) {
        logger.error('Failed to generate AI response:', error);
        
        // Create error message
        aiMessage = await Message.create({
          sessionId: this.toObjectId(sessionId, 'sessionId'),
          content: 'I apologize, but I encountered an error while processing your request. The AI service might be temporarily unavailable. Please try again in a moment.',
          role: 'assistant',
          metadata: {
            responseTime: 0,
            tokensUsed: 0,
            model: 'error',
            confidence: 0,
          },
        });

        this.emitToSession(sessionId, 'new_message', {
          type: 'assistant',
          message: this.maybeDecryptMessage(
            (aiMessage as any).toObject ? (aiMessage as any).toObject() : aiMessage
          ),
        });
      }

      return {
        userMessage: userMessagePublic as any,
        aiMessage: this.maybeDecryptMessage(
          (aiMessage as any).toObject ? (aiMessage as any).toObject() : aiMessage
        ) as any,
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to send message:', error);
      throw new ApiError('Failed to send message', 500);
    }
  }

  /**
   * Delete a message (soft delete by default)
   */
  async deleteMessage(
    messageId: string,
    userId: string,
    permanent: boolean = false
  ): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw ApiError.notFound('Message not found');
      }

      // Get session to check permissions
      const session = await ChatSession.findById(message.sessionId);
      
      if (!session) {
        throw ApiError.notFound('Session not found');
      }

      // Check permissions
      if (!session.userId) {
        throw ApiError.forbidden('Unauthorized to delete this message');
      }

      const isOwner = session.userId.toString() === userId;
      const isMessageSender = message.role === 'user'; // Only users can delete their own messages
      const isAdmin = false; // In real app, check user role from User model
      
      const canDelete = (isOwner && isMessageSender) || isAdmin;
      
      if (!canDelete) {
        throw ApiError.forbidden('Unauthorized to delete this message');
      }

      if (permanent && isAdmin) {
        // Permanent delete (admin only)
        await Message.findByIdAndDelete(messageId);
        
        // Update session stats
        await ChatSession.findByIdAndUpdate(message.sessionId, {
          $inc: { 
            'metadata.messageCount': -1,
            'metadata.totalTokens': -message.metadata.tokensUsed,
          },
          $set: { 'metadata.lastActivity': new Date() },
        });
        
        logger.info(`Message ${messageId} permanently deleted by admin ${userId}`);
      } else {
        // Soft delete
        await message.softDelete(userId);
        logger.info(`Message ${messageId} soft deleted by user ${userId}`);
      }

      // Emit deletion event via WebSocket
      this.emitToSession(
        session._id.toString(),
        'message_deleted',
        { 
          messageId,
          deletedBy: userId,
          permanent,
        }
      );

    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to delete message:', error);
      throw new ApiError('Failed to delete message', 500);
    }
  }

  /**
   * Restore a deleted message
   */
  async restoreMessage(messageId: string, userId: string): Promise<void> {
    try {
      const message = await Message.findById(messageId);
      
      if (!message) {
        throw ApiError.notFound('Message not found');
      }

      // Check if message was deleted
      if (!message.isDeleted) {
        throw ApiError.badRequest('Message is not deleted');
      }

      // Check permissions
      const session = await ChatSession.findById(message.sessionId);
      
      if (!session) {
        throw ApiError.notFound('Session not found');
      }

      if (!session.userId) {
        throw ApiError.forbidden('Unauthorized to restore this message');
      }

      const isOwner = session.userId.toString() === userId;
      const isAdmin = false; // Check user role
      
      if (!isOwner && !isAdmin) {
        throw ApiError.forbidden('Unauthorized to restore this message');
      }

      // Restore message
      await message.restore();

      // Emit restoration event
      this.emitToSession(
        session._id.toString(),
        'message_restored',
        { messageId }
      );

      logger.info(`Message ${messageId} restored by user ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to restore message:', error);
      throw new ApiError('Failed to restore message', 500);
    }
  }

  /**
   * Update chat session
   */
  async updateSession(
    sessionId: string,
    userId: string,
    data: SessionUpdateDTO
  ): Promise<IChatSession> {
    try {
      const session = await ChatSession.findOne({
        _id: this.toObjectId(sessionId, 'sessionId'),
        userId: this.toObjectId(userId, 'userId'),
      });

      if (!session) {
        throw ApiError.notFound('Chat session not found');
      }

      // Update fields
      if (data.title !== undefined) session.title = data.title;
      if (data.focusAreas !== undefined) {
        session.context.astronomicalFocus = data.focusAreas;
      }
      if (data.expertiseLevel !== undefined) {
        session.context.expertiseLevel = data.expertiseLevel;
      }
      if (data.temperature !== undefined) {
        session.context.temperature = data.temperature;
      }
      if (data.maxTokens !== undefined) {
        session.context.maxTokens = data.maxTokens;
      }
      if (data.tags !== undefined) {
        session.metadata.tags = data.tags;
      }
      if (data.isArchived !== undefined) {
        session.metadata.isArchived = data.isArchived;
      }
      if (data.isPinned !== undefined) {
        session.metadata.isPinned = data.isPinned;
      }

      session.metadata.lastActivity = new Date();
      await session.save();

      return session;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to update session:', error);
      throw new ApiError('Failed to update chat session', 500);
    }
  }

  /**
   * Delete chat session and all messages
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await ChatSession.findOne({
        _id: this.toObjectId(sessionId, 'sessionId'),
        userId: this.toObjectId(userId, 'userId'),
      });

      if (!session) {
        throw ApiError.notFound('Chat session not found');
      }

      // Delete all messages in session
      await Message.deleteMany({ sessionId: this.toObjectId(sessionId, 'sessionId') });
      
      // Delete session
      await session.deleteOne();

      // Update user stats
      const user = await User.findById(userId);
      if (user) {
        // Note: We don't decrement chat sessions for simplicity
        // In a real app, you might want to track this differently
      }

      logger.info(`Session ${sessionId} deleted by user ${userId}`);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to delete session:', error);
      throw new ApiError('Failed to delete chat session', 500);
    }
  }

  /**
   * Export session data
   */
  async exportSession(
    sessionId: string,
    userId: string,
    format: 'json' | 'csv' | 'txt' = 'json'
  ): Promise<any> {
    try {
      const session = await this.getSession(sessionId, userId, { includeDeleted: false });

      // At this point messages are already decrypted (if possible).
      
      switch (format) {
        case 'json':
          return {
            session: {
              id: session._id,
              title: session.title,
              createdAt: session.createdAt,
              updatedAt: session.updatedAt,
              context: session.context,
              metadata: session.metadata,
              messages: session.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: msg.timestamp,
                metadata: msg.metadata,
              })),
            },
            exportedAt: new Date().toISOString(),
            format: 'json',
            app: 'STARZ',
            version: '4.3.0',
          };
          
        case 'csv':
          // Convert to CSV format
          const headers = ['Role', 'Content', 'Timestamp', 'Tokens Used'];
          const rows = session.messages.map(msg => [
            msg.role,
            `"${msg.content.replace(/"/g, '""')}"`,
            new Date(msg.timestamp).toISOString(),
            msg.metadata.tokensUsed,
          ]);
          
          return [headers, ...rows].map(row => row.join(',')).join('\n');
          
        case 'txt':
          // Convert to readable text format
          let text = `STARZ Chat Export\n`;
          text += `Session: ${session.title}\n`;
          text += `Created: ${session.createdAt ? new Date(session.createdAt).toLocaleString() : 'N/A'}\n`;
          text += `Last Activity: ${new Date(session.metadata.lastActivity).toLocaleString()}\n`;
          text += `Total Messages: ${session.metadata.messageCount}\n`;
          text += `Total Tokens: ${session.metadata.totalTokens}\n\n`;
          text += `Messages:\n${'='.repeat(80)}\n\n`;
          
          session.messages.forEach((msg, index) => {
            text += `[${msg.role.toUpperCase()}] ${new Date(msg.timestamp).toLocaleString()}\n`;
            text += `${msg.content}\n\n`;
          });
          
          return text;
          
        default:
          throw ApiError.badRequest('Unsupported export format');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to export session:', error);
      throw new ApiError('Failed to export chat session', 500);
    }
  }

  /**
   * Search within messages
   */
  async searchMessages(
    userId: string,
    query: string,
    options: {
      sessionId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ messages: IMessage[]; total: number }> {
    try {
      if (config.ENABLE_MESSAGE_ENCRYPTION) {
        throw ApiError.serviceUnavailable('Search is disabled when message encryption is enabled');
      }

      const { sessionId, limit = 50, offset = 0 } = options;
      
      if (!query || query.trim().length < 2) {
        throw ApiError.badRequest('Search query must be at least 2 characters');
      }
      
      // First, get sessions that belong to the user
      const sessionQuery: any = { userId: this.toObjectId(userId, 'userId') };
      if (sessionId) {
        sessionQuery._id = this.toObjectId(sessionId, 'sessionId');
      }
      
      const userSessions = await ChatSession.find(sessionQuery).select('_id');
      const sessionIds = userSessions.map(s => s._id);
      
      if (sessionIds.length === 0) {
        return { messages: [], total: 0 };
      }
      
      // Search in messages
      const messageQuery: any = {
        sessionId: { $in: sessionIds },
        isDeleted: false,
        $text: { $search: query },
      };
      
      const [messages, total] = await Promise.all([
        Message.find(messageQuery)
          .sort({ timestamp: -1 })
          .skip(offset)
          .limit(limit)
          .populate('session', 'title')
          .lean(),
        Message.countDocuments(messageQuery),
      ]);
      
      return { messages, total };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Failed to search messages:', error);
      throw new ApiError('Failed to search messages', 500);
    }
  }

  /**
   * Add system message to session
   */
  private async addSystemMessage(sessionId: string, content: string): Promise<IMessage> {
    try {
      const message = await Message.create({
        sessionId: this.toObjectId(sessionId, 'sessionId'),
        content,
        role: 'system',
        metadata: {
          tokensUsed: this.estimateTokens(content),
          model: 'system',
        },
      });
      
      // Update session stats
      await ChatSession.findByIdAndUpdate(sessionId, {
        $inc: { 
          'metadata.messageCount': 1,
          'metadata.totalTokens': message.metadata.tokensUsed,
        },
        $set: { 'metadata.lastActivity': new Date() },
      });
      
      return message;
    } catch (error) {
      logger.error('Failed to add system message:', error);
      throw error;
    }
  }

  /**
   * Get recent context for AI
   */
  private async getRecentContext(
    sessionId: string, 
    limit: number = 5
  ): Promise<Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> {
    try {
      const session = await ChatSession.findById(sessionId).select('context.summary').lean();
      const summary = (session as any)?.context?.summary as string | undefined;

      const messages = await Message.find({
        sessionId: this.toObjectId(sessionId, 'sessionId'),
        isDeleted: false,
        role: { $in: ['user', 'assistant'] },
      })
        .sort({ timestamp: -1 })
        .limit(limit)
        .select('role content')
        .lean();

      const recent = messages.reverse().map((msg: any) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content as string,
      }));

      const prefix = summary
        ? ([
            {
              role: 'system' as const,
              content:
                `Conversation memory (summary):\n${summary}\n\n` +
                `Use this as background. If it conflicts with recent messages, trust the recent messages.`,
            },
          ] as const)
        : [];

      return [...prefix, ...recent];
    } catch (error) {
      logger.error('Failed to get recent context:', error);
      return [];
    }
  }

  /**
   * Clear all messages in a user session (keeps the session).
   */
  async clearSessionMessages(sessionId: string, userId: string): Promise<void> {
    const session = await ChatSession.findOne({
      _id: this.toObjectId(sessionId, 'sessionId'),
      userId: this.toObjectId(userId, 'userId'),
    });

    if (!session) {
      throw ApiError.notFound('Chat session not found');
    }

    await Message.deleteMany({ sessionId: this.toObjectId(sessionId, 'sessionId') });

    session.metadata.messageCount = 0;
    session.metadata.totalTokens = 0;
    session.metadata.lastActivity = new Date();
    session.context.lastQuery = '';
    session.context.summary = '';
    await session.save();

    logger.info(`Session ${sessionId} cleared by user ${userId}`);
  }

  private async maybeUpdateSessionSummary(sessionId: string): Promise<void> {
    try {
      const session = await ChatSession.findById(sessionId);
      if (!session) return;

      // Update every 20 messages (user+assistant+system counted in metadata)
      if (session.metadata.messageCount === 0 || session.metadata.messageCount % 20 !== 0) return;

      const recent = await Message.find({
        sessionId: this.toObjectId(sessionId, 'sessionId'),
        isDeleted: false,
        role: { $in: ['user', 'assistant'] },
      })
        .sort({ timestamp: -1 })
        .limit(24)
        .select('role content')
        .lean();

      const transcript = recent
        .reverse()
        .map((m: any) => `${String(m.role).toUpperCase()}: ${m.content}`)
        .join('\n');

      try {
        const resp = (await this.ollamaService.generateResponse(
          `Summarize the following conversation into a compact memory.\n\n` +
            `Rules:\n- Keep it under 1200 characters.\n- Include: user's goal, key facts, preferences, decisions, open TODOs.\n- No markdown.\n\n` +
            `Conversation:\n${transcript}\n\nSummary:`,
          {
            astronomicalFocus: session.context.astronomicalFocus,
            expertiseLevel: session.context.expertiseLevel,
            lastQuery: session.context.lastQuery,
            previousContext: [],
          },
          { maxTokens: 300, temperature: 0.2 }
        )) as any;

        session.context.summary = String(resp?.content || '').slice(0, 5000);
      } catch {
        // Fallback: store a truncated transcript (still useful, no extra dependencies)
        session.context.summary = transcript.slice(0, 1200);
      }

      await session.save();
    } catch (e) {
      logger.error('Failed to update session summary:', e);
    }
  }

  /**
   * Estimate tokens in text
   */
  private estimateTokens(text: string): number {
    // Simple estimation: 4 characters ~= 1 token
    // For more accuracy, you might want to use a tokenizer library
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
export const chatService = new ChatService();

