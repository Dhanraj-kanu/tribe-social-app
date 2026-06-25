import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { postAPI } from '../utils/api';
import { getSocket } from '../utils/socket';
import { Heart, MessageCircle, Send, Image as ImageIcon, X, Smile, ChevronDown, ChevronUp, CornerDownRight, Pencil, Trash2, MoreVertical, Check } from 'lucide-react';
import { format } from 'timeago.js';
import EmojiPicker from 'emoji-picker-react';
import StorySection from '../components/StorySection';
import ImageEditor from '../components/ImageEditor';
import { motion, AnimatePresence } from 'framer-motion';

const Avatar = ({ src, name, size = 'md' }) => {
  const sizes = { xs: 'w-6 h-6 text-[9px]', sm: 'w-8 h-8 text-[11px]', md: 'w-10 h-10 text-sm' };
  const cls = sizes[size] || sizes.md;
  if (src) return <img src={src} alt="" className={`${cls} rounded-full object-cover flex-shrink-0`} />;
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {name?.charAt(0)?.toUpperCase() || '?'}
    </div>
  );
};

const LikeCount = (n) => n > 0 ? (n >= 1000 ? (n/1000).toFixed(1)+'k' : n) : '';

/* ── Reply Component ── */
const ReplyItem = ({ reply, postId, commentId, userId, onUpdate }) => {
  const liked = reply.likes?.includes(userId);
  const handleLike = async () => {
    try {
      const { data } = await postAPI.likeReply(postId, commentId, reply._id);
      onUpdate(data);
    } catch (e) { console.error(e); }
  };
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 items-start ml-2 sm:ml-4">
      <CornerDownRight className="w-3 h-3 text-dark-600 mt-2 flex-shrink-0 hidden sm:block" />
      <Avatar src={reply.user?.profilePhoto} name={reply.user?.fullName} size="xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12px] font-semibold text-tribe-400">{reply.user?.fullName}</span>
          <span className="text-[10px] text-dark-500">· {format(reply.createdAt)}</span>
        </div>
        <p className="text-[12px] text-dark-200 leading-relaxed break-words">{reply.text}</p>
      </div>
      <button onClick={handleLike} className={`flex items-center gap-1 mt-1 flex-shrink-0 transition ${liked ? 'text-rose-500' : 'text-dark-500 hover:text-rose-400'}`}>
        <Heart className={`w-3 h-3 ${liked ? 'fill-current' : ''}`} strokeWidth={1.5} />
        {reply.likes?.length > 0 && <span className="text-[10px]">{reply.likes.length}</span>}
      </button>
    </motion.div>
  );
};

