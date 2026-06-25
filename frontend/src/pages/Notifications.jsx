import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Users } from 'lucide-react';
import { format } from 'timeago.js';

const iconMap = {
  friend_request: UserPlus,
  friend_accepted: UserCheck,
  like: Heart,
  comment: MessageCircle,
  follow: Users,
  message: MessageCircle,
};

const colorMap = {
  friend_request: 'text-tribe-400 bg-tribe-500/20',
  friend_accepted: 'text-emerald-400 bg-emerald-500/20',
  like: 'text-rose-400 bg-rose-500/20',
  comment: 'text-blue-400 bg-blue-500/20',
  follow: 'text-purple-400 bg-purple-500/20',
  message: 'text-amber-400 bg-amber-500/20',
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    userAPI.markNotificationsRead();
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await userAPI.getNotifications();
      setNotifications(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="h-7 w-44 bg-dark-800 rounded-lg mb-6 animate-pulse" />
      {[1,2,3,4,5].map(i => (
        <div key={i} className="card flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-dark-700 animate-pulse" />
          <div className="flex-1"><div className="h-3 w-3/4 bg-dark-700 rounded animate-pulse mb-1.5" /><div className="h-2.5 w-16 bg-dark-800 rounded animate-pulse" /></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4" id="notifications-page">
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3"><Bell className="w-6 h-6 text-tribe-400" />Notifications</h1>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-20 text-dark-400">
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">No notifications</p>
            <p className="text-sm">You're all caught up!</p>
          </div>
        ) : notifications.map(notif => {
          const Icon = iconMap[notif.type] || Bell;
          const color = colorMap[notif.type] || 'text-dark-400 bg-dark-700/50';
          return (
            <div key={notif._id} className={`card flex items-center gap-4 py-4 ${!notif.read ? 'border-tribe-500/30' : ''}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {notif.sender?.profilePhoto ? (
                    <img src={notif.sender.profilePhoto} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white text-xs font-bold">{notif.sender?.fullName?.charAt(0)?.toUpperCase()}</div>
                  )}
                  <p className="text-sm text-dark-200">{notif.message}</p>
                </div>
                <p className="text-xs text-dark-400 mt-1">{format(notif.createdAt)}</p>
              </div>
              {!notif.read && <div className="w-2.5 h-2.5 bg-tribe-500 rounded-full flex-shrink-0"></div>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Notifications;
