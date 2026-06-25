import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userAPI, chatAPI } from '../utils/api';
import { Search as SearchIcon, UserPlus, MessageCircle, UserCheck, UserMinus, Check } from 'lucide-react';

const SearchPage = () => {
  const { user, loadUser } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionStates, setActionStates] = useState({}); // Track follow/request states per user

  useEffect(() => { loadAllUsers(); }, []);

  const loadAllUsers = async () => {
    try {
      const { data } = await userAPI.getAllUsers();
      setAllUsers(data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await userAPI.searchUsers(query);
        setResults(data);
      } catch (err) { console.error(err); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleFollow = async (userId) => {
    setActionStates(prev => ({ ...prev, [userId]: { ...prev[userId], followLoading: true } }));
    try {
      const isFollowing = user?.following?.some(f => (f._id || f) === userId);
      if (isFollowing) {
        await userAPI.unfollowUser(userId);
      } else {
        await userAPI.followUser(userId);
      }
      await loadUser();
      loadAllUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setActionStates(prev => ({ ...prev, [userId]: { ...prev[userId], followLoading: false } }));
    }
  };

  const handleFriendRequest = async (userId) => {
    setActionStates(prev => ({ ...prev, [userId]: { ...prev[userId], requestLoading: true } }));
    try {
      await userAPI.sendFriendRequest(userId);
      setActionStates(prev => ({ ...prev, [userId]: { ...prev[userId], requestSent: true, requestLoading: false } }));
    } catch (err) {
      alert(err.response?.data?.message || 'Error');
      setActionStates(prev => ({ ...prev, [userId]: { ...prev[userId], requestLoading: false } }));
    }
  };

  const handleMessage = async (userId) => {
    try {
      await chatAPI.createConversation(userId);
      navigate('/chat');
    } catch (err) { console.error(err); }
  };

  const displayUsers = query.trim() ? results : allUsers;

  return (
    <div className="max-w-2xl mx-auto py-6 px-4" id="search-page">
      <h1 className="text-2xl font-bold text-dark-50 mb-6">Explore</h1>

      <div className="relative mb-6">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          className="input-field pl-12 py-3.5"
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          id="search-input"
        />
      </div>

      {loading && <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-tribe-500 border-t-transparent rounded-full animate-spin"></div></div>}

      <div className="space-y-3">
        {!query.trim() && displayUsers.length > 0 && <h2 className="text-sm font-semibold text-dark-400 mb-3 uppercase tracking-wider">Suggested for you</h2>}
        {displayUsers.map(u => {
          const isFollowing = user?.following?.some(f => (f._id || f) === u._id);
          const isFriend = user?.friends?.some(f => (f._id || f) === u._id);
          const state = actionStates[u._id] || {};

          return (
            <div key={u._id} className="card flex items-center gap-4 hover:border-tribe-500/30 cursor-pointer" onClick={() => navigate(`/profile/${u._id}`)}>
              <div className="relative">
                {u.profilePhoto ? (
                  <img src={u.profilePhoto} alt="" className="w-12 h-12 avatar" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-dark-50 font-bold">{u.fullName?.charAt(0)?.toUpperCase()}</div>
                )}
                {u.isOnline && <div className="online-dot" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-dark-50 text-sm">{u.fullName}</h3>
                <p className="text-xs text-dark-400">@{u.username}</p>
                {u.bio && <p className="text-xs text-dark-300 truncate mt-0.5">{u.bio}</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                {/* Follow/Unfollow */}
                <button
                  onClick={() => handleFollow(u._id)}
                  disabled={state.followLoading}
                  className={`p-2 rounded-xl transition ${isFollowing ? 'bg-dark-600/50 text-dark-300 hover:text-rose-400' : 'hover:bg-tribe-600/20 text-tribe-400'}`}
                  title={isFollowing ? 'Unfollow' : 'Follow'}
                >
                  {state.followLoading ? (
                    <div className="w-4 h-4 border-2 border-tribe-400/30 border-t-tribe-400 rounded-full animate-spin" />
                  ) : isFollowing ? (
                    <UserMinus className="w-4 h-4" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                </button>

                {/* Friend Request */}
                {!isFriend && !state.requestSent ? (
                  <button
                    onClick={() => handleFriendRequest(u._id)}
                    disabled={state.requestLoading}
                    className="p-2 hover:bg-emerald-600/20 rounded-xl transition text-emerald-400"
                    title="Send Friend Request"
                  >
                    {state.requestLoading ? (
                      <div className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                  </button>
                ) : state.requestSent ? (
                  <span className="p-2 text-emerald-400" title="Request Sent"><Check className="w-4 h-4" /></span>
                ) : isFriend ? (
                  <span className="p-2 text-emerald-400" title="Friends"><UserCheck className="w-4 h-4" /></span>
                ) : null}

                {/* Message */}
                <button onClick={() => handleMessage(u._id)} className="p-2 hover:bg-dark-600/50 rounded-xl transition text-dark-300" title="Message">
                  <MessageCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
        {displayUsers.length === 0 && !loading && (
          <div className="text-center py-10 text-dark-400"><p>{query ? 'No users found' : 'No suggestions available'}</p></div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
