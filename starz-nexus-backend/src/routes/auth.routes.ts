import { Router } from 'express';
import { 
  register,
  login,
  logout,
  refreshToken,
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  deleteMyAccount,
  forgotPassword,
  resetPassword,
  verifyEmail,
  getUserStats
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate, validationSchemas } from '../middleware/validation.middleware';
import { upload } from '../utils/fileUpload';
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

// Public routes
router.post('/register', authLimiter, validate(validationSchemas.register), register);
router.post('/login', authLimiter, validate(validationSchemas.login), login);
router.post('/refresh-token', validate(validationSchemas.refreshToken), refreshToken);
router.post('/forgot-password', authLimiter, validate(validationSchemas.forgotPassword), forgotPassword);
router.post('/reset-password', authLimiter, validate(validationSchemas.resetPassword), resetPassword);
router.get('/verify-email/:token', verifyEmail);

// Protected routes (require authentication)
router.use(authenticate);

router.get('/me', getProfile);
router.put('/me', validate(validationSchemas.updateProfile), updateProfile);
router.put('/me/avatar', upload.single('avatar'), uploadAvatar);
router.delete('/me', validate(validationSchemas.deleteMe), deleteMyAccount);
router.post('/change-password', validate(validationSchemas.changePassword), changePassword);
router.post('/logout', logout);
router.get('/stats', getUserStats);

export default router;
