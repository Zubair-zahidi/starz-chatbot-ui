import { Router } from 'express';
import {
  createGuestSession,
  getGuestSession,
  sendGuestMessage,
  clearGuestSessionMessages,
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  clearSessionMessages,
  sendMessage,
  deleteMessage,
  restoreMessage,
  exportSession,
  searchMessages,
  streamChat,
  archiveSession,
  pinSession,
  getChatStats,
  getDeletedMessages
} from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';
import { attachGuest, requireGuest } from '../middleware/guest.middleware';
import { validate, validateQuery, validationSchemas } from '../middleware/validation.middleware';

const router = Router();

// Guest routes (no auth; limited to 4 user messages then require sign-in)
router.use(attachGuest);
router.post(
  '/guest/sessions',
  requireGuest,
  validate(validationSchemas.createSession),
  createGuestSession
);
router.get('/guest/sessions/:sessionId', requireGuest, getGuestSession);
router.post(
  '/guest/sessions/:sessionId/messages',
  requireGuest,
  validate(validationSchemas.sendMessage),
  sendGuestMessage
);
router.delete('/guest/sessions/:sessionId/messages', requireGuest, clearGuestSessionMessages);

// Authenticated routes
router.use(authenticate);

// Session management
router.get('/sessions', 
  validateQuery(validationSchemas.sessionQuery), 
  getSessions
);

router.post('/sessions', 
  validate(validationSchemas.createSession), 
  createSession
);

router.get('/sessions/:sessionId', getSession);
router.put('/sessions/:sessionId', 
  validate(validationSchemas.updateSession), 
  updateSession
);
router.delete('/sessions/:sessionId', deleteSession);
router.delete('/sessions/:sessionId/messages', clearSessionMessages);
router.post('/sessions/:sessionId/archive', archiveSession);
router.post('/sessions/:sessionId/pin', pinSession);
router.get('/sessions/:sessionId/export', exportSession);
router.get('/sessions/:sessionId/deleted', getDeletedMessages);

// Message management
router.post('/sessions/:sessionId/messages', 
  validate(validationSchemas.sendMessage), 
  sendMessage
);

router.post('/sessions/:sessionId/stream', streamChat);

router.delete('/messages/:messageId', deleteMessage);
router.post('/messages/:messageId/restore', restoreMessage);

// Search
router.get('/search', 
  validateQuery(validationSchemas.searchQuery), 
  searchMessages
);

// Statistics
router.get('/stats', getChatStats);

export default router;
