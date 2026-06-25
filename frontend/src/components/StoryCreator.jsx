import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { storyAPI } from '../utils/api';
import { X, Type, Music, Smile, Send, ChevronDown, Palette, AlignCenter, Crop, Square, Check } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import ImageEditor from './ImageEditor';

const FONTS = [
  { name: 'Inter', label: 'Modern' },
  { name: 'Georgia', label: 'Serif' },
  { name: 'Courier New', label: 'Mono' },
  { name: 'Comic Sans MS', label: 'Fun' },
  { name: 'Impact', label: 'Bold' },
];

const TEXT_COLORS = [
  '#ffffff', '#000000', '#FF6B6B', '#FFE66D', '#4ECDC4',
  '#A78BFA', '#F472B6', '#FB923C', '#34D399', '#60A5FA',
  '#E879F9', '#FCD34D',
];

const EMOJI_LIST = [
  '😀', '😂', '🥰', '😎', '🤩', '😜', '🥳', '😇',
  '🔥', '❤️', '💯', '⭐', '🎉', '🌟', '💖', '🦋',
  '🌈', '🍕', '🎵', '🎸', '🏆', '💎', '🚀', '✨',
  '👑', '🌸', '🍀', '💫', '🎯', '🎨', '💪', '👏',
];

const MUSIC_TRACKS = [
  { name: 'Chill Vibes', artist: 'LoFi Beats', mood: '🎧', url: 'https://raw.githubusercontent.com/rafaelreis-hotmart/Audio-Sample-files/master/sample.mp3' },
  { name: 'Summer Love', artist: 'Tropical House', mood: '🌴', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { name: 'Midnight Drive', artist: 'Synthwave', mood: '🌙', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
  { name: 'Feel Good', artist: 'Pop Energy', mood: '⚡', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  { name: 'Golden Hour', artist: 'Acoustic Soul', mood: '🌅', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' },
  { name: 'Neon Dreams', artist: 'Electronic', mood: '💜', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3' },
  { name: 'Heartbeat', artist: 'R&B Smooth', mood: '💗', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3' },
  { name: 'Adventure Time', artist: 'Indie Folk', mood: '🏔️', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
  { name: 'City Lights', artist: 'Jazz Hop', mood: '🌃', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3' },
  { name: 'Cloud Nine', artist: 'Dream Pop', mood: '☁️', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3' },
];

const StoryCreator = ({ mediaFile, onClose, onCreated }) => {
  const { user } = useAuth();
  const [previewUrl, setPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [activeTab, setActiveTab] = useState(null); // 'text', 'emoji', 'music'
  const [uploading, setUploading] = useState(false);
  const [showEditor, setShowEditor] = useState(true);
  const [editedFile, setEditedFile] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isMediaLoading, setIsMediaLoading] = useState(false);

  // Text overlay state
  const [textOverlay, setTextOverlay] = useState({
    text: '', fontFamily: 'Inter', color: '#ffffff', fontSize: 24, position: 'center', x: 50, y: 50, showBackground: false
  });

  // Dragging state
  const containerRef = useRef(null);
  const [dragItem, setDragItem] = useState(null); // { type: 'text'|'music'|'sticker', id?: number }

  // Stickers
  const [stickers, setStickers] = useState([]);

  // Music
  const [selectedMusic, setSelectedMusic] = useState(null);
  const previewAudioRef = useRef(null);

  // Caption
  const [caption, setCaption] = useState('');

  useEffect(() => {
    if (selectedMusic?.url) {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = selectedMusic.url;
        previewAudioRef.current.load();
        previewAudioRef.current.play().catch(e => console.log('Preview audio blocked:', e));
      }
    } else {
      if (previewAudioRef.current) previewAudioRef.current.pause();
    }
    
    return () => {
      if (previewAudioRef.current) previewAudioRef.current.pause();
    };
  }, [selectedMusic]);

  useEffect(() => {
    const file = editedFile || mediaFile;
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setMediaType(type);
      
      // Video duration check
      if (type === 'video') {
        setIsMediaLoading(true);
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          setIsMediaLoading(false);
          if (video.duration > 61) {
            alert('Video must be less than 60 seconds');
            onClose();
          }
        };
        video.onerror = () => {
          setIsMediaLoading(false);
          alert('Failed to load video metadata.');
          onClose();
        };
        video.src = URL.createObjectURL(file);
      }

      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [mediaFile, editedFile]);

  const handleEditorSave = (file) => {
    setEditedFile(file);
    setShowEditor(false);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
  };

  const addSticker = (emoji) => {
    setStickers(prev => [...prev, {
      emoji,
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      id: Date.now()
    }]);
  };

  const removeSticker = (id) => {
    setStickers(prev => prev.filter(s => s.id !== id));
  };

  const handleDragStart = (e, type, id = null) => {
    e.preventDefault();
    setDragItem({ type, id });
  };

  const handleDragMove = (e) => {
    if (!dragItem || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;
    
    // Calculate percentage position
    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;
    
    // Clamp values between 5% and 95% to keep inside
    x = Math.max(5, Math.min(95, x));
    y = Math.max(5, Math.min(95, y));

    if (dragItem.type === 'text') {
      setTextOverlay(prev => ({ ...prev, x, y, position: 'custom' }));
    } else if (dragItem.type === 'music') {
      setSelectedMusic(prev => ({ ...prev, x, y }));
    } else if (dragItem.type === 'sticker') {
      setStickers(prev => prev.map(s => s.id === dragItem.id ? { ...s, x, y } : s));
    }
  };

  const handleDragEnd = () => {
    setDragItem(null);
  };

  const handlePublish = async () => {
    if (!mediaFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', editedFile || mediaFile); // Backend uses 'image' field for both media types
      formData.append('caption', caption);

      if (textOverlay.text.trim()) {
        formData.append('textOverlay', JSON.stringify(textOverlay));
      }
      if (stickers.length > 0) {
        formData.append('stickers', JSON.stringify(stickers.map(s => ({ emoji: s.emoji, x: s.x, y: s.y }))));
      }
      if (selectedMusic && selectedMusic.url) {
        console.log('Attaching music to story:', selectedMusic);
        formData.append('music', JSON.stringify({
          ...selectedMusic,
          x: selectedMusic.x || 4,
          y: selectedMusic.y || 70
        }));
      }

      const { data } = await storyAPI.createStory(formData);
      console.log('Story created successfully:', data);
      setShowSuccess(true);
      setTimeout(() => {
        onCreated?.();
      }, 2000);
    } catch (err) {
      console.error('Story creation error:', err);
      setError(err.response?.data?.message || 'Failed to create story. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const textPositionStyle = {
    top: textOverlay.position === 'custom' ? `${textOverlay.y}%` : textOverlay.position === 'top' ? '15%' : textOverlay.position === 'center' ? '50%' : 'auto',
    bottom: textOverlay.position === 'bottom' ? '20%' : 'auto',
    transform: textOverlay.position === 'center' ? 'translate(-50%, -50%)' : textOverlay.position === 'custom' ? 'translate(-50%, -50%)' : 'translateX(-50%)',
    left: textOverlay.position === 'custom' ? `${textOverlay.x}%` : '50%',
  };

  if (showEditor && mediaFile && mediaType === 'image') {
    return (
      <ImageEditor
        imageFile={mediaFile}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-[#0D0D12] flex flex-col animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-30">
        <button onClick={onClose} className="p-2 text-white/80 hover:text-white transition">
          <X className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center flex-1">
          {error && (
            <div className="bg-rose-500/90 text-white text-[10px] px-3 py-1 rounded-full animate-bounce mb-1">
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            {selectedMusic && (
              <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-full px-3 py-1.5 text-xs text-white">
                <Music className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{selectedMusic.name}</span>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={handlePublish}
          disabled={uploading || isMediaLoading}
          className="flex items-center gap-2 bg-gradient-to-r from-[#5C67FF] to-[#8B5CF6] px-5 py-2.5 rounded-full text-white text-sm font-bold shadow-lg shadow-[#5C67FF]/30 active:scale-95 transition-transform disabled:opacity-50"
        >
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isMediaLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isMediaLoading ? 'Processing...' : 'Share'}
        </button>
      </div>

      {/* Preview Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative flex items-center justify-center overflow-hidden touch-none bg-[#0D0D12]"
        onMouseMove={handleDragMove}
        onTouchMove={handleDragMove}
        onMouseUp={handleDragEnd}
        onTouchEnd={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
        {/* Blurred background to prevent the 'only black/dark' look */}
        {previewUrl && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 blur-3xl scale-110 z-0"
            style={{ backgroundImage: `url(${previewUrl})` }}
          />
        )}
        
        {isMediaLoading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-tribe-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-white font-medium">Preparing media...</p>
          </div>
        )}
        {previewUrl && (
          mediaType === 'video' ? (
            <video src={previewUrl} className="w-full h-full object-contain relative z-10" autoPlay loop muted playsInline />
          ) : (
            <img src={previewUrl} alt="" className="w-full h-full object-contain pointer-events-none relative z-10" />
          )
        )}

        {/* Text Overlay Preview */}
        {textOverlay.text && (
          <div
            className={`absolute z-20 px-5 py-3 text-center max-w-[85%] cursor-move select-none transition-transform ${dragItem?.type === 'text' ? 'scale-105' : ''}`}
            onMouseDown={(e) => handleDragStart(e, 'text')}
            onTouchStart={(e) => handleDragStart(e, 'text')}
            style={{
              ...textPositionStyle,
              fontFamily: textOverlay.fontFamily,
              fontSize: `${textOverlay.fontSize}px`,
              color: textOverlay.color,
              textShadow: textOverlay.color === '#000000' ? 'none' : '0 2px 8px rgba(0,0,0,0.7)',
              lineHeight: 1.3,
              wordBreak: 'break-word',
              touchAction: 'none'
            }}
          >
            <span className={`${textOverlay.showBackground ? 'bg-black/30 backdrop-blur-sm' : ''} rounded-lg px-3 py-1.5 inline-block`}>
              {textOverlay.text}
            </span>
          </div>
        )}

        {/* Sticker Previews */}
        {stickers.map(s => (
          <div
            key={s.id}
            className={`absolute z-20 text-4xl cursor-move hover:scale-110 transition-transform select-none ${dragItem?.id === s.id ? 'scale-125 z-30' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, transform: 'translate(-50%, -50%)', touchAction: 'none' }}
            onMouseDown={(e) => handleDragStart(e, 'sticker', s.id)}
            onTouchStart={(e) => handleDragStart(e, 'sticker', s.id)}
            onDoubleClick={() => removeSticker(s.id)}
            title="Double tap to remove"
          >
            {s.emoji}
          </div>
        ))}

        {/* Music Badge */}
        {selectedMusic && (
          <div 
            className={`absolute z-20 flex items-center gap-2.5 bg-black/50 backdrop-blur-md rounded-full px-4 py-2.5 border border-white/10 cursor-move select-none ${dragItem?.type === 'music' ? 'scale-105 shadow-xl ring-2 ring-[#5C67FF]/50' : ''}`}
            style={{ 
              left: `${selectedMusic.x || 4}%`, 
              top: `${selectedMusic.y || 70}%`, 
              transform: dragItem?.type === 'music' ? 'translate(-10px, -10px)' : 'none',
              touchAction: 'none'
            }}
            onMouseDown={(e) => handleDragStart(e, 'music')}
            onTouchStart={(e) => handleDragStart(e, 'music')}
          >
            <div className="w-8 h-8 bg-gradient-to-br from-[#5C67FF] to-[#E879F9] rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '3s' }}>
              <Music className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-bold leading-tight">{selectedMusic.name}</p>
              <p className="text-white/60 text-[10px]">{selectedMusic.artist}</p>
            </div>
          </div>
        )}
      </div>

      {/* Caption Input */}
      <div className="px-4 py-2 bg-black/60 backdrop-blur">
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Add a caption..."
          maxLength={150}
          className="w-full bg-white/10 border border-white/15 rounded-full px-5 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-[#5C67FF]/50 transition"
        />
      </div>

      {/* Tool Tabs */}
      <div className="bg-[#0D0D12] border-t border-white/5">
        <div className="flex justify-center gap-1 px-4 py-2">
          {[
            { id: 'edit', icon: Crop, label: 'Edit', action: () => setShowEditor(true) },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'emoji', icon: Smile, label: 'Stickers' },
            { id: 'music', icon: Music, label: 'Music' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => tab.action ? tab.action() : setActiveTab(activeTab === tab.id ? null : tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-[#5C67FF] text-white shadow-lg shadow-[#5C67FF]/30'
                  : 'bg-white/8 text-white/60 hover:text-white hover:bg-white/12'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Text Panel */}
        {activeTab === 'text' && (
          <div className="px-4 pb-4 pt-2 space-y-3 animate-fade-in">
            <input
              type="text"
              value={textOverlay.text}
              onChange={(e) => setTextOverlay(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Type your text..."
              maxLength={100}
              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#5C67FF]/50 placeholder-white/40"
              autoFocus
            />
            {/* Font Selector */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {FONTS.map(f => (
                <button
                  key={f.name}
                  onClick={() => setTextOverlay(prev => ({ ...prev, fontFamily: f.name }))}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                    textOverlay.fontFamily === f.name
                      ? 'bg-[#5C67FF] text-white'
                      : 'bg-white/8 text-white/60 hover:bg-white/15'
                  }`}
                  style={{ fontFamily: f.name }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {/* Color Picker */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {TEXT_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setTextOverlay(prev => ({ ...prev, color: c }))}
                  className={`w-8 h-8 rounded-full flex-shrink-0 border-2 transition-transform ${
                    textOverlay.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            {/* Position & Size */}
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-white/8 rounded-xl p-1">
                {['top', 'center', 'bottom'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => setTextOverlay(prev => ({ ...prev, position: pos }))}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition ${
                      textOverlay.position === pos ? 'bg-[#5C67FF] text-white' : 'text-white/50 hover:text-white'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={() => setTextOverlay(prev => ({ ...prev, showBackground: !prev.showBackground }))}
                  className={`p-2 rounded-lg transition-all ${textOverlay.showBackground ? 'bg-[#5C67FF] text-white' : 'bg-white/8 text-white/50'}`}
                  title="Toggle background box"
                >
                  <Square className="w-4 h-4" />
                </button>
                <span className="text-white/40 text-[10px] uppercase tracking-wider ml-2">Size</span>
                <input
                  type="range"
                  min="14"
                  max="48"
                  value={textOverlay.fontSize}
                  onChange={(e) => setTextOverlay(prev => ({ ...prev, fontSize: Number(e.target.value) }))}
                  className="w-24 accent-[#5C67FF]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Emoji Panel */}
        {activeTab === 'emoji' && (
          <div className="px-4 pb-4 pt-2 animate-fade-in">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2 font-semibold">Tap to add sticker</p>
            <div className="grid grid-cols-8 gap-2">
              {EMOJI_LIST.map(e => (
                <button
                  key={e}
                  onClick={() => addSticker(e)}
                  className="text-2xl p-2 rounded-xl hover:bg-white/10 transition-colors active:scale-90"
                >
                  {e}
                </button>
              ))}
            </div>
            {stickers.length > 0 && (
              <p className="text-white/30 text-[10px] mt-2 text-center">{stickers.length} sticker{stickers.length > 1 ? 's' : ''} added • tap on preview to remove</p>
            )}
          </div>
        )}

        {/* Music Panel */}
        {activeTab === 'music' && (
          <div className="px-4 pb-4 pt-2 animate-fade-in max-h-[250px] overflow-y-auto custom-scrollbar">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-2 font-semibold">Choose a mood</p>
            <div className="space-y-1.5">
              {MUSIC_TRACKS.map(track => (
                <button
                  key={track.name}
                  onClick={() => setSelectedMusic(selectedMusic?.name === track.name ? null : track)}
                  className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                    selectedMusic?.name === track.name
                      ? 'bg-[#5C67FF]/20 border border-[#5C67FF]/40'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">{track.mood}</span>
                  <div className="text-left flex-1">
                    <p className="text-white text-sm font-semibold">{track.name}</p>
                    <p className="text-white/50 text-xs">{track.artist}</p>
                  </div>
                  {selectedMusic?.name === track.name && (
                    <div className="flex gap-0.5">
                      {[1,2,3].map(i => (
                        <div key={i} className="w-0.5 bg-[#5C67FF] rounded-full animate-pulse" style={{ height: `${10 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <audio ref={previewAudioRef} loop className="hidden" />

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in">
            <div className="bg-[#1C1C28] rounded-[32px] p-8 flex flex-col items-center gap-4 shadow-2xl border border-white/10 scale-in-center">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-bounce">
                <Check className="w-10 h-10" strokeWidth={3} />
              </div>
              <h2 className="text-white text-xl font-bold">Post Successful!</h2>
              <p className="text-white/60 text-sm">Your story is now live.</p>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoryCreator;
