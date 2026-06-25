import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// @desc    Get all conversations for current user
// @route   GET /api/chat/conversations
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
      .populate('participants', 'username fullName profilePhoto isOnline lastSeen')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username fullName profilePhoto' }
      })
      .sort({ updatedAt: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or get 1-on-1 conversation
// @route   POST /api/chat/conversations
export const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;

    // Check for existing 1-on-1 conversation
    let conversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId], $size: 2 }
    })
      .populate('participants', 'username fullName profilePhoto isOnline lastSeen')
      .populate('lastMessage');

    if (conversation) {
      return res.json(conversation);
    }

    // Create new conversation
    conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      isGroup: false
    });

    conversation = await conversation.populate('participants', 'username fullName profilePhoto isOnline lastSeen');
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create group chat
// @route   POST /api/chat/groups
export const createGroupChat = async (req, res) => {
  try {
    const { participantIds, groupName } = req.body;

    if (!participantIds || participantIds.length < 1) {
      return res.status(400).json({ message: 'A group needs at least 1 other member' });
    }

    const allParticipants = [req.user._id, ...participantIds];

    let conversation = await Conversation.create({
      participants: allParticipants,
      isGroup: true,
      groupName: groupName || 'New Group',
      groupAdmin: req.user._id
    });

    conversation = await conversation.populate('participants', 'username fullName profilePhoto isOnline lastSeen');
    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get messages for a conversation
// @route   GET /api/chat/messages/:conversationId
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    const messages = await Message.find({ conversation: conversationId })
      .populate('sender', 'username fullName profilePhoto')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Mark messages as seen
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: req.user._id },
        readBy: { $nin: [req.user._id] }
      },
      { $addToSet: { readBy: req.user._id }, status: 'seen' }
    );

    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send a message
// @route   POST /api/chat/messages
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    let file = '';
    let fileType = '';
    
    if (req.file) {
      file = `/uploads/${req.file.filename}`;
      if (req.file.mimetype.startsWith('image/')) fileType = 'image';
      else if (req.file.mimetype.startsWith('video/')) fileType = 'video';
      else if (req.file.mimetype.startsWith('audio/')) fileType = 'audio';
      else if (req.file.mimetype === 'application/pdf') fileType = 'pdf';
      else fileType = 'other';
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.user._id,
      text,
      file,
      fileType,
      readBy: [req.user._id],
      deliveredTo: [req.user._id]
    });

    // Update conversation's lastMessage
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: message._id
    });

    const populatedMessage = await message.populate('sender', 'username fullName profilePhoto');
    res.status(201).json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a message
// @route   DELETE /api/chat/messages/:id
export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender can delete their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    await Message.findByIdAndDelete(req.params.id);

    // If this was the last message in the conversation, update lastMessage
    const latestMsg = await Message.findOne({ conversation: message.conversation })
      .sort({ createdAt: -1 });
    
    await Conversation.findByIdAndUpdate(message.conversation, {
      lastMessage: latestMsg ? latestMsg._id : null
    });

    res.json({ message: 'Message deleted', messageId: req.params.id, conversationId: message.conversation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Edit a message
// @route   PUT /api/chat/messages/:id
export const editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender can edit their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    // Can't edit call log messages
    if (message.callInfo && message.callInfo.callType) {
      return res.status(400).json({ message: 'Cannot edit call log messages' });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    const populatedMessage = await message.populate('sender', 'username fullName profilePhoto');
    res.json(populatedMessage);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add member to group
// @route   POST /api/chat/groups/:id/members
export const addGroupMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can add members' });
    }

    await Conversation.findByIdAndUpdate(req.params.id, {
      $addToSet: { participants: userId }
    });

    const updated = await Conversation.findById(req.params.id)
      .populate('participants', 'username fullName profilePhoto isOnline');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Leave group
// @route   POST /api/chat/groups/:id/leave
export const leaveGroup = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await Conversation.findByIdAndUpdate(req.params.id, {
      $pull: { participants: req.user._id }
    });

    res.json({ message: 'Left the group' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Remove member from group (Kick)
// @route   DELETE /api/chat/groups/:id/members/:userId
export const removeGroupMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can remove members' });
    }

    // Admin cannot kick themselves - they should use leaveGroup
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: 'Use leave group to exit' });
    }

    await Conversation.findByIdAndUpdate(req.params.id, {
      $pull: { participants: userId }
    });

    const updated = await Conversation.findById(req.params.id)
      .populate('participants', 'username fullName profilePhoto isOnline');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Start a group meeting
// @route   POST /api/chat/groups/:id/meeting/start
export const startMeeting = async (req, res) => {
  try {
    const { type } = req.body;
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only admin can start a meeting' });
    }

    conversation.activeMeeting = {
      isActive: true,
      type,
      startedBy: req.user._id,
      startTime: new Date()
    };

    await conversation.save();

    if (req.io) {
      req.io.to(req.params.id).emit('meeting_started', {
        conversationId: req.params.id,
        meeting: conversation.activeMeeting,
        startedByName: req.user.fullName
      });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    End a group meeting
// @route   POST /api/chat/groups/:id/meeting/end
export const endMeeting = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (conversation.groupAdmin.toString() !== req.user._id.toString() && 
        conversation.activeMeeting.startedBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to end meeting' });
    }

    conversation.activeMeeting = {
      isActive: false,
      type: null,
      startedBy: null,
      startTime: null
    };

    await conversation.save();

    if (req.io) {
      req.io.to(req.params.id).emit('meeting_ended', { conversationId: req.params.id });
    }

    res.json({ message: 'Meeting ended' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
