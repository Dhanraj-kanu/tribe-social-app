import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../utils/api';
import { Heart, MessageCircle, Send, Bookmark, ArrowLeft } from 'lucide-react';
import { format } from 'timeago.js';
import { useNavigate } from 'react-router-dom';

const SavedPosts = () => {
  const { user, updateUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadSavedPosts();
  }, []);

  const loadSavedPosts = async () => {
    try {
      const { data } = await postAPI.getSavedPosts();
      setPosts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (postId) => {
    try {
      const { data } = await postAPI.savePost(postId);
      const updatedUser = { ...user, savedPosts: data.savedPosts };
      updateUser(updatedUser);
      // Remove from list if unsaved
      if (!data.isSaved) {
        setPosts(prev => prev.filter(p => p._id !== postId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="h-7 w-40 bg-dark-800 rounded-lg mb-6 animate-pulse" />
      {[1,2].map(i => (
        <div key={i} className="card mb-4 animate-pulse">
          <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-dark-700" /><div><div className="h-3.5 w-24 bg-dark-700 rounded mb-2" /><div className="h-2.5 w-16 bg-dark-800 rounded" /></div></div>
          <div className="h-3 w-full bg-dark-800 rounded mb-2" /><div className="h-40 bg-dark-800/50 rounded-xl" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 text-dark-400 hover:text-white rounded-xl bg-dark-800/50 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">Saved Posts</h1>
      </div>

      <div className="space-y-4">
        {posts.length === 0 ? (
          <div className="text-center py-20 text-dark-400 bg-dark-900/50 rounded-3xl border border-dark-800">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg mb-2">No saved posts yet</p>
            <p className="text-sm">Posts you bookmark will appear here.</p>
          </div>
        ) : posts.map(post => (
          <div key={post._id} className="card animate-fade-in">
            <div className="flex items-center gap-3 mb-4 cursor-pointer" onClick={() => navigate(`/profile/${post.author?._id}`)}>
              <img src={post.author?.profilePhoto || '/default-avatar.png'} alt="" className="w-10 h-10 avatar" />
              <div>
                <h3 className="font-semibold text-white text-sm">{post.author?.fullName}</h3>
                <p className="text-xs text-dark-400">@{post.author?.username} · {format(post.createdAt)}</p>
              </div>
            </div>

            {post.text && <p className="text-dark-200 mb-4 leading-relaxed">{post.text}</p>}
            {post.image && <img src={post.image} alt="" className="rounded-xl mb-4 w-full object-cover max-h-96" />}

            <div className="flex items-center gap-6 pt-3 border-t border-dark-700/50">
              <div className="flex items-center gap-2 text-sm text-dark-400">
                <Heart className="w-5 h-5" /> {post.likes?.length || 0}
              </div>
              <div className="flex items-center gap-2 text-sm text-dark-400">
                <MessageCircle className="w-5 h-5" /> {post.comments?.length || 0}
              </div>
              <button onClick={() => handleSave(post._id)} className="flex items-center gap-2 text-sm ml-auto text-tribe-400">
                <Bookmark className="w-5 h-5 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SavedPosts;
