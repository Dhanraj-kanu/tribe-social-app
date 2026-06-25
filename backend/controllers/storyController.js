import Story from '../models/Story.js';
import User from '../models/User.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @desc    Create a story
// @route   POST /api/stories
export const createStory = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Story must have an image' });
    }

    const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    
    const storyData = {
      user: req.user._id,
      media: `/uploads/${req.file.filename}`,
      mediaType,
      caption: req.body.caption || ''
    };

    // Parse text overlay
    if (req.body.textOverlay) {
      try { storyData.textOverlay = JSON.parse(req.body.textOverlay); } catch(e) {}
    }
    // Parse stickers
    if (req.body.stickers) {
      try { storyData.stickers = JSON.parse(req.body.stickers); } catch(e) {}
    }
    // Parse music
    if (req.body.music) {
      try { storyData.music = JSON.parse(req.body.music); } catch(e) {}
    }

    const story = await Story.create(storyData);
    const populatedStory = await story.populate('user', 'username fullName profilePhoto');
    res.status(201).json(populatedStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get stories from following + own
// @route   GET /api/stories
export const getStories = async (req, res) => {
  try {
    const following = req.user.following || [];
    const usersToFetch = [...following, req.user._id];

    const stories = await Story.find({ user: { $in: usersToFetch } })
      .populate('user', 'username fullName profilePhoto')
      .populate('viewers', 'username fullName profilePhoto')
      .populate('likes', 'username fullName profilePhoto')
      .populate('comments.user', 'username fullName profilePhoto')
      .populate('reactions.user', 'username fullName profilePhoto')
      .sort({ createdAt: -1 });

    const grouped = stories.reduce((acc, story) => {
      const userId = story.user._id.toString();
      if (!acc[userId]) {
        acc[userId] = { user: story.user, stories: [] };
      }
      acc[userId].stories.push(story);
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike a story
// @route   POST /api/stories/:id/like
export const reactToStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const index = story.likes.findIndex(id => id.toString() === req.user._id.toString());
    if (index === -1) {
      story.likes.push(req.user._id);
    } else {
      story.likes.splice(index, 1);
    }

    await story.save();
    const updatedStory = await Story.findById(req.params.id)
      .populate('user', 'username fullName profilePhoto')
      .populate('comments.user', 'username fullName profilePhoto');
    res.json(updatedStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add emoji reaction to a story
// @route   POST /api/stories/:id/react
export const addReaction = async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'Emoji is required' });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    // Remove existing reaction from this user, then add new one
    story.reactions = story.reactions.filter(r => r.user.toString() !== req.user._id.toString());
    story.reactions.push({ user: req.user._id, emoji });

    await story.save();
    const updatedStory = await Story.findById(req.params.id)
      .populate('reactions.user', 'username fullName profilePhoto');
    res.json(updatedStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Comment on a story
// @route   POST /api/stories/:id/comment
export const commentOnStory = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment text is required' });

    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    story.comments.push({ user: req.user._id, text });

    await story.save();
    const updatedStory = await Story.findById(req.params.id)
      .populate('user', 'username fullName profilePhoto')
      .populate('comments.user', 'username fullName profilePhoto');
    res.json(updatedStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    View a story
// @route   POST /api/stories/:id/view
export const viewStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (!story.viewers.includes(req.user._id) && story.user.toString() !== req.user._id.toString()) {
      story.viewers.push(req.user._id);
      await story.save();
    }
    
    res.json({ message: 'View recorded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit a story
// @route   PUT /api/stories/:id
export const editStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this story' });
    }

    const { caption, textOverlay, stickers, music } = req.body;
    if (caption !== undefined) story.caption = caption;
    if (textOverlay !== undefined) story.textOverlay = textOverlay;
    if (stickers !== undefined) story.stickers = stickers;
    if (music !== undefined) story.music = music;

    await story.save();
    const updatedStory = await Story.findById(req.params.id)
      .populate('user', 'username fullName profilePhoto')
      .populate('viewers', 'username fullName profilePhoto')
      .populate('likes', 'username fullName profilePhoto')
      .populate('comments.user', 'username fullName profilePhoto');
    res.json(updatedStory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a story
// @route   DELETE /api/stories/:id
export const deleteStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    if (story.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this story' });
    }

    if (story.media) {
      const mediaPath = path.join(__dirname, '..', story.media);
      if (fs.existsSync(mediaPath)) {
        fs.unlinkSync(mediaPath);
      }
    }

    await Story.findByIdAndDelete(req.params.id);
    res.json({ message: 'Story deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
