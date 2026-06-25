import User from '../models/User.js';
import FriendRequest from '../models/FriendRequest.js';
import Notification from '../models/Notification.js';
import { onlineUsers } from '../socket/socketHandler.js';
import { clearUserCache } from '../middleware/auth.js';

// @desc    Get user profile
// @route   GET /api/users/:id
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('followers', 'username fullName profilePhoto')
      .populate('following', 'username fullName profilePhoto')
      .populate('friends', 'username fullName profilePhoto isOnline');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
export const updateProfile = async (req, res) => {
  try {
    const { fullName, bio, username } = req.body;
    const updates = {};

    if (fullName) updates.fullName = fullName;
    if (bio !== undefined) updates.bio = bio;
    if (username) {
      const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existing) return res.status(400).json({ message: 'Username already taken' });
      updates.username = username;
    }

    if (req.files) {
      if (req.files.profilePhoto) {
        updates.profilePhoto = req.files.profilePhoto[0].path;
      }
      if (req.files.coverPhoto) {
        updates.coverPhoto = req.files.coverPhoto[0].path;
      }
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true })
      .populate('followers', 'username fullName profilePhoto')
      .populate('following', 'username fullName profilePhoto')
      .populate('friends', 'username fullName profilePhoto');

    res.json(user);
    clearUserCache(req.user._id);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search users
// @route   GET /api/users/search?q=query
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { fullName: { $regex: q, $options: 'i' } }
          ]
        },
        { fullName: { $ne: 'Unknown' } },
        { username: { $ne: '' } }
      ]
    }).select('username fullName profilePhoto bio isOnline').limit(20);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Follow a user
// @route   POST /api/users/:id/follow
export const followUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    const alreadyFollowing = req.user.following.includes(req.params.id);
    if (alreadyFollowing) {
      return res.status(400).json({ message: 'Already following this user' });
    }

    await User.findByIdAndUpdate(req.user._id, { $push: { following: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, { $push: { followers: req.user._id } });

    // Create notification
    const notification = await Notification.create({
      recipient: req.params.id,
      sender: req.user._id,
      type: 'follow',
      message: `${req.user.fullName} started following you`
    });

    const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');

    // Real-time socket notification
    const receiverSockets = onlineUsers.get(req.params.id);
    if (receiverSockets && receiverSockets.length > 0) {
      receiverSockets.forEach(sId => {
        req.io.to(sId).emit('new_notification', populatedNotification);
      });
    }

    res.json({ message: 'User followed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Unfollow a user
// @route   POST /api/users/:id/unfollow
export const unfollowUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't unfollow yourself" });
    }

    await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
    await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });

    res.json({ message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send friend request
// @route   POST /api/users/:id/friend-request
export const sendFriendRequest = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't send a friend request to yourself" });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: req.params.id },
        { sender: req.params.id, receiver: req.user._id }
      ]
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }

    const alreadyFriends = req.user.friends.includes(req.params.id);
    if (alreadyFriends) {
      return res.status(400).json({ message: 'Already friends' });
    }

    const friendRequest = await FriendRequest.create({
      sender: req.user._id,
      receiver: req.params.id
    });

    const notification = await Notification.create({
      recipient: req.params.id,
      sender: req.user._id,
      type: 'friend_request',
      message: `${req.user.fullName} sent you a friend request`
    });

    const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');

    // Real-time socket notification
    const receiverSockets = onlineUsers.get(req.params.id);
    if (receiverSockets && receiverSockets.length > 0) {
      receiverSockets.forEach(sId => {
        req.io.to(sId).emit('new_notification', populatedNotification);
      });
    }

    res.status(201).json(friendRequest);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Accept friend request
// @route   POST /api/users/friend-request/:id/accept
export const acceptFriendRequest = async (req, res) => {
  try {
    const friendRequest = await FriendRequest.findById(req.params.id);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    friendRequest.status = 'accepted';
    await friendRequest.save();

    // Add each other as friends
    await User.findByIdAndUpdate(friendRequest.sender, { $addToSet: { friends: friendRequest.receiver } });
    await User.findByIdAndUpdate(friendRequest.receiver, { $addToSet: { friends: friendRequest.sender } });

    const notification = await Notification.create({
      recipient: friendRequest.sender,
      sender: req.user._id,
      type: 'friend_accepted',
      message: `${req.user.fullName} accepted your friend request`
    });

    const populatedNotification = await notification.populate('sender', 'username fullName profilePhoto');

    // Real-time socket notification
    const receiverSockets = onlineUsers.get(friendRequest.sender.toString());
    if (receiverSockets && receiverSockets.length > 0) {
      receiverSockets.forEach(sId => {
        req.io.to(sId).emit('new_notification', populatedNotification);
      });
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reject friend request
// @route   POST /api/users/friend-request/:id/reject
export const rejectFriendRequest = async (req, res) => {
  try {
    const friendRequest = await FriendRequest.findById(req.params.id);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }

    if (friendRequest.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    friendRequest.status = 'rejected';
    await friendRequest.save();

    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending friend requests
// @route   GET /api/users/friend-requests
export const getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending'
    }).populate('sender', 'username fullName profilePhoto bio');

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get notifications
// @route   GET /api/users/notifications
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .populate('sender', 'username fullName profilePhoto')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/users/notifications/read
export const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    res.json({ message: 'Notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (for suggestions)
// @route   GET /api/users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ 
      _id: { $ne: req.user._id },
      fullName: { $ne: 'Unknown' },
      username: { $ne: '' }
    })
      .select('username fullName profilePhoto bio isOnline')
      .limit(50);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
