import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { chatAPI } from '../utils/api';
import { getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const ChatContext = createContext(null);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatAPI.getConversations();
      setConversations(data);
    } catch (err) {
      console.error('Load conversations error:', err);
    }
  }, []);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId) => {
    try {
      const { data } = await chatAPI.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error('Load messages error:', err);
    }
  }, []);

  // Socket event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // Join all conversation rooms
    const joinRooms = () => {
      if (conversations.length > 0) {
        socket.emit('join_conversations', conversations.map(c => c._id));
      }
    };

    const handleReconnect = () => {
      console.log('🔄 Reconnected to chat server, syncing data...');
      joinRooms();
      loadConversations();
      if (activeConversation) {
        loadMessages(activeConversation._id);
      }
    };

    joinRooms(); // Join initially
    socket.on('connect', handleReconnect); // Full sync on reconnect

    // New message handler
    const handleNewMessage = (message) => {
      // Mark as delivered if it's from someone else
      if (message.sender?._id !== user?._id && message.sender !== user?._id) {
        markAsDelivered(message._id);
      }

      // Update messages if it's the active conversation
      if (activeConversation?._id === message.conversation) {
        setMessages(prev => {
          // Avoid duplicates by ID
          if (prev.find(m => m._id === message._id)) return prev;
          
          // If this is our own message, remove the optimistic 'sending' version
          const isMine = (message.sender?._id || message.sender) === user?._id;
          if (isMine) {
            const filtered = prev.filter(m => 
              !(m.status === 'sending' && m.text === message.text)
            );
            return [...filtered, message];
          }
          
          return [...prev, message];
        });
      }

      // Update conversation list
      setConversations(prev => {
        const existingIdx = prev.findIndex(c => c._id === message.conversation);
        if (existingIdx > -1) {
          // Update existing conversation
          const updated = [...prev];
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            lastMessage: message, 
            updatedAt: new Date().toISOString() 
          };
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          // If it's a new conversation, we should ideally fetch it or reload all
          loadConversations();
          return prev;
        }
      });
    };

    // Message notification (for conversations you're not currently viewing)
    const handleMessageNotification = ({ conversationId, message }) => {
      // Mark as delivered
      if (message.sender?._id !== user?._id && message.sender !== user?._id) {
        markAsDelivered(message._id);
      }

      setConversations(prev => {
        const existingIdx = prev.findIndex(c => c._id === conversationId);
        if (existingIdx > -1) {
          const updated = [...prev];
          updated[existingIdx] = { 
            ...updated[existingIdx], 
            lastMessage: message, 
            updatedAt: new Date().toISOString() 
          };
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } else {
          loadConversations();
          return prev;
        }
      });
    };

    // Typing indicators
    const handleTyping = ({ conversationId, userId, fullName }) => {
      if (userId === user._id) return;
      setTypingUsers(prev => ({
        ...prev,
        [conversationId]: { userId, fullName }
      }));
    };

    const handleStopTyping = ({ conversationId, userId }) => {
      setTypingUsers(prev => {
        const updated = { ...prev };
        if (updated[conversationId]?.userId === userId) {
          delete updated[conversationId];
        }
        return updated;
      });
    };

    // Online status
    const handleOnlineStatus = ({ userId, isOnline }) => {
      setOnlineUsers(prev => ({ ...prev, [userId]: isOnline }));
    };

    // Message status updates
    const handleStatusUpdate = ({ messageId, status }) => {
      setMessages(prev =>
        prev.map(msg => msg._id === messageId ? { ...msg, status } : msg)
      );
    };

    // Conversation read
    const handleConversationRead = ({ conversationId }) => {
      if (activeConversation?._id === conversationId) {
        setMessages(prev =>
          prev.map(msg => ({ ...msg, status: 'seen' }))
        );
      }
    };

    // Message edited
    const handleMessageEdited = (editedMessage) => {
      setMessages(prev => prev.map(msg => 
        msg._id === editedMessage._id ? editedMessage : msg
      ));
      setConversations(prev => prev.map(conv => {
        if (conv.lastMessage?._id === editedMessage._id) {
          return { ...conv, lastMessage: editedMessage };
        }
        return conv;
      }));
    };

    // Message deleted
    const handleMessageDeleted = ({ messageId, conversationId }) => {
      setMessages(prev => prev.filter(msg => msg._id !== messageId));
      loadConversations(); // Reload conversations to get the updated lastMessage
    };

    socket.on('message_deleted', handleMessageDeleted);

    // Meeting events
    socket.on('meeting_started', ({ conversationId, meeting, startedByName }) => {
      setConversations(prev => prev.map(c => 
        c._id === conversationId ? { ...c, activeMeeting: meeting } : c
      ));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(prev => ({ ...prev, activeMeeting: meeting }));
      }
    });

    socket.on('meeting_ended', ({ conversationId }) => {
      setConversations(prev => prev.map(c => 
        c._id === conversationId ? { ...c, activeMeeting: { isActive: false } } : c
      ));
      if (activeConversation?._id === conversationId) {
        setActiveConversation(prev => ({ ...prev, activeMeeting: { isActive: false } }));
      }
    });

    return () => {
      socket.off('connect', handleReconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('message_notification', handleMessageNotification);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
      socket.off('user_online', handleOnlineStatus);
      socket.off('message_status_update', handleStatusUpdate);
      socket.off('conversation_read', handleConversationRead);
      socket.off('message_edited', handleMessageEdited);
      socket.off('message_deleted', handleMessageDeleted);
    };
  }, [user, conversations.length, activeConversation]);

  // Send message via socket
  const sendMessage = useCallback((conversationId, text, file = '', fileType = '') => {
    const socket = getSocket();
    if (!socket) {
      console.error('Socket not connected');
      return;
    }

    // Optimistic update
    const tempId = Date.now().toString();
    const optimisticMessage = {
      _id: tempId,
      conversation: conversationId,
      sender: user, // full user object for avatar etc
      text,
      file,
      fileType,
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    if (activeConversation?._id === conversationId) {
      setMessages(prev => [...prev, optimisticMessage]);
    }

    socket.emit('send_message', { conversationId, text, file, fileType });
  }, [user, activeConversation]);

  // Send file via REST
  const sendFile = useCallback(async (conversationId, text, fileObj) => {
    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('text', text);
      formData.append('file', fileObj);

      // Optimistic preview
      const previewUrl = URL.createObjectURL(fileObj);
      let fType = 'other';
      if (fileObj.type.startsWith('image/')) fType = 'image';
      else if (fileObj.type.startsWith('video/')) fType = 'video';
      else if (fileObj.type === 'application/pdf') fType = 'pdf';

      sendMessage(conversationId, text, previewUrl, fType);

      const { data } = await chatAPI.sendMessage(formData);
      // The socket will receive the real message and replace the optimistic one
      return data;
    } catch (err) {
      console.error('Send file error:', err);
      // Remove optimistic message on error?
    }
  }, [sendMessage]);

  // Edit message
  const editMessage = useCallback((messageId, text) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('edit_message', { messageId, text });
  }, []);

  // Delete message
  const deleteMessage = useCallback((messageId, conversationId) => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('delete_message', { messageId, conversationId });
  }, []);

  // Typing control
  const startTyping = useCallback((conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit('typing_start', { conversationId });
  }, []);

  const stopTyping = useCallback((conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit('typing_stop', { conversationId });
  }, []);

  // Mark as delivered
  const markAsDelivered = useCallback((messageId) => {
    const socket = getSocket();
    if (socket) socket.emit('message_delivered', { messageId });
  }, []);

  // Mark conversation as read
  const markAsRead = useCallback((conversationId) => {
    const socket = getSocket();
    if (socket) socket.emit('mark_conversation_read', { conversationId });
  }, []);

  const kickMember = useCallback(async (conversationId, userId) => {
    try {
      const { data } = await chatAPI.removeGroupMember(conversationId, userId);
      setActiveConversation(data);
      loadConversations();
    } catch (err) { console.error('Kick error:', err); }
  }, [loadConversations]);

  const leaveGroup = useCallback(async (conversationId) => {
    try {
      await chatAPI.leaveGroup(conversationId);
      setActiveConversation(null);
      loadConversations();
    } catch (err) { console.error('Leave group error:', err); }
  }, [loadConversations]);

  const startGroupMeeting = useCallback(async (conversationId, type) => {
    try {
      const { data } = await chatAPI.startMeeting(conversationId, type);
      setActiveConversation(data);
      loadConversations();
    } catch (err) { console.error('Start meeting error:', err); }
  }, [loadConversations]);

  const endGroupMeeting = useCallback(async (conversationId) => {
    try {
      await chatAPI.endMeeting(conversationId);
      loadConversations();
    } catch (err) { console.error('End meeting error:', err); }
  }, [loadConversations]);

  return (
    <ChatContext.Provider value={{
      conversations,
      activeConversation,
      messages,
      typingUsers,
      onlineUsers,
      setActiveConversation,
      loadConversations,
      loadMessages,
      sendMessage,
      sendFile,
      editMessage,
      deleteMessage,
      startTyping,
      stopTyping,
      markAsRead,
      kickMember,
      leaveGroup,
      startGroupMeeting,
      endGroupMeeting,
      setMessages,
      setConversations
    }}>
      {children}
    </ChatContext.Provider>
  );
};
