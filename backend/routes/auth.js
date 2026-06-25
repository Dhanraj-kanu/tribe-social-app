import express from 'express';
import { signup, login, getMe, forgotPassword, verifyOTP, resetPassword, verifyEmail } from '../controllers/authController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', auth, getMe);
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);
router.post('/verify-email', verifyEmail);

export default router;
