import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../config';
import { logger } from '../utils/logger';
import { verifyToken } from '../utils/jwt';
import { User } from '../models/User';

interface UserSocket extends Socket {
  userId?: string;
  sessionId?: string;
  username?: string;
}

interface TypingEvent {
  sessionId: string;
  userId: string;
  isTyping: boolean;
}

interface MessageEvent {
  sessionId: string;
  message: any;
  type: 'user' | 'assistant';
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // socketId -> userId
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>
  private sessionUsers: Map<string, Set<string>> = new Map(); // sessionId -> Set<userId>
  private typingUsers: Map<string, Map<string, number>> = new Map(); // sessionId -> Map<userId, timestamp>

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.CORS_ORIGIN,
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    // Cleanup typing indicators every minute
    setInterval(() => this.cleanupTypingIndicators(), 60000);
    
    logger.info('Socket.IO service initialized');
  }

  /**
   * Setup Socket.IO middleware for authentication
   */
  private setupMiddleware(): void {
    this.io.use(async (socket: UserSocket, next) => {
      try {
        const token = socket.handshake.auth.token || 
                     socket.handshake.headers.authorization?.split(' ')[1];
        
        if (!token) {
          logger.debug('Socket connection attempt without token');
          return next(new Error('Authentication token required'));
        }

        const decoded = await verifyToken(token);
        const user = await User.findById(decoded.userId).select('_id username role');
        
        if (!user) {
          logger.warn(`Socket auth failed: User ${decoded.userId} not found`);
          return next(new Error('User not found'));
        }

        // Attach user info to socket
        socket.userId = user._id.toString();
        socket.username = user.username;
        
        next();
      } catch (error: any) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: UserSocket) => {
      const userId = socket.userId!;
      const username = socket.username!;
      const socketId = socket.id;
      
      // Add to connected users
      this.connectedUsers.set(socketId, userId);
      
      // Initialize user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);

      logger.info(`User ${username} (${userId}) connected via socket ${socketId}`);

      // Join user's personal room for direct messages
      socket.join(`user:${userId}`);

      // Emit connection status to user
      this.emitToUser(userId, 'connection_status', { 
        connected: true,
        socketId,
        timestamp: new Date().toISOString(),
      });

      // Notify other users in same sessions
      this.notifySessionUsers(userId, 'user_online', {
        userId,
        username,
        timestamp: new Date().toISOString(),
      });

      // Join chat session
      socket.on('join_session', (sessionId: string) => {
        this.handleJoinSession(socket, sessionId);
      });

      // Leave chat session
      socket.on('leave_session', (sessionId: string) => {
        this.handleLeaveSession(socket, sessionId);
      });

      // Typing indicator
      socket.on('typing', (data: TypingEvent) => {
        this.handleTyping(socket, data);
      });

      // Send message (real-time fallback)
      socket.on('send_message', (data: MessageEvent) => {
        this.handleSendMessage(socket, data);
      });

      // Delete message
      socket.on('delete_message', (data: any) => {
        this.handleDeleteMessage(socket, data);
      });

      // Heartbeat/ping
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: new Date().toISOString() });
      });

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      socket.on('error', (error) => {
        logger.error(`Socket error for user ${userId}:`, error);
      });
    });
  }

  /**
   * Handle joining a chat session
   */
  private handleJoinSession(socket: UserSocket, sessionId: string): void {
    try {
      const userId = socket.userId!;
      const username = socket.username!;
      
      // Join session room
      socket.join(`session:${sessionId}`);
      socket.sessionId = sessionId;

      // Update tracking
      if (!this.sessionUsers.has(sessionId)) {
        this.sessionUsers.set(sessionId, new Set());
      }
      this.sessionUsers.get(sessionId)!.add(userId);

      // Emit join confirmation
      socket.emit('session_joined', { 
        sessionId,
        timestamp: new Date().toISOString(),
      });

      // Notify other users in session
      socket.to(`session:${sessionId}`).emit('user_joined', {
        userId,
        username,
        sessionId,
        timestamp: new Date().toISOString(),
      });

      logger.debug(`User ${username} joined session ${sessionId}`);
    } catch (error) {
      logger.error('Error joining session:', error);
      socket.emit('error', { message: 'Failed to join session' });
    }
  }

  /**
   * Handle leaving a chat session
   */
  private handleLeaveSession(socket: UserSocket, sessionId: string): void {
    const userId = socket.userId!;
    const username = socket.username!;
    
    socket.leave(`session:${sessionId}`);
    delete socket.sessionId;

    // Update tracking
    this.sessionUsers.get(sessionId)?.delete(userId);

    // Cleanup if session has no users
    if (this.sessionUsers.get(sessionId)?.size === 0) {
      this.sessionUsers.delete(sessionId);
      this.typingUsers.delete(sessionId);
    }

    // Notify other users
    socket.to(`session:${sessionId}`).emit('user_left', {
      userId,
      username,
      sessionId,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`User ${username} left session ${sessionId}`);
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(socket: UserSocket, data: TypingEvent): void {
    const { sessionId, userId, isTyping } = data;
    const username = socket.username!;
    
    if (!socket.rooms.has(`session:${sessionId}`)) {
      return;
    }

    // Update typing status
    if (!this.typingUsers.has(sessionId)) {
      this.typingUsers.set(sessionId, new Map());
    }

    const sessionTyping = this.typingUsers.get(sessionId)!;
    
    if (isTyping) {
      sessionTyping.set(userId, Date.now());
    } else {
      sessionTyping.delete(userId);
    }

    // Broadcast to session (except sender)
    socket.to(`session:${sessionId}`).emit('user_typing', {
      userId,
      username,
      sessionId,
      isTyping,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle sending message (real-time fallback)
   */
  private handleSendMessage(socket: UserSocket, data: MessageEvent): void {
    const { sessionId, message, type } = data;
    const userId = socket.userId!;
    const username = socket.username!;

    if (!socket.rooms.has(`session:${sessionId}`)) {
      socket.emit('error', { message: 'Not in session' });
      return;
    }

    try {
      // Broadcast to session (including sender for consistency)
      this.io.to(`session:${sessionId}`).emit('new_message', {
        type,
        message: {
          ...message,
          sender: {
            id: userId,
            username,
          },
          timestamp: new Date().toISOString(),
        },
      });

      logger.debug(`Message sent in session ${sessionId} by user ${username}`);
    } catch (error) {
      logger.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle deleting message
   */
  private handleDeleteMessage(socket: UserSocket, data: any): void {
    const { sessionId, messageId } = data;
    const userId = socket.userId!;

    if (!socket.rooms.has(`session:${sessionId}`)) {
      socket.emit('error', { message: 'Not in session' });
      return;
    }

    // Broadcast deletion to session
    this.io.to(`session:${sessionId}`).emit('message_deleted', {
      messageId,
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });

    logger.debug(`Message ${messageId} deleted in session ${sessionId} by user ${userId}`);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(socket: UserSocket, reason: string): void {
    const userId = socket.userId!;
    const username = socket.username!;
    const socketId = socket.id;

    logger.info(`User ${username} disconnected: ${reason}`);

    // Remove from connected users
    this.connectedUsers.delete(socketId);

    // Remove from user sockets
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
        
        // Leave all sessions user was in
        this.sessionUsers.forEach((users, sessionId) => {
          if (users.has(userId)) {
            users.delete(userId);
            
            // Notify session users
            this.io.to(`session:${sessionId}`).emit('user_left', {
              userId,
              username,
              sessionId,
              reason: 'disconnected',
              timestamp: new Date().toISOString(),
            });
            
            // Cleanup empty sessions
            if (users.size === 0) {
              this.sessionUsers.delete(sessionId);
              this.typingUsers.delete(sessionId);
            }
          }
        });

        // Emit offline status
        this.emitToUser(userId, 'connection_status', { 
          connected: false,
          reason,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Notify all users in sessions where this user is present
   */
  private notifySessionUsers(userId: string, event: string, data: any): void {
    this.sessionUsers.forEach((users, sessionId) => {
      if (users.has(userId)) {
        this.io.to(`session:${sessionId}`).emit(event, data);
      }
    });
  }

  /**
   * Cleanup old typing indicators
   */
  private cleanupTypingIndicators(): void {
    const now = Date.now();
    const timeout = 10000; // 10 seconds

    this.typingUsers.forEach((users, sessionId) => {
      users.forEach((timestamp, userId) => {
        if (now - timestamp > timeout) {
          users.delete(userId);
          
          // Broadcast typing stop
          this.io.to(`session:${sessionId}`).emit('user_typing', {
            userId,
            sessionId,
            isTyping: false,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });
  }

  /**
   * Emit event to a specific user
   */
  emitToUser(userId: string, event: string, data: any): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit event to a specific session
   */
  emitToSession(sessionId: string, event: string, data: any): void {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * Emit event to all connected users
   */
  emitToAll(event: string, data: any): void {
    this.io.emit(event, data);
  }

  /**
   * Get connected users count
   */
  getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get active sessions count
   */
  getActiveSessionsCount(): number {
    return this.sessionUsers.size;
  }

  /**
   * Get user's active sessions
   */
  getUserSessions(userId: string): string[] {
    const sessions: string[] = [];
    this.sessionUsers.forEach((users, sessionId) => {
      if (users.has(userId)) {
        sessions.push(sessionId);
      }
    });
    return sessions;
  }

  /**
   * Get session's active users
   */
  getSessionUsers(sessionId: string): string[] {
    return Array.from(this.sessionUsers.get(sessionId) || []);
  }

  /**
   * Check if user is connected
   */
  isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      connectedUsers: this.getConnectedUsersCount(),
      activeSessions: this.getActiveSessionsCount(),
      userConnections: Object.fromEntries(
        Array.from(this.userSockets.entries()).map(([userId, sockets]) => [
          userId,
          sockets.size,
        ])
      ),
    };
  }
}

// Singleton instance
let socketService: SocketService;

export const setupSocketService = (server: HTTPServer): SocketService => {
  if (!socketService) {
    socketService = new SocketService(server);
  }
  return socketService;
};

export const getSocketService = (): SocketService => {
  if (!socketService) {
    throw new Error('Socket service not initialized');
  }
  return socketService;
};