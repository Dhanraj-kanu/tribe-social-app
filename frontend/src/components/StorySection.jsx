import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { storyAPI } from '../utils/api';
import { Plus, X, ChevronLeft, ChevronRight, Eye, Heart, MessageCircle, MoreVertical, Pencil, Trash2, Check, Music, Smile, Image as ImageIcon } from 'lucide-react';
import { format } from 'timeago.js';
import StoryCreator from './StoryCreator';

const QUICK_EMOJIS = ['❤️','😂','🔥','😍','👏','😮','💯','🎉'];

const StorySection = () => {
  const { user } = useAuth();
  const [userStories, setUserStories] = useState([]);
  const [selectedUserIndex, setSelectedUserIndex] = useState(null);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const progressTimerRef = useRef(null);
  const [commentText, setCommentText] = useState('');
  const [showViewers, setShowViewers] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [storyFile, setStoryFile] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const audioRef = useRef(null);
  const createMenuRef = useRef(null);
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const playAudio = async () => {
      if (selectedUserIndex !== null) {
        const cs = userStories[selectedUserIndex]?.stories[selectedStoryIndex];
        
        // Tracking view
        if (cs && cs.user._id !== user._id) {
          const viewed = cs.viewers?.some(v => v._id === user._id || v === user._id);
          if (!viewed) {
            storyAPI.viewStory(cs._id).catch(console.log);
            const ns = [...userStories];
            ns[selectedUserIndex].stories[selectedStoryIndex].viewers = [...(cs.viewers||[]), user];
            setUserStories(ns);
          }
        }

        if (cs?.music?.url) {
          let audioUrl = cs.music.url;
          
          // Fallback for old/broken Pixabay or SoundHelix URLs
          if (audioUrl.includes('pixabay.com') || audioUrl.includes('soundhelix.com')) {
            // Using a high-reliability fallback MP3 from GitHub
            audioUrl = 'https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.mp3';
          }

          console.log('Attempting to play story music:', cs.music.name, audioUrl);
          if (audioRef.current) {
            try {
              if (audioRef.current.src !== audioUrl) {
                audioRef.current.src = audioUrl;
                audioRef.current.load();
              }
              
              if (!isMuted) {
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    console.error('Autoplay blocked or failed:', error);
                  });
                }
              } else {
                audioRef.current.pause();
              }
            } catch (err) {
              console.error('Audio setup error:', err);
            }
          }
        } else {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = '';
          }
        }
      } else {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = '';
        }
      }
    };

    playAudio();
  }, [selectedUserIndex, selectedStoryIndex, isMuted]);

  useEffect(() => {
    const handler = (e) => { if (createMenuRef.current && !createMenuRef.current.contains(e.target)) setShowCreateMenu(false); };
    if (showCreateMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCreateMenu]);

  const handleReact = async (storyId) => {
    try {
      const ns = [...userStories];
      const s = ns[selectedUserIndex].stories[selectedStoryIndex];
      const liked = s.likes?.some(l => l._id === user._id || l === user._id);
      s.likes = liked ? s.likes.filter(l => l._id !== user._id && l !== user._id) : [...(s.likes||[]), user];
      setUserStories(ns);
      await storyAPI.reactToStory(storyId);
    } catch (err) { console.log(err); }
  };

  const handleEmojiReaction = async (storyId, emoji) => {
    try {
      await storyAPI.addReaction(storyId, emoji);
      setShowReactions(false);
      startProgress();
    } catch (err) { console.log(err); }
  };

  const handleComment = async (e, storyId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try { await storyAPI.commentOnStory(storyId, commentText); setCommentText(''); fetchStories(); } catch (err) { console.log(err); }
  };

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try { const { data } = await storyAPI.getStories(); setUserStories(data); } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStoryFile(file);
    setShowCreator(true);
    e.target.value = ''; // Reset to allow selecting the same file again
  };

  const handleGalleryClick = () => {
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const openStory = (i) => { setSelectedUserIndex(i); setSelectedStoryIndex(0); startProgress(); };
  const closeStory = () => { setSelectedUserIndex(null); setSelectedStoryIndex(0); setShowMenu(false); setIsEditing(false); setShowDeleteConfirm(false); setShowReactions(false); if (progressTimerRef.current) clearTimeout(progressTimerRef.current); };
  const nextStory = () => { 
    if (audioRef.current && !isMuted) audioRef.current.play().catch(() => {}); 
    if (selectedUserIndex === null) return; 
    const cs = userStories[selectedUserIndex].stories; 
    if (selectedStoryIndex < cs.length - 1) { setSelectedStoryIndex(p => p+1); startProgress(); } 
    else if (selectedUserIndex < userStories.length - 1) { setSelectedUserIndex(p => p+1); setSelectedStoryIndex(0); startProgress(); } 
    else closeStory(); 
  };
  const prevStory = () => { 
    if (audioRef.current && !isMuted) audioRef.current.play().catch(() => {});
    if (selectedUserIndex === null) return; 
    if (selectedStoryIndex > 0) { setSelectedStoryIndex(p => p-1); startProgress(); } 
    else if (selectedUserIndex > 0) { setSelectedUserIndex(p => p-1); setSelectedStoryIndex(userStories[selectedUserIndex-1].stories.length-1); startProgress(); } 
  };
  const startProgress = () => { if (progressTimerRef.current) clearTimeout(progressTimerRef.current); progressTimerRef.current = setTimeout(nextStory, 5000); };
  const pauseProgress = () => { if (progressTimerRef.current) clearTimeout(progressTimerRef.current); };

  const handleEditStart = () => { const cs = userStories[selectedUserIndex].stories[selectedStoryIndex]; setEditCaption(cs.caption || ''); setIsEditing(true); setShowMenu(false); pauseProgress(); };
  const handleEditSave = async () => { const cs = userStories[selectedUserIndex].stories[selectedStoryIndex]; setActionLoading(true); try { await storyAPI.editStory(cs._id, { caption: editCaption }); const ns = [...userStories]; ns[selectedUserIndex].stories[selectedStoryIndex].caption = editCaption; setUserStories(ns); setIsEditing(false); startProgress(); } catch (err) { console.error(err); } finally { setActionLoading(false); } };
  const handleDelete = async () => { const cs = userStories[selectedUserIndex].stories[selectedStoryIndex]; setActionLoading(true); try { await storyAPI.deleteStory(cs._id); setShowDeleteConfirm(false); await fetchStories(); closeStory(); } catch (err) { console.error(err); } finally { setActionLoading(false); } };

  if (loading) return null;
  const cs = selectedUserIndex !== null ? userStories[selectedUserIndex]?.stories[selectedStoryIndex] : null;
  const isOwn = cs && userStories[selectedUserIndex]?.user._id === user._id;

  const getTextPosStyle = (overlay) => {
    if (!overlay) return {};
    const { position, x, y } = overlay;
    return {
      top: position === 'custom' ? `${y}%` : position === 'top' ? '15%' : position === 'center' ? '50%' : 'auto',
      bottom: position === 'bottom' ? '20%' : 'auto',
      transform: position === 'center' || position === 'custom' ? 'translate(-50%,-50%)' : 'translateX(-50%)',
      left: position === 'custom' ? `${x}%` : '50%',
    };
  };

  return (
    <div className="mb-8">
      {/* Hidden file inputs for story creation */}
      <input type="file" accept="image/*,video/*" ref={galleryInputRef} onChange={handleFileUpload} className="hidden" style={{ display: 'none' }} />
      <input type="file" accept="image/*,video/*" capture="environment" ref={cameraInputRef} onChange={handleFileUpload} className="hidden" style={{ display: 'none' }} />
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide no-scrollbar px-2">
        <div className="flex flex-col items-center gap-2 flex-shrink-0 relative" ref={createMenuRef}>
          <div onClick={() => setShowCreateMenu(!showCreateMenu)} className="w-[70px] h-[70px] rounded-full bg-[#1C1C24] border border-[#2A2A35] flex items-center justify-center cursor-pointer hover:bg-[#252530] transition-colors group relative shadow-lg">
            {user?.profilePhoto ? <img src={user.profilePhoto} alt="" className="w-full h-full rounded-full object-cover opacity-30 group-hover:opacity-50 transition-opacity" /> : <div className="w-full h-full rounded-full flex items-center justify-center text-[#7A7A8C] font-bold opacity-30">{user?.fullName?.charAt(0)}</div>}
            <div className="absolute inset-0 flex items-center justify-center">
              {uploading ? <div className="w-5 h-5 border-2 border-[#7A7A8C] border-t-transparent rounded-full animate-spin" /> : <Plus className={`w-6 h-6 text-[#7A7A8C] group-hover:text-white transition-all ${showCreateMenu ? 'rotate-45 text-white' : ''}`} strokeWidth={1.5} />}
            </div>
          </div>
          <span className="text-[11px] text-[#7A7A8C] font-medium tracking-wide">Your Story</span>
        </div>

        {userStories.map((item, index) => (
          <div key={item.user._id} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div onClick={() => openStory(index)} className="w-[70px] h-[70px] rounded-full p-[2px] bg-gradient-to-tr from-[#FFB347] to-[#FFCC33] cursor-pointer active:scale-95 transition-transform shadow-[0_4px_15px_rgba(255,179,71,0.2)]">
              <div className="w-full h-full rounded-full p-[2px] bg-dark-950">
                {item.user.profilePhoto ? <img src={item.user.profilePhoto} alt="" className="w-full h-full rounded-full object-cover" /> : <div className="w-full h-full rounded-full bg-gradient-to-br from-[#FFB347] to-[#FFCC33] flex items-center justify-center text-dark-950 font-bold">{item.user.fullName.charAt(0)}</div>}
              </div>
            </div>
            <span className="text-[11px] text-[#D1D1E0] font-medium truncate w-[70px] text-center tracking-wide">{item.user.fullName.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      {/* Create Story Options Modal */}
      {showCreateMenu && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateMenu(false)} />
          <div className="relative bg-[#1C1C28] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-[280px] overflow-hidden animate-scale-in">
            <div className="p-6">
              <h3 className="text-white text-lg font-bold mb-6 text-center">Create Story</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => { handleGalleryClick(); setShowCreateMenu(false); }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-semibold text-white/80">Gallery</span>
                </button>
                <button 
                  onClick={() => { handleCameraClick(); setShowCreateMenu(false); }}
                  className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                  </div>
                  <span className="text-xs font-semibold text-white/80">Camera</span>
                </button>
              </div>
            </div>
            <button onClick={() => setShowCreateMenu(false)} className="w-full py-4 bg-white/5 text-white/40 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors border-t border-white/5">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Story Viewer */}
      {selectedUserIndex !== null && cs && (
        <div className="fixed inset-0 z-[1000] bg-black flex items-center justify-center animate-fade-in">
          <div className="relative w-full max-w-lg h-full md:h-[90vh] md:rounded-2xl overflow-hidden bg-dark-900 flex flex-col">
            {/* Progress */}
            <div className="absolute top-0 left-0 right-0 z-30 flex gap-1.5 p-3">
              {userStories[selectedUserIndex].stories.map((_, i) => (
                <div key={i} className="flex-1 h-0.5 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-white transition-all ease-linear ${i < selectedStoryIndex ? 'w-full' : i === selectedStoryIndex ? 'animate-story-progress' : 'w-0'}`} 
                    style={{ 
                      animationDuration: i === selectedStoryIndex ? '5000ms' : '0ms',
                      animationFillMode: 'forwards'
                    }} 
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-4 left-0 right-0 z-30 flex items-center justify-between px-4 mt-2">
              <div className="flex items-center gap-3">
                <img src={userStories[selectedUserIndex].user.profilePhoto || '/default-avatar.png'} className="w-8 h-8 rounded-full border border-white/20" alt="" />
                <div>
                  <p className="text-sm font-bold text-white">{userStories[selectedUserIndex].user.fullName}</p>
                  <p className="text-[10px] text-white/60">{format(cs.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {cs.music?.url && (
                  <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-2 text-white/80 hover:text-white transition">
                    {isMuted ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>
                    ) : (
                      <Music className="w-5 h-5 animate-pulse" />
                    )}
                  </button>
                )}
                {isOwn && (
                  <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); pauseProgress(); }} className="p-2 text-white/80 hover:text-white"><MoreVertical className="w-5 h-5" /></button>
                    {showMenu && (
                      <div className="absolute right-0 top-10 bg-[#1C1C28] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[180px] z-50">
                        <button onClick={(e) => { e.stopPropagation(); handleEditStart(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/90 hover:bg-white/10"><Pencil className="w-4 h-4 text-blue-400" />Edit Caption</button>
                        <div className="h-px bg-white/10" />
                        <button onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); setShowMenu(false); pauseProgress(); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" />Delete Story</button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={closeStory} className="p-2 text-white/80 hover:text-white"><X className="w-6 h-6" /></button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative flex items-center justify-center">
              {cs.mediaType === 'video' ? (
                <video src={cs.media} className="w-full h-full object-contain" autoPlay loop muted={isMuted} playsInline />
              ) : (
                <img src={cs.media} className="w-full h-full object-contain" alt="" />
              )}

              {/* Text Overlay */}
              {cs.textOverlay?.text && (
                <div className="absolute z-20 px-5 py-3 text-center max-w-[85%] pointer-events-none" style={{ ...getTextPosStyle(cs.textOverlay), fontFamily: cs.textOverlay.fontFamily || 'Inter', fontSize: `${cs.textOverlay.fontSize || 24}px`, color: cs.textOverlay.color || '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.7)', lineHeight: 1.3 }}>
                  <span className={`${cs.textOverlay.showBackground !== false ? 'bg-black/30 backdrop-blur-sm' : ''} rounded-lg px-3 py-1.5 inline-block`}>{cs.textOverlay.text}</span>
                </div>
              )}

              {/* Stickers */}
              {cs.stickers?.map((s, i) => (
                <div key={i} className="absolute z-20 text-4xl pointer-events-none select-none" style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%,-50%)' }}>{s.emoji}</div>
              ))}

              {/* Music Badge */}
              {cs.music?.name && (
                <div className="absolute z-20 flex items-center gap-2.5 bg-black/50 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10"
                     style={{ left: `${cs.music.x || 4}%`, top: `${cs.music.y || 70}%` }}>
                  <div className="w-8 h-8 bg-gradient-to-br from-[#5C67FF] to-[#E879F9] rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
                    <Music className="w-4 h-4 text-white" />
                  </div>
                  <div><p className="text-white text-xs font-bold">{cs.music.name}</p><p className="text-white/60 text-[10px]">{cs.music.artist}</p></div>
                </div>
              )}

              {/* Caption */}
              {cs.caption && !isEditing && !cs.textOverlay?.text && (
                <div className="absolute bottom-24 left-0 right-0 z-20 px-6">
                  <div className="bg-black/60 backdrop-blur-md rounded-2xl px-5 py-3 text-center"><p className="text-white text-sm font-medium">{cs.caption}</p></div>
                </div>
              )}

              {/* Nav Zones */}
              <div className="absolute inset-0 flex z-10" onClick={() => {
                // Clicking the story also acts as a user gesture to resume audio if blocked
                if (audioRef.current && !isMuted && audioRef.current.paused && cs.music?.url) {
                  audioRef.current.play().catch(console.log);
                }
              }}>
                <div className="w-1/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); prevStory(); }} />
                <div className="w-2/3 h-full cursor-pointer" onClick={(e) => { e.stopPropagation(); nextStory(); }} />
              </div>

              {/* Edit Overlay */}
              {isEditing && (
                <div className="absolute inset-0 bg-black/80 z-30 flex flex-col items-center justify-center p-6 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                  <h3 className="text-white text-lg font-bold mb-4">Edit Caption</h3>
                  <textarea value={editCaption} onChange={e => setEditCaption(e.target.value)} placeholder="Add a caption..." className="w-full max-w-sm bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white placeholder-white/50 outline-none focus:border-blue-400/60 resize-none text-sm" rows={3} maxLength={200} autoFocus />
                  <p className="text-white/40 text-xs mt-2">{editCaption.length}/200</p>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setIsEditing(false); startProgress(); }} className="px-6 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20">Cancel</button>
                    <button onClick={handleEditSave} disabled={actionLoading} className="px-6 py-2.5 rounded-full bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50">
                      {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}Save
                    </button>
                  </div>
                </div>
              )}

              {/* Delete Confirm */}
              {showDeleteConfirm && (
                <div className="absolute inset-0 bg-black/80 z-30 flex items-center justify-center p-6 backdrop-blur-sm" onClick={e => e.stopPropagation()}>
                  <div className="bg-[#1C1C28] rounded-3xl p-8 max-w-sm w-full text-center border border-white/10 shadow-2xl">
                    <div className="w-14 h-14 bg-red-500/15 rounded-full flex items-center justify-center mx-auto mb-5"><Trash2 className="w-7 h-7 text-red-400" /></div>
                    <h3 className="text-white text-lg font-bold mb-2">Delete Story?</h3>
                    <p className="text-white/50 text-sm mb-6">This action cannot be undone.</p>
                    <div className="flex gap-3">
                      <button onClick={() => { setShowDeleteConfirm(false); startProgress(); }} className="flex-1 px-5 py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20">Cancel</button>
                      <button onClick={handleDelete} disabled={actionLoading} className="flex-1 px-5 py-3 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 disabled:opacity-50">
                        {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Footer - Own Story */}
              {isOwn ? (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 flex justify-center gap-4">
                  <button onClick={e => { e.stopPropagation(); setShowViewers(true); setShowComments(false); pauseProgress(); }} className="flex items-center gap-2 text-white/90 hover:text-white py-2 px-4 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur">
                    <Eye className="w-5 h-5" /><span className="font-bold">{cs.viewers?.length||0} Views</span>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setShowComments(true); setShowViewers(false); pauseProgress(); }} className="flex items-center gap-2 text-white/90 hover:text-white py-2 px-4 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur">
                    <MessageCircle className="w-5 h-5" /><span className="font-bold">{cs.comments?.length||0}</span>
                  </button>
                </div>
              ) : (
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                  {/* Emoji Reaction Bar */}
                  {showReactions && (
                    <div className="flex justify-center gap-2 mb-3 animate-fade-in">
                      {QUICK_EMOJIS.map(em => (
                        <button key={em} onClick={e => { e.stopPropagation(); handleEmojiReaction(cs._id, em); }} className="text-2xl p-1.5 rounded-full bg-black/40 backdrop-blur hover:bg-black/60 hover:scale-125 active:scale-90 transition-all">{em}</button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3 items-center">
                    <button onClick={e => { e.stopPropagation(); handleReact(cs._id); }} className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur active:scale-95">
                      <Heart className={`w-6 h-6 ${cs.likes?.some(l => l._id === user._id || l === user._id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setShowReactions(!showReactions); pauseProgress(); }} className="p-2.5 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur active:scale-95">
                      <Smile className="w-6 h-6" />
                    </button>
                    <form className="flex-1 flex" onSubmit={e => { e.stopPropagation(); handleComment(e, cs._id); }}>
                      <input type="text" placeholder="Reply..." value={commentText} onChange={e => setCommentText(e.target.value)} onFocus={pauseProgress} onBlur={startProgress} className="w-full bg-black/40 border border-white/20 rounded-full px-5 py-3 text-sm text-white placeholder-white/70 outline-none focus:bg-black/60 focus:border-white/40 backdrop-blur" onClick={e => e.stopPropagation()} />
                    </form>
                  </div>
                </div>
              )}

              {/* Viewers Overlay */}
              {showViewers && isOwn && (
                <div className="absolute inset-0 bg-dark-900/95 z-30 p-4 flex flex-col backdrop-blur-md">
                  <div className="flex justify-between items-center mb-6 mt-4">
                    <h3 className="text-xl text-white font-bold">Story Views</h3>
                    <button onClick={e => { e.stopPropagation(); setShowViewers(false); startProgress(); }} className="text-white/60 hover:text-white bg-white/10 rounded-full p-2"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {cs.viewers?.map(v => (
                      <div key={v._id||v} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl hover:bg-white/10"><img src={v.profilePhoto||'/default-avatar.png'} className="w-10 h-10 bg-dark-800 rounded-full object-cover border border-white/10" alt="" /><span className="text-white font-medium">{v.fullName}</span></div>
                    ))}
                    {(!cs.viewers||cs.viewers.length===0) && <div className="h-full flex flex-col items-center justify-center text-dark-400"><Eye className="w-12 h-12 mb-4 opacity-50" /><p className="font-medium">No views yet.</p></div>}
                  </div>
                </div>
              )}

              {/* Comments Overlay */}
              {showComments && isOwn && (
                <div className="absolute inset-0 bg-dark-900/95 z-30 p-4 flex flex-col backdrop-blur-md">
                  <div className="flex justify-between items-center mb-6 mt-4">
                    <h3 className="text-xl text-white font-bold">Comments</h3>
                    <button onClick={e => { e.stopPropagation(); setShowComments(false); startProgress(); }} className="text-white/60 hover:text-white bg-white/10 rounded-full p-2"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                    {cs.comments?.map(c => (
                      <div key={c._id} className="flex gap-3 p-3 bg-white/5 rounded-2xl hover:bg-white/10">
                        <img src={c.user?.profilePhoto||'/default-avatar.png'} className="w-10 h-10 bg-dark-800 rounded-full object-cover border border-white/10 flex-shrink-0" alt="" />
                        <div className="flex flex-col"><span className="text-white font-medium text-sm">{c.user?.fullName}</span><span className="text-dark-200 text-sm mt-1">{c.text}</span><span className="text-dark-500 text-[10px] mt-2">{format(c.createdAt)}</span></div>
                      </div>
                    ))}
                    {(!cs.comments||cs.comments.length===0) && <div className="h-full flex flex-col items-center justify-center text-dark-400"><MessageCircle className="w-12 h-12 mb-4 opacity-50" /><p className="font-medium">No comments yet.</p></div>}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Nav */}
            <button onClick={prevStory} className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/80"><ChevronLeft className="w-6 h-6" /></button>
            <button onClick={nextStory} className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white hover:bg-black/80"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>
      )}

      {/* Hidden inputs for file upload */}
      <input 
        type="file" 
        ref={galleryInputRef} 
        className="hidden" 
        accept="image/*,video/*" 
        onChange={handleFileUpload} 
      />
      <input 
        type="file" 
        ref={cameraInputRef} 
        className="hidden" 
        accept="image/*,video/*" 
        capture="environment" 
        onChange={handleFileUpload} 
      />

      {/* Story Creator Modal */}
      {showCreator && storyFile && (
        <StoryCreator 
          mediaFile={storyFile} 
          onClose={() => { setShowCreator(false); setStoryFile(null); }}
          onCreated={() => { setShowCreator(false); setStoryFile(null); fetchStories(); }}
        />
      )}

      {/* Background Audio */}
      <audio 
        ref={audioRef} 
        loop 
        onPlay={() => console.log('Audio playback started')}
        onError={(e) => console.error('Audio playback error:', e)}
        className="hidden" 
      />
    </div>
  );
};

export default StorySection;
