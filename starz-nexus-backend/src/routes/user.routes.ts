import { Router } from 'express';
import {
  authenticate,
  authenticateAdminApiKey,
  authenticateInsecureLocalAdminNoAuth,
  authorize,
} from '../middleware/auth.middleware';
import { 
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  updateUserRole,
  getUserChats
} from '../controllers/user.controller';
import { validate, validationSchemas } from '../middleware/validation.middleware';

const router = Router();

// All user routes require authentication
// Dev convenience: allow admin access via `x-admin-key` (Thunder Client)
// Dev convenience: allow localhost access without any headers (VERY INSECURE; disabled by default)
router.use(authenticateInsecureLocalAdminNoAuth);
router.use(authenticateAdminApiKey);
router.use((req, res, next) => {
  if (req.user) return next();
  return authenticate(req, res, next);
});

// User management
// Admin only: list all accounts
router.get('/', authorize('admin'), getUsers);
router.get('/:userId', getUserById);
router.put('/:userId', validate(validationSchemas.adminUpdateUser), updateUser);
router.delete('/:userId', authorize('admin'), deleteUser);
router.put('/:userId/role', authorize('admin'), updateUserRole);
router.get('/:userId/chats', getUserChats);

export default router;
