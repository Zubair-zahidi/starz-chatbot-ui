import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { 
  getSystemStats,
  getOllamaStatus,
  cleanupOldMessages,
  backupDatabase,
  toggleMaintenance,
  getLogs,
  getActiveConnections
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require admin authentication
router.use(authenticate, authorize('admin'));

// System management
router.get('/stats', getSystemStats);
router.get('/ollama-status', getOllamaStatus);
router.get('/connections', getActiveConnections);
router.get('/logs', getLogs);
router.post('/cleanup', cleanupOldMessages);
router.post('/backup', backupDatabase);
router.post('/maintenance', toggleMaintenance);

export default router;