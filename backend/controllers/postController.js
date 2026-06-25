import Post from '../models/Post.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { onlineUsers } from '../socket/socketHandler.js';

// Helper to populate a post fully (including replies) - uses lean() for speed
const populatePost = (query) => {
  return query
    .populate('author', 'username fullName profilePhoto bio')
    .populate('comments.user', 'username fullName profilePhoto')
    .populate('comments.replies.user', 'username fullName profilePhoto')
    .lean();
};

// @desc    Create a post
// @route   POST /api/posts
export const createPost = async (req, res) => {
  try {
    const { text } = req.body;
    let image = '';
    let mediaType = 'text';

    if (req.file) {
      image = req.file.path;
      mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    }

    if (!text && !image) {
      return res.status(400).json({ message: 'Post must have text or media' });
    }

    const post = await Post.create({
      author: req.user._id,
      text,
      image,
      mediaType
    });

    const populatedPost = {
      ...post.toObject(),
      author: {
        _id: req.user._id,
        fullName: req.user.fullName,
        username: req.user.username,
        profilePhoto: req.user.profilePhoto
      }
    };

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get feed posts (from following + own)
// @route   GET /api/posts/feed
export const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const feedUsers = [...req.user.following, req.user._id];

    const posts = await populatePost(
      Post.find({ author: { $in: feedUsers } })
    )
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all posts (explore)
// @route   GET /api/posts
export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const posts = await populatePost(Post.find())
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's posts
// @route   GET /api/posts/user/:userId
export const getUserPosts = async (req, res) => {
  try {
    const posts = await populatePost(
      Post.find({ author: req.params.userId })
    ).sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/unlike a post
// @route   POST /api/posts/:id/like
export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const isLiked = post.likes.includes(req.user._id);
    
    if (isLiked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
      // Notify post author
      if (post.author.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'like',
          post: post._id,
          message: `${req.user.fullName} liked your post`
        });

        const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');
        
        // Real-time socket notification
        const receiverSockets = onlineUsers.get(post.author.toString());
        if (receiverSockets && receiverSockets.length > 0) {
          receiverSockets.forEach(sId => {
            req.io.to(sId).emit('new_notification', populatedNotification);
          });
        }
      }
    }

    await post.save();
    const updatedPost = await populatePost(Post.findById(req.params.id));
    
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Comment on a post
// @route   POST /api/posts/:id/comment
export const addComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    post.comments.push({
      user: req.user._id,
      text: req.body.text
    });

    await post.save();

    // Notify post author
    if (post.author.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        message: `${req.user.fullName} commented on your post`
      });

      const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');

      // Real-time socket notification
      const receiverSockets = onlineUsers.get(post.author.toString());
      if (receiverSockets && receiverSockets.length > 0) {
        receiverSockets.forEach(sId => {
          req.io.to(sId).emit('new_notification', populatedNotification);
        });
      }
    }

    const updatedPost = await populatePost(Post.findById(req.params.id));
    
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit a comment
// @route   PUT /api/posts/:id/comment/:commentId
export const editComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    comment.text = req.body.text;
    await post.save();

    const updatedPost = await populatePost(Post.findById(req.params.id));
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a comment
// @route   DELETE /api/posts/:id/comment/:commentId
export const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // Allow comment owner OR post owner to delete
    if (comment.user.toString() !== req.user._id.toString() && post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    post.comments.pull(req.params.commentId);
    await post.save();

    const updatedPost = await populatePost(Post.findById(req.params.id));
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/unlike a comment
// @route   POST /api/posts/:id/comment/:commentId/like
export const toggleCommentLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const isLiked = comment.likes.includes(req.user._id);

    if (isLiked) {
      comment.likes.pull(req.user._id);
    } else {
      comment.likes.push(req.user._id);

      // Notify comment author
      if (comment.user.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: comment.user,
          sender: req.user._id,
          type: 'like',
          post: post._id,
          message: `${req.user.fullName} liked your comment`
        });

        const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');
        const receiverSockets = onlineUsers.get(comment.user.toString());
        if (receiverSockets && receiverSockets.length > 0) {
          receiverSockets.forEach(sId => {
            req.io.to(sId).emit('new_notification', populatedNotification);
          });
        }
      }
    }

    await post.save();
    const updatedPost = await populatePost(Post.findById(req.params.id));

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reply to a comment
// @route   POST /api/posts/:id/comment/:commentId/reply
export const replyToComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    comment.replies.push({
      user: req.user._id,
      text: req.body.text
    });

    await post.save();

    // Notify comment author about the reply
    if (comment.user.toString() !== req.user._id.toString()) {
      const notification = await Notification.create({
        recipient: comment.user,
        sender: req.user._id,
        type: 'comment',
        post: post._id,
        message: `${req.user.fullName} replied to your comment`
      });

      const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');
      const receiverSockets = onlineUsers.get(comment.user.toString());
      if (receiverSockets && receiverSockets.length > 0) {
        receiverSockets.forEach(sId => {
          req.io.to(sId).emit('new_notification', populatedNotification);
        });
      }
    }

    const updatedPost = await populatePost(Post.findById(req.params.id));
    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/unlike a reply
// @route   POST /api/posts/:id/comment/:commentId/reply/:replyId/like
export const toggleReplyLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = post.comments.id(req.params.commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const reply = comment.replies.id(req.params.replyId);
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }

    const isLiked = reply.likes.includes(req.user._id);

    if (isLiked) {
      reply.likes.pull(req.user._id);
    } else {
      reply.likes.push(req.user._id);

      // Notify reply author
      if (reply.user.toString() !== req.user._id.toString()) {
        const notification = await Notification.create({
          recipient: reply.user,
          sender: req.user._id,
          type: 'like',
          post: post._id,
          message: `${req.user.fullName} liked your reply`
        });

        const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');
        const receiverSockets = onlineUsers.get(reply.user.toString());
        if (receiverSockets && receiverSockets.length > 0) {
          receiverSockets.forEach(sId => {
            req.io.to(sId).emit('new_notification', populatedNotification);
          });
        }
      }
    }

    await post.save();
    const updatedPost = await populatePost(Post.findById(req.params.id));

    res.json(updatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle save post
// @route   POST /api/posts/:id/save
export const toggleSavePost = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isSaved = user.savedPosts.includes(req.params.id);

    if (isSaved) {
      user.savedPosts.pull(req.params.id);
    } else {
      user.savedPosts.push(req.params.id);
    }

    await user.save();
    res.json({ isSaved: !isSaved, savedPosts: user.savedPosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get saved posts
// @route   GET /api/posts/saved
export const getSavedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'savedPosts',
      populate: [
        { path: 'author', select: 'username fullName profilePhoto' },
        { path: 'comments.user', select: 'username fullName profilePhoto' },
        { path: 'comments.replies.user', select: 'username fullName profilePhoto' }
      ]
    });

    res.json(user.savedPosts.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
