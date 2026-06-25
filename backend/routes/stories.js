import express from 'express';
import { createStory, getStories, reactToStory, addReaction, commentOnStory, viewStory, editStory, deleteStory } from '../controllers/storyController.js';
import auth from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

router.post('/', auth, upload.single('image'), createStory);
router.get('/', auth, getStories);
router.put('/:id', auth, editStory);
router.delete('/:id', auth, deleteStory);
router.post('/:id/like', auth, reactToStory);
router.post('/:id/react', auth, addReaction);
router.post('/:id/comment', auth, commentOnStory);
router.post('/:id/view', auth, viewStory);

export default router;
