import express from 'express';
import {
  getConversations,
  createConversation,
  createGroupChat,
  getMessages,
  sendMessage,
  deleteMessage,
  editMessage,
  addGroupMember,
  leaveGroup,
  removeGroupMember,
  startMeeting,
  endMeeting
} from '../controllers/chatController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.get('/conversations', auth, getConversations);
router.post('/conversations', auth, createConversation);
router.post('/groups', auth, createGroupChat);
router.get('/messages/:conversationId', auth, getMessages);
router.post('/messages', auth, upload.single('file'), sendMessage);
router.delete('/messages/:id', auth, deleteMessage);
router.put('/messages/:id', auth, editMessage);
router.post('/groups/:id/members', auth, addGroupMember);
router.delete('/groups/:id/members/:userId', auth, removeGroupMember);
router.post('/groups/:id/leave', auth, leaveGroup);
router.post('/groups/:id/meeting/start', auth, startMeeting);
router.post('/groups/:id/meeting/end', auth, endMeeting);

export default router;
