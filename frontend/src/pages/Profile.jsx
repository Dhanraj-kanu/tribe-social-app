import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { userAPI, postAPI, chatAPI } from '../utils/api';
import { MessageCircle, UserPlus, UserMinus, UserCheck, Edit2, Camera, Heart, Check, Grid, Image as ImageIcon, Moon, Sun, LogOut, Settings } from 'lucide-react';
import { format } from 'timeago.js';
import { motion } from 'framer-motion';
import ImageEditor from '../components/ImageEditor';

const Profile = () => {
  const { id } = useParams();
  const { user: currentUser, updateUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ fullName: '', bio: '', username: '' });
  const [requestSent, setRequestSent] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const fileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const [editorFile, setEditorFile] = useState(null);
  const [editorType, setEditorType] = useState('profilePhoto');

  const isOwnProfile = currentUser?._id === id;

  useEffect(() => {
    setLoading(true);
    setRequestSent(false);
    loadProfile();
    loadPosts();
  }, [id]);

  const loadProfile = async () => {
    try {
      const { data } = await userAPI.getProfile(id);
      setProfile(data);
      setEditData({ fullName: data.fullName, bio: data.bio || '', username: data.username });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const loadPosts = async () => {
    try {
      const { data } = await postAPI.getUserPosts(id);
      setPosts(data);
    } catch (err) { console.error(err); }
  };

  const handleFollow = async () => {
    setActionLoading('follow');
    try {
      const isFollowing = profile.followers?.some(f => (f._id || f) === currentUser._id);
      if (isFollowing) { await userAPI.unfollowUser(id); } else { await userAPI.followUser(id); }
      await loadProfile();
    } catch (err) { console.error(err); } finally { setActionLoading(''); }
  };

  const handleFriendRequest = async () => {
    setActionLoading('friend');
    try {
      await userAPI.sendFriendRequest(id);
      setRequestSent(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Error sending friend request');
    } finally { setActionLoading(''); }
  };

  const handleMessage = async () => {
    try {
      await chatAPI.createConversation(id);
      navigate('/chat');
    } catch (err) { console.error(err); }
  };

  const handlePhotoSelect = (e, type = 'profilePhoto') => {
    const file = e.target.files[0];
    if (!file) return;
    setEditorType(type);
    setEditorFile(file);
    if (e.target) e.target.value = '';
  };

  const handleEditorSave = async (editedFile) => {
    setEditorFile(null);
    try {
      const formData = new FormData();
      formData.append(editorType, editedFile);
      const { data } = await userAPI.updateProfile(formData);
      setProfile(data);
      updateUser(data);
    } catch (err) { alert('Failed to upload photo'); }
  };

  const handleSaveProfile = async () => {
    setActionLoading('save');
    try {
      const formData = new FormData();
      formData.append('fullName', editData.fullName);
      formData.append('bio', editData.bio);
      formData.append('username', editData.username);
      const { data } = await userAPI.updateProfile(formData);
      setProfile(data);
      updateUser(data);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving profile');
    } finally { setActionLoading(''); }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto">
      <div className="h-48 md:h-64 bg-dark-800 md:rounded-b-3xl animate-pulse" />
      <div className="px-4 -mt-16 md:-mt-20">
        <div className="flex items-end gap-6 mb-6">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-dark-700 border-4 border-dark-950 animate-pulse" />
          <div className="flex-1 pb-2">
            <div className="h-7 w-48 bg-dark-700 rounded-lg mb-2 animate-pulse" />
            <div className="h-4 w-24 bg-dark-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card animate-pulse"><div className="h-4 w-20 bg-dark-700 rounded mb-4" /><div className="h-3 w-full bg-dark-800 rounded mb-2" /><div className="h-3 w-2/3 bg-dark-800 rounded" /></div>
          <div className="md:col-span-2 space-y-4">{[1,2].map(i => <div key={i} className="card animate-pulse"><div className="h-3 w-full bg-dark-800 rounded mb-2" /><div className="h-40 bg-dark-800/50 rounded-xl" /></div>)}</div>
        </div>
      </div>
    </div>
  );
  if (!profile) return <div className="flex items-center justify-center h-screen text-dark-400">User not found</div>;

  const isFollowing = profile.followers?.some(f => (f._id || f) === currentUser._id);
  const isFriend = profile.friends?.some(f => (f._id || f) === currentUser._id);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-10" 
      id="profile-page"
    >
      {/* Photo Inputs */}
      <input type="file" ref={fileInputRef} onChange={(e) => handlePhotoSelect(e, 'profilePhoto')} accept="image/*" className="hidden" />
      <input type="file" ref={coverInputRef} onChange={(e) => handlePhotoSelect(e, 'coverPhoto')} accept="image/*" className="hidden" />

      {/* Image Editor Modal */}
      {editorFile && (
        <ImageEditor
          imageFile={editorFile}
          aspectRatioLock={editorType === 'profilePhoto' ? 1 : null}
          onSave={handleEditorSave}
          onCancel={() => setEditorFile(null)}
        />
      )}

      {/* Header Section */}
      <div className="relative group/cover h-48 md:h-64 w-full bg-dark-800 overflow-hidden md:rounded-b-3xl">
        {profile.coverPhoto ? (
          <img src={profile.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-dark-800 to-dark-700" />
        )}
        {isOwnProfile && (
          <button 
            onClick={() => coverInputRef.current?.click()}
            className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-xl backdrop-blur-sm transition-all opacity-0 group-hover/cover:opacity-100 flex items-center gap-2 text-sm"
          >
            <Camera className="w-4 h-4" /> Edit Cover
          </button>
        )}
      </div>

      <div className="px-4 -mt-16 md:-mt-20">
        <div className="flex flex-col md:flex-row items-start md:items-end gap-6 mb-6">
          <div className="relative group/avatar">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-dark-950 overflow-hidden bg-dark-800 shadow-xl">
              {profile.profilePhoto ? (
                <img src={profile.profilePhoto} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white text-5xl font-bold">
                  {profile.fullName?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            {isOwnProfile && (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-all rounded-full flex items-center justify-center text-white"
              >
                <Camera className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-dark-50 flex items-center gap-2">
                  {profile.fullName}
                  {isFriend && <UserCheck className="w-5 h-5 text-tribe-400" />}
                </h1>
                <p className="text-dark-400">@{profile.username}</p>
              </div>

              <div className="flex gap-2">
                {isOwnProfile ? (
                  <button onClick={() => setEditing(true)} className="btn-secondary flex items-center gap-2 text-sm">
                    <Edit2 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleFollow}
                      disabled={actionLoading === 'follow'}
                      className={`flex items-center gap-2 text-sm py-2.5 px-6 rounded-xl transition font-semibold shadow-lg ${isFollowing ? 'bg-dark-800 text-white hover:bg-dark-700' : 'bg-tribe-500 text-white hover:bg-tribe-600'}`}
                    >
                      {actionLoading === 'follow' ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : isFollowing ? 'Unfollow' : 'Follow'}
                    </button>
                    <button onClick={handleMessage} className="p-2.5 bg-dark-800 text-white hover:bg-dark-700 rounded-xl transition shadow-lg">
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-sm font-bold text-dark-50 uppercase tracking-wider mb-4">About</h3>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-dark-500 mb-1 block uppercase">Full Name</label>
                    <input className="input-field py-2 text-sm" value={editData.fullName} onChange={(e) => setEditData({...editData, fullName: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-xs text-dark-500 mb-1 block uppercase">Bio</label>
                    <textarea className="input-field py-2 text-sm resize-none" rows={3} value={editData.bio} onChange={(e) => setEditData({...editData, bio: e.target.value})} maxLength={200} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile} className="btn-primary flex-1 text-xs py-2">Save</button>
                    <button onClick={() => setEditing(false)} className="btn-secondary flex-1 text-xs py-2">Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-dark-300 text-sm leading-relaxed mb-6">{profile.bio || "No bio yet."}</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-dark-900/50 rounded-2xl border border-dark-800/50">
                      <span className="text-xs text-dark-400">Followers</span>
                      <span className="text-sm font-bold text-dark-50">{profile.followers?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-900/50 rounded-2xl border border-dark-800/50">
                      <span className="text-xs text-dark-400">Following</span>
                      <span className="text-sm font-bold text-dark-50">{profile.following?.length || 0}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-dark-900/50 rounded-2xl border border-dark-800/50">
                      <span className="text-xs text-dark-400">Tribe Friends</span>
                      <span className="text-sm font-bold text-dark-50">{profile.friends?.length || 0}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Account Settings for Own Profile */}
            {isOwnProfile && (
              <div className="card">
                <h3 className="text-sm font-bold text-dark-50 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Preferences
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={toggleTheme}
                    className="w-full flex items-center justify-between p-3 bg-dark-900/50 hover:bg-dark-900 rounded-2xl border border-dark-800/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      </div>
                      <span className="text-sm text-dark-200 font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'light' ? 'bg-amber-500' : 'bg-dark-700'}`}>
                      <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${theme === 'light' ? 'left-6' : 'left-1'}`} />
                    </div>
                  </button>

                  <button 
                    onClick={logout}
                    className="w-full flex items-center gap-3 p-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl border border-rose-500/20 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                      <LogOut className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wider">Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center gap-4 mb-6 border-b border-dark-800">
              <button className="pb-3 text-sm font-bold text-dark-50 border-b-2 border-tribe-500 flex items-center gap-2">
                <Grid className="w-4 h-4" /> Posts
              </button>
            </div>
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="text-center py-20 card border-dashed">
                  <ImageIcon className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                  <p className="text-dark-400">No posts shared yet</p>
                </div>
              ) : posts.map((post, index) => (
                <motion.div 
                  key={post._id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card"
                >
                  {post.text && <p className="text-dark-200 mb-4 leading-relaxed">{post.text}</p>}
                  {post.image && (
                    <div className="rounded-2xl mb-4 w-full overflow-hidden bg-dark-800 shadow-lg">
                      {post.mediaType === 'video' ? (
                        <video 
                          src={post.image} 
                          controls 
                          playsInline
                          preload="metadata"
                          className="w-full object-cover max-h-[500px]" 
                        />
                      ) : (
                        <img 
                          src={post.image} 
                          alt="" 
                          loading="lazy" 
                          className="w-full object-cover max-h-[500px]" 
                        />
                      )}
                    </div>
                  )}
                  <div className="flex items-center gap-6 text-sm text-dark-400">
                    <span className="flex items-center gap-2 hover:text-rose-400 transition cursor-pointer"><Heart className="w-4 h-4" /> {post.likes?.length || 0}</span>
                    <span className="flex items-center gap-2 hover:text-tribe-400 transition cursor-pointer"><MessageCircle className="w-4 h-4" /> {post.comments?.length || 0}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-wider">{format(post.createdAt)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;
