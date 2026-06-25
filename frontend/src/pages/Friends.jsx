import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, chatAPI } from '../utils/api';
import { MessageCircle, UserMinus, Users } from 'lucide-react';

const Friends = () => {
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFriends(); }, []);

  const loadFriends = async () => {
    try {
      const { data } = await userAPI.getProfile(user._id);
      setFriends(data.friends || []);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleMessage = async (friendId) => {
    try {
      await chatAPI.createConversation(friendId);
      navigate('/chat');
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="h-7 w-40 bg-dark-800 rounded-lg mb-6 animate-pulse" />
      {[1,2,3,4].map(i => (
        <div key={i} className="card flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-full bg-dark-700 animate-pulse" />
          <div className="flex-1"><div className="h-3.5 w-28 bg-dark-700 rounded mb-2 animate-pulse" /><div className="h-2.5 w-20 bg-dark-800 rounded animate-pulse" /></div>
          <div className="h-8 w-16 bg-dark-800 rounded-lg animate-pulse" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4" id="friends-page">
      <h1 className="text-2xl font-bold text-dark-50 mb-6 flex items-center gap-3"><Users className="w-6 h-6 text-tribe-400" />Friends <span className="text-dark-400 text-lg font-normal">({friends.filter(f => f.fullName !== 'Unknown' && f.username).length})</span></h1>

      <div className="space-y-3">
        {friends.filter(f => f.fullName !== 'Unknown' && f.username).length === 0 ? (
          <div className="text-center py-20 text-dark-400">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">No friends yet</p>
            <p className="text-sm">Start connecting with people from the Explore page!</p>
          </div>
        ) : friends.filter(f => f.fullName !== 'Unknown' && f.username).map(friend => (
          <div key={friend._id} className="card flex items-center gap-4">
            <div className="relative cursor-pointer" onClick={() => navigate(`/profile/${friend._id}`)}>
              {friend.profilePhoto ? (
                <img src={friend.profilePhoto} alt="" className="w-12 h-12 avatar" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-dark-50 font-bold">{friend.fullName?.charAt(0)?.toUpperCase()}</div>
              )}
              {friend.isOnline && <div className="online-dot" />}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/profile/${friend._id}`)}>
              <h3 className="font-semibold text-dark-50 text-sm">{friend.fullName}</h3>
              <p className="text-xs text-dark-400">@{friend.username}</p>
              <p className="text-xs mt-0.5">{friend.isOnline ? <span className="text-emerald-400">Online</span> : <span className="text-dark-500">Offline</span>}</p>
            </div>
            <button onClick={() => handleMessage(friend._id)} className="btn-secondary flex items-center gap-2 text-sm py-2"><MessageCircle className="w-4 h-4" />Chat</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Friends;
