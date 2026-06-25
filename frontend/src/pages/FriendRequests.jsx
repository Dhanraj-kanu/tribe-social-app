import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../utils/api';
import { Check, X, UserPlus, Clock } from 'lucide-react';

const FriendRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const { data } = await userAPI.getFriendRequests();
      setRequests(data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleAccept = async (requestId) => {
    try {
      await userAPI.acceptFriendRequest(requestId);
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) { console.error(err); }
  };

  const handleReject = async (requestId) => {
    try {
      await userAPI.rejectFriendRequest(requestId);
      setRequests(prev => prev.filter(r => r._id !== requestId));
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="h-7 w-48 bg-dark-800 rounded-lg mb-6 animate-pulse" />
      {[1,2,3].map(i => (
        <div key={i} className="card flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-full bg-dark-700 animate-pulse" />
          <div className="flex-1"><div className="h-3.5 w-28 bg-dark-700 rounded mb-2 animate-pulse" /><div className="h-2.5 w-20 bg-dark-800 rounded animate-pulse" /></div>
          <div className="flex gap-2"><div className="h-8 w-20 bg-dark-800 rounded-lg animate-pulse" /><div className="h-8 w-20 bg-dark-800 rounded-lg animate-pulse" /></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4" id="requests-page">
      <h1 className="text-2xl font-bold text-dark-50 mb-6 flex items-center gap-3"><UserPlus className="w-6 h-6 text-tribe-400" />Friend Requests <span className="text-dark-400 text-lg font-normal">({requests.filter(r => r.sender?.fullName !== 'Unknown' && r.sender?.username).length})</span></h1>

      <div className="space-y-3">
        {requests.filter(r => r.sender?.fullName !== 'Unknown' && r.sender?.username).length === 0 ? (
          <div className="text-center py-20 text-dark-400">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg mb-2">No pending requests</p>
            <p className="text-sm">When someone sends you a friend request, it'll appear here</p>
          </div>
        ) : requests.filter(r => r.sender?.fullName !== 'Unknown' && r.sender?.username).map(req => (
          <div key={req._id} className="card flex items-center gap-4 animate-fade-in">
            {req.sender?.profilePhoto ? (
              <img src={req.sender.profilePhoto} alt="" className="w-12 h-12 avatar" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-dark-50 font-bold">{req.sender?.fullName?.charAt(0)?.toUpperCase()}</div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-dark-50 text-sm">{req.sender?.fullName}</h3>
              <p className="text-xs text-dark-400">@{req.sender?.username}</p>
              {req.sender?.bio && <p className="text-xs text-dark-300 truncate mt-0.5">{req.sender.bio}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleAccept(req._id)} className="p-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl transition" title="Accept"><Check className="w-5 h-5" /></button>
              <button onClick={() => handleReject(req._id)} className="p-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded-xl transition" title="Reject"><X className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendRequests;
