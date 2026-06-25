import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';
import { Bell, MessageSquare, UserPlus, Heart, MessageCircle } from 'lucide-react';

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [popups, setPopups] = useState([]);

  const addPopup = useCallback((notification) => {
    const id = Date.now();
    setPopups(prev => [...prev, { ...notification, id }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 5000);
  }, []);

  const removePopup = useCallback((id) => {
    setPopups(prev => prev.filter(p => p.id !== id));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !user) return;

    // Handle standard notifications (likes, comments, friend requests)
    const handleNewNotification = (notification) => {
      addPopup({
        type: notification.type,
        title: getTitle(notification),
        message: notification.message,
        sender: notification.sender
      });
    };

    // Handle new message notifications when not in that chat
    const handleMessageNotification = ({ conversationId, message }) => {
      // Check if we're on the chat page and in this conversation? 
      // Actually, we'll let the provider handle it. 
      // If the message is from someone else, show popup.
      if (message.sender._id !== user._id) {
        addPopup({
          type: 'message',
          title: message.sender.fullName,
          message: message.text || 'Sent an image',
          sender: message.sender,
          conversationId
        });
      }
    };

    const getTitle = (n) => {
      switch (n.type) {
        case 'friend_request': return 'New Friend Request';
        case 'friend_accepted': return 'Request Accepted';
        case 'like': return 'New Like';
        case 'comment': return 'New Comment';
        case 'follow': return 'New Follower';
        default: return 'Notification';
      }
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('message_notification', handleMessageNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('message_notification', handleMessageNotification);
    };
  }, [user, addPopup]);

  return (
    <NotificationContext.Provider value={{ addPopup, popups, removePopup }}>
      {children}
      
      {/* Global Notification Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        {popups.map((popup) => (
          <NotificationPopup key={popup.id} popup={popup} onClose={() => removePopup(popup.id)} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const NotificationPopup = ({ popup, onClose }) => {
  const getIcon = () => {
    switch (popup.type) {
      case 'message': return <MessageSquare className="w-5 h-5 text-tribe-400" />;
      case 'friend_request': return <UserPlus className="w-5 h-5 text-emerald-400" />;
      case 'like': return <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />;
      case 'comment': return <MessageCircle className="w-5 h-5 text-sky-400" />;
      default: return <Bell className="w-5 h-5 text-tribe-400" />;
    }
  };

  return (
    <div className="w-80 glass p-4 rounded-2xl shadow-2xl pointer-events-auto animate-slide-left flex gap-3 items-start border-l-4 border-l-tribe-500 cursor-pointer hover:bg-dark-800/80 transition-all">
      <div className="flex-shrink-0 mt-1">
        {popup.sender?.profilePhoto ? (
          <img src={popup.sender.profilePhoto} alt="" className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center text-white font-bold">
            {popup.sender?.fullName?.charAt(0)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-white truncate">{popup.title}</p>
          {getIcon()}
        </div>
        <p className="text-xs text-dark-300 mt-1 line-clamp-2">{popup.message}</p>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-dark-500 hover:text-white">&times;</button>
    </div>
  );
};
