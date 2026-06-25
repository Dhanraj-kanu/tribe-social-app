import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';

// Store online users: userId -> [socketId1, socketId2, ...]
export const onlineUsers = new Map();

// Store pending/active calls: callerId -> { to, callType, startTime, conversationId }
const activeCalls = new Map();

const setupSocket = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication error'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`🟢 User connected: ${socket.user.fullName}`);

    // Set user online
    const userSockets = onlineUsers.get(userId) || [];
    userSockets.push(socket.id);
    onlineUsers.set(userId, userSockets);
    
    await User.findByIdAndUpdate(userId, { isOnline: true });
    
    // Broadcast online status
    io.emit('user_online', { userId, isOnline: true });

    // Join user's conversation rooms
    socket.on('join_conversations', (conversationIds) => {
      conversationIds.forEach(id => socket.join(id));
    });

    // Join a specific conversation room
    socket.on('join_conversation', (conversationId) => {
      socket.join(conversationId);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(conversationId);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      const { conversationId, text, file, fileType } = data;
      
      try {
        // Check which participants are online
        const conv = await Conversation.findById(conversationId);
        const onlineParticipants = [];
        conv.participants.forEach(pId => {
          const pid = pId.toString();
          if (pid !== userId && onlineUsers.has(pid)) {
            onlineParticipants.push(pId);
          }
        });

        // Determine initial status: delivered if any recipient is online, else sent
        const initialStatus = onlineParticipants.length > 0 ? 'delivered' : 'sent';

        const message = await Message.create({
          conversation: conversationId,
          sender: userId,
          text,
          file: file || '',
          fileType: fileType || '',
          status: initialStatus,
          readBy: [userId],
          deliveredTo: [userId, ...onlineParticipants]
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: message._id
        });

        const populatedMessage = await message.populate('sender', 'username fullName profilePhoto');

        // Send to all users in conversation room
        io.to(conversationId).emit('new_message', populatedMessage);
        
        // Send notification to offline or other-room users
        conv.participants.forEach(participantId => {
          const pId = participantId.toString();
          if (pId !== userId) {
            const participantSockets = onlineUsers.get(pId);
            if (participantSockets && participantSockets.length > 0) {
              participantSockets.forEach(sId => {
                io.to(sId).emit('message_notification', {
                  conversationId,
                  message: populatedMessage
                });
              });
            }
          }
        });
      } catch (error) {
        console.error('Failed to send message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Edit message
    socket.on('edit_message', async ({ messageId, text }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || message.sender.toString() !== userId) return;
        if (message.callInfo && message.callInfo.callType) return;

        message.text = text;
        message.isEdited = true;
        await message.save();

        const populatedMessage = await message.populate('sender', 'username fullName profilePhoto');
        io.to(message.conversation.toString()).emit('message_edited', populatedMessage);
      } catch (error) {
        console.error('Edit message error:', error);
      }
    });

    // Delete message
    socket.on('delete_message', async ({ messageId, conversationId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message || message.sender.toString() !== userId) return;

        await Message.findByIdAndDelete(messageId);

        const latestMsg = await Message.findOne({ conversation: conversationId }).sort({ createdAt: -1 });
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: latestMsg ? latestMsg._id : null
        });

        io.to(conversationId).emit('message_deleted', { messageId, conversationId });
      } catch (error) {
        console.error('Delete message error:', error);
      }
    });

    // Typing indicators
    socket.on('typing_start', ({ conversationId }) => {
      socket.to(conversationId).emit('user_typing', {
        conversationId,
        userId,
        fullName: socket.user.fullName
      });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(conversationId).emit('user_stop_typing', {
        conversationId,
        userId
      });
    });

    // Message delivered
    socket.on('message_delivered', async ({ messageId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { deliveredTo: userId },
          status: 'delivered'
        });
        const msg = await Message.findById(messageId);
        if (msg) {
          io.to(msg.conversation.toString()).emit('message_status_update', {
            messageId,
            status: 'delivered',
            userId
          });
        }
      } catch (error) {
        console.error('Delivery update error:', error);
      }
    });

    // Message seen
    socket.on('message_seen', async ({ messageId, conversationId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: userId },
          status: 'seen'
        });
        io.to(conversationId).emit('message_status_update', {
          messageId,
          status: 'seen',
          userId
        });
      } catch (error) {
        console.error('Seen update error:', error);
      }
    });

    // Mark conversation as read
    socket.on('mark_conversation_read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            readBy: { $nin: [userId] }
          },
          { $addToSet: { readBy: userId }, status: 'seen' }
        );
        socket.to(conversationId).emit('conversation_read', {
          conversationId,
          userId
        });
      } catch (error) {
        console.error('Mark read error:', error);
      }
    });

    // Friend request notifications
    socket.on('send_friend_request', ({ receiverId, senderName }) => {
      const receiverSockets = onlineUsers.get(receiverId);
      if (receiverSockets && receiverSockets.length > 0) {
        receiverSockets.forEach(sId => {
          io.to(sId).emit('new_friend_request', {
            senderId: userId,
            senderName
          });
        });
      }
    });

    // New post notification
    socket.on('new_post', (post) => {
      socket.broadcast.emit('feed_update', post);
    });

    // Like/comment real-time update
    socket.on('post_interaction', (data) => {
      socket.broadcast.emit('post_updated', data);
    });

    // ========================
    // VOICE & VIDEO CALLING
    // ========================

    // Helper: find or create a 1-on-1 conversation between two users
    async function findOrCreateConversation(userA, userB) {
      let conv = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [userA, userB], $size: 2 }
      });
      if (!conv) {
        conv = await Conversation.create({
          participants: [userA, userB],
          isGroup: false
        });
      }
      return conv;
    }

    // Helper: save call log message and notify both users
    async function saveCallLog(callerId, receiverId, callType, callStatus, duration = 0) {
      try {
        const conv = await findOrCreateConversation(callerId, receiverId);

        // Create call log message (sender = caller)
        const message = await Message.create({
          conversation: conv._id,
          sender: callerId,
          text: '',
          callInfo: {
            callType,
            callStatus,
            duration
          },
          readBy: [callerId],
          deliveredTo: [callerId]
        });

        // Update conversation's lastMessage
        await Conversation.findByIdAndUpdate(conv._id, {
          lastMessage: message._id
        });

        const populatedMessage = await message.populate('sender', 'username fullName profilePhoto');

        // Emit to both users so it appears in their chat
        const callerSockets = onlineUsers.get(callerId);
        const receiverSockets = onlineUsers.get(receiverId);

        if (callerSockets) {
          callerSockets.forEach(sId => io.to(sId).emit('new_message', populatedMessage));
        }
        if (receiverSockets) {
          receiverSockets.forEach(sId => io.to(sId).emit('new_message', populatedMessage));
        }

        console.log(`📞 Call log saved: ${callType} ${callStatus} (${duration}s)`);
      } catch (error) {
        console.error('Save call log error:', error);
      }
    }

    // Helper: emit to all sockets of a user
    const emitToUser = (targetUserId, event, data) => {
      const sockets = onlineUsers.get(targetUserId);
      if (sockets && sockets.length > 0) {
        sockets.forEach(sId => io.to(sId).emit(event, data));
        return true;
      }
      return false;
    };

    // Initiate a call
    socket.on('call_user', async ({ to, offer, callType }) => {
      const receiverSockets = onlineUsers.get(to);
      if (receiverSockets && receiverSockets.length > 0) {
        // Track the active call
        activeCalls.set(userId, {
          to,
          callType,
          startTime: null, // set when answered
          initiatedAt: Date.now()
        });

        receiverSockets.forEach(sId => {
          io.to(sId).emit('incoming_call', {
            from: userId,
            callerName: socket.user.fullName,
            callerPhoto: socket.user.profilePhoto,
            offer,
            callType // 'voice' or 'video'
          });
        });
      } else {
        // User is offline — save as missed call
        await saveCallLog(userId, to, callType, 'missed', 0);
        socket.emit('call_failed', { reason: 'User is offline' });
      }
    });

    // Answer a call
    socket.on('call_answer', ({ to, answer }) => {
      // Update call tracking — mark start time
      const callData = activeCalls.get(to);
      if (callData) {
        callData.startTime = Date.now();
        activeCalls.set(to, callData);
      }

      emitToUser(to, 'call_answered', { from: userId, answer });
    });

    // Reject a call
    socket.on('call_reject', async ({ to }) => {
      // Get call info and save as rejected
      const callData = activeCalls.get(to);
      if (callData) {
        await saveCallLog(to, userId, callData.callType, 'rejected', 0);
        activeCalls.delete(to);
      }

      emitToUser(to, 'call_rejected', { from: userId });
    });

    // ICE candidate exchange
    socket.on('ice_candidate', ({ to, candidate }) => {
      emitToUser(to, 'ice_candidate', { from: userId, candidate });
    });

    // End call
    socket.on('call_end', async ({ to }) => {
      // Calculate duration and save call log
      // Check if this user was the caller
      let callData = activeCalls.get(userId);
      let callerId = userId;
      let receiverId = to;

      // Or maybe the other user was the caller
      if (!callData) {
        callData = activeCalls.get(to);
        if (callData) {
          callerId = to;
          receiverId = userId;
        }
      }

      if (callData) {
        const duration = callData.startTime
          ? Math.floor((Date.now() - callData.startTime) / 1000)
          : 0;
        const status = callData.startTime ? 'ended' : 'missed';
        await saveCallLog(callerId, receiverId, callData.callType, status, duration);
        activeCalls.delete(callerId);
      }

      emitToUser(to, 'call_ended', { from: userId });
    });

    // ========================
    // GROUP MEETINGS
    // ========================

    socket.on('join_meeting', ({ conversationId }) => {
      socket.join(`meeting:${conversationId}`);
      socket.to(`meeting:${conversationId}`).emit('participant_joined', { 
        userId, 
        fullName: socket.user.fullName,
        profilePhoto: socket.user.profilePhoto
      });
      console.log(`📡 Participant ${socket.user.fullName} joined meeting ${conversationId}`);
    });

    socket.on('meeting_signal', ({ conversationId, to, signal }) => {
      // Direct signal to another participant in the meeting
      const targetSockets = onlineUsers.get(to);
      if (targetSockets) {
        targetSockets.forEach(sId => {
          io.to(sId).emit('meeting_signal', { 
            from: userId, 
            fullName: socket.user.fullName,
            profilePhoto: socket.user.profilePhoto,
            signal 
          });
        });
      }
    });

    socket.on('leave_meeting', ({ conversationId }) => {
      socket.leave(`meeting:${conversationId}`);
      socket.to(`meeting:${conversationId}`).emit('participant_left', { userId });
      console.log(`📡 Participant ${socket.user.fullName} left meeting ${conversationId}`);
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`🔴 User disconnected: ${socket.user.fullName}`);

      // End any active call this user was in
      const callData = activeCalls.get(userId);
      if (callData) {
        const duration = callData.startTime
          ? Math.floor((Date.now() - callData.startTime) / 1000)
          : 0;
        const status = callData.startTime ? 'ended' : 'missed';
        await saveCallLog(userId, callData.to, callData.callType, status, duration);
        activeCalls.delete(userId);

        // Notify the other user
        emitToUser(callData.to, 'call_ended', { from: userId });
      }

      // Update onlineUsers map
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        const remainingSockets = userSockets.filter(id => id !== socket.id);
        if (remainingSockets.length > 0) {
          onlineUsers.set(userId, remainingSockets);
        } else {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { 
            isOnline: false, 
            lastSeen: new Date() 
          });
          io.emit('user_online', { userId, isOnline: false });
        }
      }
    });
  });
};

export default setupSocket;
