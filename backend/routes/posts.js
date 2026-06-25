import express from 'express';
import {
  createPost,
  getFeed,
  getAllPosts,
  getUserPosts,
  toggleLike,
  addComment,
  editComment,
  deleteComment,
  toggleCommentLike,
  replyToComment,
  toggleReplyLike,
  deletePost,
  toggleSavePost,
  getSavedPosts
} from '../controllers/postController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/', auth, upload.single('image'), createPost);
router.get('/feed', auth, getFeed);
router.get('/saved', auth, getSavedPosts);
router.get('/', auth, getAllPosts);
router.get('/user/:userId', auth, getUserPosts);
router.post('/:id/like', auth, toggleLike);
router.post('/:id/comment', auth, addComment);
router.put('/:id/comment/:commentId', auth, editComment);
router.delete('/:id/comment/:commentId', auth, deleteComment);
router.post('/:id/comment/:commentId/like', auth, toggleCommentLike);
router.post('/:id/comment/:commentId/reply', auth, replyToComment);
router.post('/:id/comment/:commentId/reply/:replyId/like', auth, toggleReplyLike);
router.post('/:id/save', auth, toggleSavePost);
router.delete('/:id', auth, deletePost);

export default router;
