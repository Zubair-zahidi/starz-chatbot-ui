import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../utils/response';
import { ApiError } from '../utils/apiError';
import { chatService } from '../services/chat.service';
import { ChatSession, Message } from '../models';

export const createGuestSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guestId = req.guestId!;
    const session = await chatService.createGuestSession(guestId, req.body);
    ApiResponse.created(res, { session }, 'Guest chat session created');
  } catch (error) {
    next(error);
  }
};

export const getGuestSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guestId = req.guestId!;
    const { sessionId } = req.params;
    const session = await chatService.getGuestSession(sessionId, guestId);
    ApiResponse.success(res, { session }, 'Guest chat session retrieved');
  } catch (error) {
    next(error);
  }
};

export const sendGuestMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guestId = req.guestId!;
    const { sessionId } = req.params;
    const { userMessage, aiMessage } = await chatService.sendGuestMessage(sessionId, guestId, req.body);
    ApiResponse.created(res, { userMessage, aiMessage }, 'Message processed successfully');
  } catch (error) {
    next(error);
  }
};

export const clearGuestSessionMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const guestId = req.guestId!;
    const { sessionId } = req.params;
    await chatService.clearGuestSessionMessages(sessionId, guestId);
    ApiResponse.success(res, null, 'Guest chat cleared');
  } catch (error) {
    next(error);
  }
};

export const getSessions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const {
      page = 1,
      limit = 20,
      archived = false,
      pinned,
      search = '',
      tags = [],
    } = req.query as any;

    const result = await chatService.getUserSessions(userId, {
      page: Number(page),
      limit: Number(limit),
      archived: archived === 'true' ? true : Boolean(archived),
      pinned:
        pinned === undefined
          ? undefined
          : pinned === 'true'
            ? true
            : pinned === 'false'
              ? false
              : Boolean(pinned),
      search: String(search || ''),
      tags: Array.isArray(tags) ? tags.map(String) : tags ? [String(tags)] : [],
    });

    ApiResponse.paginated(
      res,
      result.sessions,
      result.total,
      Number(page),
      Number(limit),
      'Chat sessions retrieved'
    );
  } catch (error) {
    next(error);
  }
};

export const getSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const includeDeleted = (req.query as any)?.includeDeleted === 'true';

    const session = await chatService.getSession(sessionId, userId, {
      includeDeleted,
    });

    ApiResponse.success(res, { session }, 'Chat session retrieved');
  } catch (error) {
    next(error);
  }
};

export const createSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const session = await chatService.createSession(userId, req.body);
    ApiResponse.created(res, { session }, 'Chat session created');
  } catch (error) {
    next(error);
  }
};

export const updateSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const session = await chatService.updateSession(sessionId, userId, req.body);
    ApiResponse.success(res, { session }, 'Chat session updated');
  } catch (error) {
    next(error);
  }
};

export const deleteSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    await chatService.deleteSession(sessionId, userId);
    ApiResponse.success(res, null, 'Chat session deleted');
  } catch (error) {
    next(error);
  }
};

export const clearSessionMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    await chatService.clearSessionMessages(sessionId, userId);
    ApiResponse.success(res, null, 'Chat cleared');
  } catch (error) {
    next(error);
  }
};

export const archiveSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { archived = true } = req.body || {};

    const session = await chatService.updateSession(sessionId, userId, {
      isArchived: Boolean(archived),
    });

    ApiResponse.success(res, { session }, 'Session archive status updated');
  } catch (error) {
    next(error);
  }
};

export const pinSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const { pinned = true } = req.body || {};

    const session = await chatService.updateSession(sessionId, userId, {
      isPinned: Boolean(pinned),
    });

    ApiResponse.success(res, { session }, 'Session pin status updated');
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const { userMessage, aiMessage } = await chatService.sendMessage(
      sessionId,
      userId,
      req.body
    );

    ApiResponse.created(
      res,
      { userMessage, aiMessage },
      'Message processed successfully'
    );
  } catch (error) {
    next(error);
  }
};

// NOTE: This endpoint currently returns the final response once completed.
// The service already supports Ollama streaming internally, so we can evolve this
// into a true streaming/SSE endpoint later without changing the client contract.
export const streamChat = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const { userMessage, aiMessage } = await chatService.sendMessage(sessionId, userId, {
      ...req.body,
      stream: true,
    });

    ApiResponse.created(res, { userMessage, aiMessage }, 'Stream completed');
  } catch (error) {
    next(error);
  }
};

export const deleteMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const permanent = (req.query as any)?.permanent === 'true';

    await chatService.deleteMessage(messageId, userId, permanent);
    ApiResponse.success(res, null, 'Message deleted');
  } catch (error) {
    next(error);
  }
};

export const restoreMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { messageId } = req.params;
    await chatService.restoreMessage(messageId, userId);
    ApiResponse.success(res, null, 'Message restored');
  } catch (error) {
    next(error);
  }
};

export const getDeletedMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    const session = await ChatSession.findById(sessionId).select('userId isPrivate sharedWith');
    if (!session) throw ApiError.notFound('Chat session not found');

    if (!session.userId || (session.userId.toString() !== userId && session.isPrivate)) {
      throw ApiError.forbidden('Unauthorized to view deleted messages');
    }

    const messages = await Message.find({
      sessionId,
      isDeleted: true,
    })
      .sort({ deletedAt: -1 })
      .lean();

    ApiResponse.success(res, { messages }, 'Deleted messages retrieved');
  } catch (error) {
    next(error);
  }
};

export const exportSession = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { sessionId } = req.params;
    const format = ((req.query as any)?.format || 'json') as 'json' | 'csv' | 'txt';

    const exported = await chatService.exportSession(sessionId, userId, format);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.csv"`);
      res.status(200).send(exported);
      return;
    }

    if (format === 'txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.txt"`);
      res.status(200).send(exported);
      return;
    }

    res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.json"`);
    ApiResponse.success(res, exported, 'Session exported');
  } catch (error) {
    next(error);
  }
};

export const searchMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { q, sessionId, limit, offset } = req.query as any;

    const result = await chatService.searchMessages(userId, String(q), {
      sessionId: sessionId ? String(sessionId) : undefined,
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
    });

    ApiResponse.success(res, result, 'Search completed');
  } catch (error) {
    next(error);
  }
};

export const getChatStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const userSessions = await ChatSession.find({ userId }).select('_id').lean();
    const sessionIds = userSessions.map((s: any) => s._id);

    const [totalSessions, totalMessages, deletedMessages] = await Promise.all([
      ChatSession.countDocuments({ userId }),
      Message.countDocuments({ sessionId: { $in: sessionIds }, isDeleted: false }),
      Message.countDocuments({ sessionId: { $in: sessionIds }, isDeleted: true }),
    ]);

    ApiResponse.success(
      res,
      {
        sessions: totalSessions,
        messages: totalMessages,
        deletedMessages,
      },
      'Chat stats retrieved'
    );
  } catch (error) {
    next(error);
  }
};
