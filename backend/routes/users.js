import express from 'express';
import {
  getUserProfile,
  updateProfile,
  searchUsers,
  followUser,
  unfollowUser,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriendRequests,
  getNotifications,
  markNotificationsRead,
  getAllUsers
} from '../controllers/userController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Static routes MUST come before parameterized routes
router.get('/search', auth, searchUsers);
router.get('/friend-requests', auth, getFriendRequests);
router.get('/notifications', auth, getNotifications);
router.put('/notifications/read', auth, markNotificationsRead);
router.put('/profile', auth, upload.fields([
  { name: 'profilePhoto', maxCount: 1 },
  { name: 'coverPhoto', maxCount: 1 }
]), updateProfile);

// Friend request accept/reject - MUST be before /:id routes
router.post('/friend-request/:id/accept', auth, acceptFriendRequest);
router.post('/friend-request/:id/reject', auth, rejectFriendRequest);

// Parameterized routes
router.get('/', auth, getAllUsers);
router.get('/:id', auth, getUserProfile);
router.post('/:id/follow', auth, followUser);
router.post('/:id/unfollow', auth, unfollowUser);
router.post('/:id/friend-request', auth, sendFriendRequest);

export default router;