/* ── Comment Component ── */
const CommentItem = ({ comment, postId, userId, postAuthorId, onUpdate }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const menuRef = useRef(null);
  const liked = comment.likes?.includes(userId);
  const isOwner = comment.user?._id === userId;
  const isPostOwner = postAuthorId === userId;

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleLike = async () => {
    try {
      const { data } = await postAPI.likeComment(postId, comment._id);
      onUpdate(data);
    } catch (e) { console.error(e); }
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      const { data } = await postAPI.replyComment(postId, comment._id, replyText.trim());
      onUpdate(data);
      setReplyText('');
      setShowReplyInput(false);
      setShowReplies(true);
    } catch (e) { console.error(e); }
  };

  const handleEdit = async () => {
    if (!editText.trim() || editText.trim() === comment.text) { setIsEditing(false); return; }
    try {
      const { data } = await postAPI.editComment(postId, comment._id, editText.trim());
      onUpdate(data);
      setIsEditing(false);
    } catch (e) { console.error(e); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    try {
      const { data } = await postAPI.deleteComment(postId, comment._id);
      onUpdate(data);
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2 sm:gap-3 items-start">
        <Avatar src={comment.user?.profilePhoto} name={comment.user?.fullName} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[13px] font-semibold text-tribe-500">{comment.user?.fullName}</span>
            <span className="text-[10px] text-dark-400">· {format(comment.createdAt)}</span>
          </div>
          {isEditing ? (
            <div className="flex gap-1.5 items-center mt-1">
              <input
                type="text" autoFocus
                className="flex-1 bg-dark-900 border border-tribe-500/50 text-dark-50 rounded-lg pl-2.5 pr-2 py-1 text-[13px] focus:outline-none focus:border-tribe-500 transition-all"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') { setIsEditing(false); setEditText(comment.text); } }}
              />
              <button onClick={handleEdit} className="p-1 text-emerald-400 hover:text-emerald-300 transition" title="Save">
                <Check className="w-4 h-4" strokeWidth={2} />
              </button>
              <button onClick={() => { setIsEditing(false); setEditText(comment.text); }} className="p-1 text-dark-400 hover:text-dark-200 transition" title="Cancel">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          ) : (
            <p className="text-[13px] text-dark-200 mt-0.5 leading-relaxed break-words">{comment.text}</p>
          )}
          <div className="flex items-center gap-3 mt-1">
            <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[11px] text-[#5C67FF] font-medium hover:underline">
              Reply
            </button>
            {comment.replies?.length > 0 && (
              <button onClick={() => setShowReplies(!showReplies)} className="text-[11px] text-dark-400 hover:text-dark-200 flex items-center gap-0.5 transition">
                {showReplies ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 mt-1">
          <button onClick={handleLike} className={`flex flex-col items-center gap-0.5 transition ${liked ? 'text-rose-500' : 'text-dark-500 hover:text-rose-400'}`}>
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} strokeWidth={1.5} />
            {comment.likes?.length > 0 && <span className="text-[10px]">{comment.likes.length}</span>}
          </button>
          {(isOwner || isPostOwner) && (
            <div className="relative" ref={menuRef}>
              <button onClick={() => setShowMenu(!showMenu)} className="p-1 text-dark-500 hover:text-dark-300 transition rounded">
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-xl py-1 z-50 min-w-[100px] animate-scale-in">
                  {isOwner && (
                    <button onClick={() => { setIsEditing(true); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-dark-200 hover:bg-dark-700 transition">
                      <Pencil className="w-3 h-3" /> Edit
                    </button>
                  )}
                  <button onClick={() => { handleDelete(); setShowMenu(false); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[12px] text-rose-400 hover:bg-dark-700 transition">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reply Input */}
      <AnimatePresence>
        {showReplyInput && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ml-8 sm:ml-11 overflow-hidden">
            <div className="flex gap-2 items-center">
              <input
                type="text"
                className="flex-1 bg-dark-900 border border-dark-700 text-dark-50 placeholder-dark-500 rounded-full pl-3 pr-3 py-1.5 text-[12px] focus:outline-none focus:border-tribe-500 transition-all"
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReply()}
                autoFocus
              />
              <button onClick={handleReply} disabled={!replyText.trim()} className="w-7 h-7 rounded-full bg-[#5C67FF] flex items-center justify-center text-white hover:bg-indigo-500 transition disabled:opacity-40 flex-shrink-0">
                <Send className="w-3 h-3" strokeWidth={2} style={{ marginLeft: '-1px' }} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Replies List */}
      <AnimatePresence>
        {showReplies && comment.replies?.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="ml-6 sm:ml-10 space-y-2 overflow-hidden border-l-2 border-dark-700/50 pl-2">
            {comment.replies.map((reply) => (
              <ReplyItem key={reply._id} reply={reply} postId={postId} commentId={comment._id} userId={userId} onUpdate={onUpdate} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Main Feed ── */
const Feed = () => {
  const { user, updateUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPostText, setNewPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState('');
  const [postMediaType, setPostMediaType] = useState('image');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [commentTexts, setCommentTexts] = useState({});
  const [showPostEmoji, setShowPostEmoji] = useState(false);
  const [showCommentEmoji, setShowCommentEmoji] = useState({});
  const [expandedComments, setExpandedComments] = useState({});
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [rawImageFile, setRawImageFile] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const fileInputRef = useRef(null);
  const postInputRef = useRef(null);
  const observer = useRef();

  const lastPostElementRef = (node) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) setPage(prev => prev + 1);
    });
    if (node) observer.current.observe(node);
  };

  useEffect(() => { loadPosts(page); }, [page]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('feed_update', (post) => setPosts(prev => [post, ...prev]));
      socket.on('post_updated', (updatedPost) => setPosts(prev => prev.map(p => p._id === updatedPost._id ? updatedPost : p)));
      return () => { socket.off('feed_update'); socket.off('post_updated'); };
    }
  }, []);

  const loadPosts = async (pageNum) => {
    if (pageNum > 1) setLoadingMore(true);
    try {
      const { data } = await postAPI.getAllPosts(pageNum);
      if (data.length === 0) setHasMore(false);
      else setPosts(prev => pageNum === 1 ? data : [...prev, ...data]);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setLoadingMore(false); }
  };

  const handleMediaSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setPostMediaType(type);
      
      if (type === 'image') {
        setRawImageFile(file);
        setShowImageEditor(true);
      } else {
        // For video, check duration
        setIsMediaLoading(true);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setIsMediaLoading(false);
          if (video.duration > 61) {
            alert('Video must be less than 60 seconds');
            return;
          }
          setPostImage(file);
          setPostImagePreview(URL.createObjectURL(file));
        };
        video.onerror = () => {
          setIsMediaLoading(false);
          alert('Failed to load video. It might be corrupt or an unsupported format.');
        };
        video.src = URL.createObjectURL(file);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEditorSave = (editedFile) => {
    setPostImage(editedFile);
    setPostImagePreview(URL.createObjectURL(editedFile));
    setShowImageEditor(false);
    setRawImageFile(null);
  };

  const handleEditorCancel = () => {
    setShowImageEditor(false);
    setRawImageFile(null);
  };

  const removeImage = () => {
    setPostImage(null); setPostImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    
    // Get text from ref as fallback/primary to state to handle cases where state might be out of sync
    const textValue = postInputRef.current ? postInputRef.current.value : newPostText;
    const text = textValue.trim();
    
    if (!text && !postImage) return;
    
    if (postImage && postImage.size > 100 * 1024 * 1024) {
      setError('File is too large. Max size is 100MB.');
      return;
    }

    setPosting(true);
    setError('');
    
    try {
      const formData = new FormData();
      if (text) formData.append('text', text);
      if (postImage) formData.append('image', postImage);
      
      const { data } = await postAPI.createPost(formData);
      
      // Update posts state using functional update to ensure consistency
      setPosts(prev => [data, ...prev]);
      
      // Reset form
      setNewPostText('');
      if (postInputRef.current) postInputRef.current.value = '';
      removeImage();
      
      // Socket notification
      getSocket()?.emit('new_post', data);
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create post:', err);
      const message = err.response?.data?.message || err.message || 'Failed to post. Please try again.';
      setError(message);
    } finally {
      setPosting(false);
    }
  };

  // OPTIMISTIC: Like toggles instantly, then syncs with server
  const handleLike = async (postId) => {
    const userId = user._id;
    setPosts(prev => prev.map(p => {
      if (p._id !== postId) return p;
      const liked = p.likes?.includes(userId);
      return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...(p.likes || []), userId] };
    }));
    try {
      const { data } = await postAPI.likePost(postId);
      setPosts(prev => prev.map(p => p._id === postId ? data : p));
      getSocket()?.emit('post_interaction', data);
    } catch (err) {
      // Revert on error
      setPosts(prev => prev.map(p => {
        if (p._id !== postId) return p;
        const liked = p.likes?.includes(userId);
        return { ...p, likes: liked ? p.likes.filter(id => id !== userId) : [...(p.likes || []), userId] };
      }));
    }
  };

  const handleSave = async (postId) => {
    try {
      const { data } = await postAPI.savePost(postId);
      updateUser({ ...user, savedPosts: data.savedPosts });
    } catch (err) { console.error(err); }
  };

  // OPTIMISTIC: Comment appears instantly
  const handleComment = async (postId) => {
    const text = commentTexts[postId]?.trim();
    if (!text) return;
    // Clear input immediately
    setCommentTexts(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
    // Optimistic comment
    const tempComment = { _id: 'temp_' + Date.now(), text, user: { _id: user._id, fullName: user.fullName, profilePhoto: user.profilePhoto }, likes: [], replies: [], createdAt: new Date().toISOString() };
    setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: [...(p.comments || []), tempComment] } : p));
    try {
      const { data } = await postAPI.commentPost(postId, text);
      setPosts(prev => prev.map(p => p._id === postId ? data : p));
      getSocket()?.emit('post_interaction', data);
    } catch (err) {
      // Revert temp comment
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, comments: (p.comments || []).filter(c => c._id !== tempComment._id) } : p));
      setCommentTexts(prev => ({ ...prev, [postId]: text }));
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Delete this post?')) return;
    // Optimistic: remove immediately
    const backup = posts;
    setPosts(prev => prev.filter(p => p._id !== postId));
    try {
      await postAPI.deletePost(postId);
    } catch (err) { setPosts(backup); }
  };

  const handlePostUpdate = (postId, updatedPost) => {
    setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
    getSocket()?.emit('post_interaction', updatedPost);
  };

  const toggleComments = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  if (loading) return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 px-3 sm:px-4">
      <div className="h-7 w-16 bg-dark-800 rounded-lg mb-6 animate-pulse" />
      <div className="h-24 bg-dark-800/50 rounded-2xl mb-6 animate-pulse" />
      {[1, 2, 3].map(i => (
        <div key={i} className="card mb-4 !p-5" style={{ animationDelay: `${i * 0.1}s` }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-dark-700 animate-pulse" />
            <div className="flex-1">
              <div className="h-3.5 w-28 bg-dark-700 rounded animate-pulse mb-2" />
              <div className="h-2.5 w-20 bg-dark-800 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-3 w-full bg-dark-800 rounded animate-pulse mb-2" />
          <div className="h-3 w-3/4 bg-dark-800 rounded animate-pulse mb-4" />
          <div className="h-48 bg-dark-800/50 rounded-xl animate-pulse mb-3" />
          <div className="flex gap-6 pt-3 border-t border-dark-800">
            <div className="h-4 w-12 bg-dark-800 rounded animate-pulse" />
            <div className="h-4 w-12 bg-dark-800 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-6 px-3 sm:px-4" id="feed-page">
      <h1 className="text-xl sm:text-2xl font-bold text-dark-50 mb-4 sm:mb-6">Feed</h1>
      <StorySection />
      <input type="file" ref={fileInputRef} onChange={handleMediaSelect} accept="image/*,video/*" className="hidden" />

      {/* Image Editor Modal */}
      {showImageEditor && rawImageFile && (
        <ImageEditor
          imageFile={rawImageFile}
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}

      {/* Create Post */}
      <div className="card mb-4 sm:mb-6 !p-4 sm:!p-6">
        <div className="flex gap-2 sm:gap-3">
          <Avatar src={user?.profilePhoto} name={user?.fullName} />
          <form onSubmit={handleCreatePost} className="flex-1">
              <textarea
                ref={postInputRef}
                className="w-full bg-dark-700/50 border border-dark-600/50 text-dark-50 placeholder-dark-400 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-2 focus:ring-tribe-500/50 resize-none text-[13px] sm:text-sm"
                placeholder="What's on your mind?"
                rows={3}
                value={newPostText}
                onChange={(e) => {
                  setNewPostText(e.target.value);
                  if (error) setError('');
                }}
                id="post-input"
              />
              {error && (
                <div className="mt-2 text-xs text-rose-400 bg-rose-500/10 py-2 px-3 rounded-lg border border-rose-500/20 animate-fade-in">
                  {error}
                </div>
              )}
            {postImagePreview && (
              <div className="relative mt-2 inline-block max-w-full">
                {postMediaType === 'video' ? (
                  <video src={postImagePreview} className="max-h-60 rounded-xl w-full" controls />
                ) : (
                  <img src={postImagePreview} alt="Preview" className="max-h-60 rounded-xl" />
                )}
                <button type="button" onClick={removeImage} className="absolute top-1 right-1 p-1 bg-dark-900/80 rounded-full text-white hover:bg-rose-500 transition z-10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mt-2 sm:mt-3">
              <div className="flex gap-1 sm:gap-2 relative">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-dark-400 hover:text-tribe-400 rounded-lg transition" title="Add Image">
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setShowPostEmoji(!showPostEmoji)} className={`p-2 rounded-lg transition ${showPostEmoji ? 'text-tribe-400 bg-tribe-600/10' : 'text-dark-400 hover:text-tribe-400'}`} title="Add Emoji">
                  <Smile className="w-5 h-5" />
                </button>
                {showPostEmoji && (
                  <div className="absolute top-full left-0 mt-2 z-50 animate-scale-in">
                    <EmojiPicker onEmojiClick={(d) => setNewPostText(p => p + d.emoji)} theme="dark" width={280} height={350} />
                  </div>
                )}
              </div>
              <button type="submit" disabled={(!newPostText.trim() && !postImage) || posting || isMediaLoading} className="btn-primary text-xs sm:text-sm py-2 px-4 sm:px-5 flex items-center gap-2">
                {posting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Posting...</span>
                  </>
                ) : isMediaLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-4">
        <AnimatePresence>
        {posts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-dark-400">
            <p className="text-lg mb-2">No posts yet</p>
            <p className="text-sm">Be the first to share something!</p>
          </motion.div>
        ) : posts.map((post, index) => (
          <motion.div
            key={post._id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            layout
            ref={index === posts.length - 1 ? lastPostElementRef : null}
            className="card relative !p-4 sm:!p-6"
            id={`post-${post._id}`}
          >
            {/* Post Header */}
            <div className="flex items-start justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-2 sm:gap-3 cursor-pointer min-w-0" onClick={() => window.location.href = `/profile/${post.author?._id}`}>
                <Avatar src={post.author?.profilePhoto} name={post.author?.fullName} />
                <div className="flex flex-col min-w-0">
                  <h3 className="font-semibold text-dark-50 text-[14px] sm:text-[15px] truncate">{post.author?.fullName}</h3>
                  <p className="text-[11px] sm:text-[12px] text-[#7A7A8C] font-medium truncate">{post.author?.bio || 'Just joined Tribe'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 pt-1 flex-shrink-0">
                <span className="text-[11px] sm:text-[12px] text-[#7A7A8C]">{format(post.createdAt)}</span>
                {post.author?._id === user._id && (
                  <button onClick={() => handleDelete(post._id)} className="text-[#7A7A8C] hover:text-rose-400 transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                  </button>
                )}
              </div>
            </div>

            {post.image && (
              <div className="rounded-[16px] sm:rounded-[20px] mb-3 sm:mb-4 w-full overflow-hidden bg-dark-800">
                {post.mediaType === 'video' ? (
                  <video 
                    src={post.image} 
                    controls 
                    playsInline
                    preload="metadata"
                    className="w-full h-auto max-h-[500px] bg-black block" 
                  />
                ) : (
                  <img src={post.image} alt="" loading="lazy" className="w-full object-cover max-h-[500px] transition-opacity duration-300" />
                )}
              </div>
            )}
            {post.text && <p className="text-dark-200 text-[13px] mb-3 sm:mb-4 leading-relaxed font-light">{post.text}</p>}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-1 border-t border-dark-700/30 mt-1 pt-3">
              <div className="flex items-center gap-4 sm:gap-6">
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleLike(post._id)} className={`flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] transition ${post.likes?.includes(user._id) ? 'text-rose-500' : 'text-[#7A7A8C] hover:text-white'}`}>
                  <Heart className={`w-5 h-5 sm:w-6 sm:h-6 ${post.likes?.includes(user._id) ? 'fill-current' : ''}`} strokeWidth={1.5} />
                  {LikeCount(post.likes?.length || 0)}
                </motion.button>
                <button onClick={() => toggleComments(post._id)} className={`flex items-center gap-1.5 sm:gap-2 text-[14px] sm:text-[15px] transition ${expandedComments[post._id] ? 'text-[#5C67FF]' : 'text-[#7A7A8C] hover:text-white'}`}>
                  <MessageCircle className={`w-5 h-5 sm:w-6 sm:h-6 ${expandedComments[post._id] ? 'fill-[#5C67FF]/20' : ''}`} strokeWidth={1.5} />
                  {post.comments?.length > 0 && (post.comments.length >= 1000 ? (post.comments.length/1000).toFixed(1)+'k' : post.comments.length)}
                </button>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} className="text-[#5C67FF] hover:opacity-80 transition">
                <Send className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              </motion.button>
            </div>

            {/* Comments Section */}
            <AnimatePresence>
              {expandedComments[post._id] && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  {post.comments?.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-[#2A2A35] space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {post.comments.map((comment) => (
                        <CommentItem
                          key={comment._id}
                          comment={comment}
                          postId={post._id}
                          userId={user._id}
                          postAuthorId={post.author?._id}
                          onUpdate={(updatedPost) => handlePostUpdate(post._id, updatedPost)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Comment Input - Always visible */}
            <div className="flex gap-2 mt-4 relative items-center">
              <Avatar src={user?.profilePhoto} name={user?.fullName} size="sm" />
              <div className="flex-1 relative">
                <input
                  type="text"
                  className="w-full bg-dark-900 border border-dark-800 text-dark-50 placeholder-dark-400 rounded-full pl-3 sm:pl-4 pr-10 py-2 sm:py-2.5 text-[12px] sm:text-[13px] focus:outline-none focus:border-tribe-500 transition-all"
                  placeholder="Write a comment..."
                  value={commentTexts[post._id] || ''}
                  onChange={(e) => setCommentTexts({ ...commentTexts, [post._id]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleComment(post._id)}
                />
                <button type="button" onClick={() => setShowCommentEmoji({ ...showCommentEmoji, [post._id]: !showCommentEmoji[post._id] })} className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full transition ${showCommentEmoji[post._id] ? 'text-[#FFB347]' : 'text-[#7A7A8C] hover:text-white'}`}>
                  <Smile className="w-4 h-4" />
                </button>
                {showCommentEmoji[post._id] && (
                  <div className="absolute bottom-full right-0 mb-2 z-50 animate-scale-in">
                    <EmojiPicker onEmojiClick={(d) => setCommentTexts({ ...commentTexts, [post._id]: (commentTexts[post._id] || '') + d.emoji })} theme="dark" width={260} height={320} />
                  </div>
                )}
              </div>
              <button onClick={() => handleComment(post._id)} disabled={!commentTexts[post._id]?.trim()} className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#5C67FF] flex items-center justify-center text-white hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2} style={{ marginLeft: '-2px' }} />
              </button>
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>

      {loadingMore && (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-tribe-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-10 text-dark-500">
          <p className="text-sm">You're all caught up! ✨</p>
        </div>
      )}

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold"
          >
            <div className="bg-white/20 p-1 rounded-full">
              <Check className="w-4 h-4" strokeWidth={3} />
            </div>
            Post Successful!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Feed;
