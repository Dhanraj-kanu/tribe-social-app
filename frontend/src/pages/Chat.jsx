import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import { useCall } from '../context/CallContext';
import { chatAPI } from '../utils/api';
import { 
  Search, Plus, Users, ArrowLeft, Send, Smile, Check, CheckCheck, 
  MessageCircle, Phone, Video, PhoneIncoming, PhoneOutgoing, 
  PhoneMissed, PhoneOff, Edit2, Trash2, X, Eye, Image as ImageIcon, 
  File, Play, Paperclip, ExternalLink, MoreVertical, Info, Mic, MicOff, User, LogOut
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { format } from 'timeago.js';
import { motion, AnimatePresence } from 'framer-motion';

const Chat = () => {
  const { user } = useAuth();
  const { 
    conversations, activeConversation, messages, typingUsers, onlineUsers, 
    setActiveConversation, loadConversations, loadMessages, sendMessage, 
    sendFile, editMessage, deleteMessage, startTyping, stopTyping, markAsRead,
    kickMember, leaveGroup, startGroupMeeting, endGroupMeeting 
  } = useChat();

  const { 
    callState, callType, remoteUser, callDuration, isMuted, isVideoOff, 
    localVideoRef, remoteVideoRef, startCall, answerCall, rejectCall, endCall, 
    toggleMute, toggleVideo, groupStreams, joinGroupMeeting
  } = useCall();
  
  const [messageText, setMessageText] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const inputRef = useRef(null);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showMeetingRoom, setShowMeetingRoom] = useState(false);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  


  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation._id);
      markAsRead(activeConversation._id);
      // Auto-open meeting room if admin just started it
      if (activeConversation.activeMeeting?.isActive && 
          activeConversation.activeMeeting.startedBy === user._id &&
          !showMeetingRoom) {
        setShowMeetingRoom(true);
        joinGroupMeeting(activeConversation);
      }
    }
  }, [activeConversation]);

  const getOtherUser = (conv) => {
    if (!conv || conv.isGroup) return null;
    return conv.participants?.find(p => p._id !== user._id);
  };

  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConversation) return;

    if (editingMessageId) {
      editMessage(editingMessageId, messageText.trim());
      setEditingMessageId(null);
    } else {
      sendMessage(activeConversation._id, messageText.trim());
    }

    setMessageText('');
    setShowEmoji(false);
    stopTyping(activeConversation._id);
  };

  const [showEmoji, setShowEmoji] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeConversation) return;

    setIsUploading(true);
    try {
      await sendFile(activeConversation._id, '', file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const [isTyping, setIsTyping] = useState(false);
  const handleTyping = (e) => {
    setMessageText(e.target.value);
    if (!activeConversation) return;

    if (!isTyping) {
      setIsTyping(true);
      startTyping(activeConversation._id);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping(activeConversation._id);
      setIsTyping(false);
    }, 2000);
  };

  const getConvName = (conv) => {
    if (conv.isGroup) return conv.groupName;
    return conv.participants?.find(p => p._id !== user._id)?.fullName || 'Unknown';
  };

  const getAvatar = (conv, size = "w-12 h-12") => {
    if (conv.isGroup) {
      return (
        <div className={`${size} rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold shadow-lg`}>
          <Users className="w-1/2 h-1/2" />
        </div>
      );
    }
    const other = conv.participants?.find(p => p._id !== user._id);
    if (other?.profilePhoto) return <img src={other.profilePhoto} alt="" className={`${size} rounded-full object-cover border-2 border-dark-800 shadow-lg`} />;
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white font-bold shadow-lg`}>
        {other?.fullName?.charAt(0)?.toUpperCase() || '?'}
      </div>
    );
  };

  const isOnline = (conv) => {
    if (conv.isGroup) return false;
    const other = conv.participants?.find(p => p._id !== user._id);
    return other?.isOnline || onlineUsers[other?._id];
  };

  const getMsgStatus = (msg) => {
    if ((msg.sender?._id || msg.sender) !== user._id) return null;
    // Optimistic "sending" state
    if (msg.status === 'sending') return <div className="w-3.5 h-3.5 border border-dark-500 border-t-transparent rounded-full animate-spin" />;
    // Seen = blue double ticks
    if (msg.status === 'seen') return <CheckCheck className="w-4 h-4 text-blue-400" />;
    // Delivered = grey double ticks
    if (msg.status === 'delivered') return <CheckCheck className="w-4 h-4 text-dark-400" />;
    // Sent = single grey tick
    return <Check className="w-4 h-4 text-dark-400" />;
  };

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => 
      !searchQuery || getConvName(c).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [conversations, searchQuery]);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length < 1) return;
    try {
      const { data } = await chatAPI.createGroup({ groupName: groupName.trim(), participantIds: selectedMembers });
      loadConversations();
      setActiveConversation(data);
      setShowNewGroup(false);
      setGroupName('');
      setSelectedMembers([]);
    } catch (err) { console.error(err); }
  };

  // Voice Recording Logic
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        
        setIsUploading(true);
        try {
          await sendFile(activeConversation._id, '', audioFile);
        } catch (err) { console.error(err); }
        finally { setIsUploading(false); }

        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone');
      console.error(err);
    }
  };

  const stopRecording = (shouldSend = true) => {
    if (mediaRecorderRef.current && isRecording) {
      if (!shouldSend) {
        // Just stop and clear
        mediaRecorderRef.current.onstop = () => {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        };
      }
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden" id="chat-page">
      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-dark-800 bg-dark-900/50 backdrop-blur-xl ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-dark-50">Messages</h1>
            <button onClick={() => setShowNewGroup(true)} className="p-2 hover:bg-dark-800 rounded-xl transition text-dark-400 hover:text-white">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input 
              type="text" 
              className="w-full bg-dark-800/50 border border-dark-700/50 rounded-xl py-2 pl-10 pr-4 text-sm text-dark-50 placeholder-dark-600 focus:ring-1 focus:ring-tribe-500/50 outline-none transition-all" 
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2">
          {filteredConversations.map(conv => (
            <motion.div
              key={conv._id}
              whileHover={{ x: 4 }}
              onClick={() => setActiveConversation(conv)}
              className={`p-3 rounded-2xl cursor-pointer mb-1 transition-all flex items-center gap-3 ${activeConversation?._id === conv._id ? 'bg-tribe-500/10' : 'hover:bg-dark-800/40'}`}
            >
              <div className="relative flex-shrink-0">
                {getAvatar(conv)}
                {isOnline(conv) && <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-dark-900" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h3 className={`text-sm font-semibold truncate ${activeConversation?._id === conv._id ? 'text-tribe-400' : 'text-dark-50'}`}>{getConvName(conv)}</h3>
                  {conv.lastMessage && <span className="text-[10px] text-dark-500 font-medium">{format(conv.lastMessage.createdAt)}</span>}
                </div>
                <p className="text-xs text-dark-400 truncate">
                  {typingUsers[conv._id] ? (
                    <span className="text-tribe-400 animate-pulse font-medium">typing...</span>
                  ) : (
                    conv.lastMessage?.text || (conv.lastMessage?.file ? '📎 Attachment' : 'No messages yet')
                  )}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-dark-950 ${!activeConversation ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeConversation ? (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-8">
            <div className="w-20 h-20 bg-dark-900 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-dark-800 shadow-2xl">
              <MessageCircle className="w-10 h-10 text-tribe-500" />
            </div>
            <h2 className="text-xl font-bold text-dark-50 mb-2">Select a Conversation</h2>
            <p className="text-dark-400 max-w-xs mx-auto text-sm leading-relaxed">Connect with your tribe instantly. Select a friend to start chatting.</p>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <header className="h-16 border-b border-dark-800 px-4 flex items-center justify-between bg-dark-950/80 backdrop-blur-lg z-20">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveConversation(null)} className="md:hidden p-2 -ml-2 text-dark-400 hover:text-white transition">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  {getAvatar(activeConversation, "w-10 h-10")}
                  {isOnline(activeConversation) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-dark-950" />}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-dark-50">{getConvName(activeConversation)}</h2>
                  <p className="text-[10px] font-medium">
                    {typingUsers[activeConversation._id] ? (
                      <span className="text-tribe-400 animate-pulse">is typing...</span>
                    ) : isOnline(activeConversation) ? (
                      <span className="text-emerald-400">Active now</span>
                    ) : (
                      <span className="text-dark-500">Last seen {format(activeConversation.participants?.find(p => p._id !== user._id)?.lastSeen || new Date())}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button 
                  className={`p-2.5 transition rounded-xl ${showMessageSearch ? 'bg-tribe-500/20 text-tribe-400' : 'text-dark-400 hover:text-white'}`}
                  onClick={() => {
                    setShowMessageSearch(!showMessageSearch);
                    if (showMessageSearch) setMessageSearchQuery('');
                  }}
                >
                  <Search className="w-5 h-5" />
                </button>
                
                {/* 1-on-1 Calls */}
                {!activeConversation.isGroup && (
                  <>
                    <button className="p-2.5 text-dark-400 hover:text-emerald-400 transition rounded-xl" onClick={() => startCall(getOtherUser(activeConversation), 'voice')}><Phone className="w-5 h-5" /></button>
                    <button className="p-2.5 text-dark-400 hover:text-tribe-400 transition rounded-xl" onClick={() => startCall(getOtherUser(activeConversation), 'video')}><Video className="w-5 h-5" /></button>
                  </>
                )}

                {/* Group Admin Meeting Buttons */}
                {activeConversation.isGroup && (activeConversation.groupAdmin === user._id || activeConversation.groupAdmin?._id === user._id) && (
                  <>
                    <button 
                      className="p-2.5 text-dark-400 hover:text-emerald-400 transition rounded-xl" 
                      onClick={() => {
                        startGroupMeeting(activeConversation._id, 'voice');
                        setShowMeetingRoom(true);
                      }}
                      title="Start Voice Meeting"
                    >
                      <Phone className="w-5 h-5" />
                    </button>
                    <button 
                      className="p-2.5 text-dark-400 hover:text-tribe-400 transition rounded-xl" 
                      onClick={() => {
                        startGroupMeeting(activeConversation._id, 'video');
                        setShowMeetingRoom(true);
                      }}
                      title="Start Video Meeting"
                    >
                      <Video className="w-5 h-5" />
                    </button>
                  </>
                )}

                <button className="p-2.5 text-dark-400 hover:text-white transition rounded-xl" onClick={() => setShowProfileInfo(true)}><Info className="w-5 h-5" /></button>
              </div>
            </header>

            {/* Group Meeting Banner */}
            {activeConversation.isGroup && activeConversation.activeMeeting?.isActive && (
              <div className="bg-tribe-600/10 border-b border-tribe-500/20 p-3 px-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-tribe-500/20 text-tribe-400">
                    {activeConversation.activeMeeting.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-tribe-400 uppercase tracking-wider">Live {activeConversation.activeMeeting.type} meeting</p>
                    <p className="text-[10px] text-dark-400">Join to connect with the group</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowMeetingRoom(true);
                    joinGroupMeeting(activeConversation);
                  }}
                  className="px-4 py-1.5 bg-tribe-500 hover:bg-tribe-600 text-white text-[11px] font-bold rounded-full transition-all shadow-lg shadow-tribe-500/20"
                >
                  Join Now
                </button>
              </div>
            )}


            {/* In-Chat Search Bar */}
            {showMessageSearch && (
              <div className="bg-dark-900 border-b border-dark-800 p-2 px-4 flex items-center gap-3 animate-fade-in">
                <Search className="w-4 h-4 text-dark-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Search in this chat..." 
                  className="flex-1 bg-transparent border-none text-sm text-dark-50 placeholder-dark-500 outline-none"
                  value={messageSearchQuery}
                  onChange={e => setMessageSearchQuery(e.target.value)}
                />
                <button onClick={() => { setShowMessageSearch(false); setMessageSearchQuery(''); }} className="text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar space-y-1">
              <AnimatePresence initial={false}>
                {messages.filter(msg => !messageSearchQuery || msg.text?.toLowerCase().includes(messageSearchQuery.toLowerCase())).map((msg, index, filteredArr) => {
                  const isMine = (msg.sender?._id || msg.sender) === user._id;
                  const showAvatar = !isMine && (index === 0 || (filteredArr[index - 1]?.sender?._id || filteredArr[index - 1]?.sender) !== (msg.sender?._id || msg.sender));
                  
                  if (msg.callInfo?.callStatus) {
                    const CallIcon = msg.callInfo.callStatus === 'missed' ? PhoneMissed : PhoneOff;
                    return (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} key={msg._id || index} className="flex justify-center my-6">
                        <div className="flex items-center gap-3 px-6 py-2 rounded-full border border-dark-800 bg-dark-900/40 backdrop-blur-sm text-[10px] font-bold text-dark-400 uppercase tracking-widest">
                          <CallIcon className="w-3.5 h-3.5" />
                          {msg.callInfo.callType} {msg.callInfo.callStatus} · {msg.callInfo.duration}s
                        </div>
                      </motion.div>
                    );
                  }

                  return (
                    <motion.div
                      key={msg._id || index}
                      initial={{ opacity: 0, x: isMine ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end mb-0.5`}
                    >
                      <div className="w-8 flex-shrink-0">
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full overflow-hidden shadow-lg border border-dark-800">
                             {msg.sender?.profilePhoto ? <img src={msg.sender.profilePhoto} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-dark-800 flex items-center justify-center text-[10px] text-dark-50 font-bold">{msg.sender?.fullName?.charAt(0)}</div>}
                          </div>
                        )}
                      </div>

                      <div className={`max-w-[75%] md:max-w-[60%] group relative ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-2.5 shadow-sm transition-all ${
                          isMine 
                          ? 'bg-gradient-to-br from-tribe-500 to-tribe-600 text-white rounded-2xl rounded-br-sm' 
                          : 'bg-dark-800 text-dark-100 rounded-2xl rounded-bl-sm border border-dark-700/30'
                        }`}>
                          {msg.file && (
                            <div className="mb-2">
                              {msg.fileType === 'image' && <img src={msg.file} alt="" className="rounded-lg max-h-72 w-full object-cover cursor-zoom-in" onClick={() => window.open(msg.file, '_blank')} />}
                              {msg.fileType === 'video' && <video src={msg.file} controls className="rounded-lg max-h-72 w-full" />}
                              {msg.fileType === 'pdf' && (
                                <a href={msg.file} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-black/20 rounded-xl hover:bg-black/30 transition">
                                  <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><File className="w-5 h-5" /></div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate text-white">Document.pdf</p>
                                    <p className="text-[10px] opacity-60 uppercase tracking-tighter">PDF Viewer</p>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}
                          {msg.file && msg.fileType === 'audio' && (
                            <div className="py-1">
                              <audio src={msg.file} controls className={`w-full max-w-[240px] h-8 ${isMine ? 'invert brightness-200' : ''}`} />
                            </div>
                          )}
                          {msg.text && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                          
                          <div className="flex items-center justify-end gap-1.5 mt-1.5 opacity-60">
                            <span className="text-[9px] font-bold">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isMine && getMsgStatus(msg)}
                          </div>

                          {isMine && (
                            <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 opacity-0 group-hover:opacity-100 transition flex items-center bg-dark-800/90 backdrop-blur rounded-lg border border-dark-700 overflow-hidden shadow-2xl">
                              <button onClick={() => { setEditingMessageId(msg._id); setMessageText(msg.text); }} className="p-2 hover:bg-dark-700 text-dark-400 hover:text-white transition"><Edit2 className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteMessage(msg._id)} className="p-2 hover:bg-rose-500/20 text-dark-400 hover:text-rose-400 transition"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <footer className="p-4 bg-dark-950 border-t border-dark-800 relative z-20">
              <AnimatePresence>
                {editingMessageId && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex items-center justify-between px-4 py-2 bg-tribe-500/10 border-l-4 border-tribe-500 rounded-t-xl mb-2">
                    <span className="text-xs font-bold text-tribe-400 flex items-center gap-2"><Edit2 className="w-3.5 h-3.5" /> Editing Message</span>
                    <button onClick={() => { setEditingMessageId(null); setMessageText(''); }} className="text-dark-400 hover:text-white"><X className="w-4 h-4" /></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between bg-dark-900 border border-tribe-500/50 rounded-2xl px-4 py-2 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                      <span className="text-sm font-bold text-white tracking-widest">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => stopRecording(false)} className="text-dark-400 hover:text-rose-400 font-bold text-xs uppercase transition">Cancel</button>
                      <button type="button" onClick={() => stopRecording(true)} className="p-2 bg-tribe-500 rounded-full text-white shadow-glow"><Send className="w-4 h-4" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 text-dark-400 hover:text-tribe-400 transition"><Smile className="w-5.5 h-5.5" /></button>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-dark-400 hover:text-white transition"><Paperclip className="w-5.5 h-5.5" /></button>
                    </div>

                    <div className="relative flex-1">
                      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
                      {showEmoji && (
                        <div className="absolute bottom-full left-0 mb-4 z-50">
                          <EmojiPicker 
                            onEmojiClick={(d) => setMessageText(p => p + d.emoji)} 
                            theme="dark" 
                            width={320} 
                            height={400} 
                            skinTonesDisabled 
                            previewConfig={{ showPreview: false }} 
                          />
                        </div>
                      )}
                      <input 
                        ref={inputRef}
                        type="text" 
                        className="w-full bg-dark-900 border border-dark-800 rounded-2xl py-3 px-4 text-sm text-dark-50 placeholder-dark-600 focus:ring-1 focus:ring-tribe-500/50 outline-none transition-all" 
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={handleTyping}
                      />
                    </div>

                    {messageText.trim() || isUploading ? (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        type="submit" 
                        className="p-3.5 bg-tribe-500 hover:bg-tribe-600 rounded-2xl text-white shadow-lg shadow-tribe-500/20 transition-all"
                      >
                        <Send className="w-5 h-5" />
                      </motion.button>
                    ) : (
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={startRecording}
                        className="p-3.5 bg-dark-800 hover:bg-dark-700 rounded-2xl text-dark-200 hover:text-white border border-dark-700 transition-all"
                      >
                        <Mic className="w-5 h-5" />
                      </motion.button>
                    )}
                  </>
                )}
              </form>
            </footer>
          </>
        )}
      </div>

      {/* New Group Modal */}
      {showNewGroup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-dark-50">Create Group Chat</h2>
              <button onClick={() => setShowNewGroup(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-4">
              <input className="input-field" placeholder="Group Name" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest">Select Friends</p>
                {user.friends?.map(friend => (
                  <label key={friend._id} className="flex items-center gap-3 p-3 bg-dark-800/50 hover:bg-dark-800 rounded-2xl cursor-pointer transition">
                    <input type="checkbox" className="rounded border-dark-600 text-tribe-500 focus:ring-tribe-500 bg-dark-900" checked={selectedMembers.includes(friend._id)} onChange={(e) => e.target.checked ? setSelectedMembers([...selectedMembers, friend._id]) : setSelectedMembers(selectedMembers.filter(id => id !== friend._id))} />
                    <img src={friend.profilePhoto || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full" />
                    <span className="text-sm font-medium text-dark-50">{friend.fullName}</span>
                  </label>
                ))}
              </div>
              <button onClick={handleCreateGroup} disabled={!groupName.trim() || selectedMembers.length === 0} className="btn-primary w-full py-4 mt-2">Create Group</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Profile Info Modal */}
      {showProfileInfo && activeConversation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card w-full max-w-sm flex flex-col items-center text-center relative border border-dark-700 shadow-2xl">
            <div className="absolute top-4 right-4">
              <button onClick={() => setShowProfileInfo(false)} className="text-dark-400 hover:text-white bg-dark-800 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="mb-4 mt-2">
              {getAvatar(activeConversation, "w-24 h-24")}
            </div>
            
            <h2 className="text-2xl font-bold text-dark-50 mb-1">{getConvName(activeConversation)}</h2>
            
            {activeConversation.isGroup ? (
              <>
                <p className="text-dark-400 text-sm mb-6">{activeConversation.participants?.length} members</p>
                <div className="w-full text-left max-h-48 overflow-y-auto custom-scrollbar bg-dark-900 rounded-xl p-3 border border-dark-800">
                  <p className="text-[10px] font-bold text-dark-500 uppercase tracking-widest mb-3">Participants</p>
                  {activeConversation.participants.map(p => (
                    <div key={p._id} className="flex items-center justify-between py-2 border-b border-dark-800/50 last:border-0 group/member">
                      <div className="flex items-center gap-3">
                        <img src={p.profilePhoto || '/default-avatar.png'} alt="" className="w-8 h-8 rounded-full object-cover" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-dark-50">{p.fullName}</span>
                          {(activeConversation.groupAdmin === p._id || activeConversation.groupAdmin?._id === p._id) && (
                            <span className="text-[9px] font-black text-tribe-500 uppercase tracking-tighter">Admin</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Show Remove button if current user is admin AND this member is NOT the admin */}
                        {(activeConversation.groupAdmin === user._id || activeConversation.groupAdmin?._id === user._id) && 
                         (p._id !== user._id) && (
                          <button 
                            onClick={() => {
                              if (confirm(`Remove ${p.fullName} from group?`)) {
                                kickMember(activeConversation._id, p._id);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-500/20 text-dark-400 hover:text-rose-400 rounded-lg opacity-0 group-hover/member:opacity-100 transition-all"
                            title="Remove from group"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="w-full mt-6">
                  <button 
                    onClick={() => {
                      if (confirm('Are you sure you want to leave this group?')) {
                        leaveGroup(activeConversation._id);
                        setShowProfileInfo(false);
                      }
                    }}
                    className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl border border-rose-500/20 transition-all font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Leave Group
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-dark-400 text-sm mb-6">@{getOtherUser(activeConversation)?.username}</p>
                <div className="w-full space-y-2 mt-4">
                  <button className="btn-secondary w-full flex items-center justify-center gap-2" onClick={() => window.open(`/profile/${getOtherUser(activeConversation)?._id}`, '_self')}>
                    <User className="w-4 h-4" /> View Full Profile
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
      {/* Meeting Room Modal */}
      {showMeetingRoom && activeConversation && (
        <div className="fixed inset-0 z-[200] bg-dark-950 flex flex-col items-center justify-center p-6">
          <div className="absolute top-8 left-8 flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-tribe-500/20 flex items-center justify-center">
                {activeConversation.activeMeeting?.type === 'video' ? <Video className="w-5 h-5 text-tribe-400" /> : <Phone className="w-5 h-5 text-tribe-400" />}
             </div>
             <div>
                <h3 className="text-white font-bold">{activeConversation.groupName} Meeting</h3>
                <p className="text-dark-500 text-xs tracking-widest uppercase">Connecting to Tribe Mesh...</p>
             </div>
          </div>

          <div className="flex-1 w-full flex items-center justify-center gap-8 flex-wrap max-w-4xl">
             {/* Local Video */}
             <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative group">
                <div className="w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-dark-900 border-2 border-tribe-500/50 shadow-2xl">
                   {activeConversation.activeMeeting?.type === 'video' ? (
                      <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                   ) : (
                      <div className="w-full h-full flex items-center justify-center bg-dark-800">
                         <img src={user.profilePhoto || '/default-avatar.png'} alt="" className="w-20 h-20 rounded-full object-cover" />
                      </div>
                   )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-dark-800 rounded-full border border-dark-700 shadow-xl">
                   <span className="text-[10px] font-bold text-white whitespace-nowrap">You</span>
                </div>
             </motion.div>

             {/* Remote Videos */}
             {activeConversation.participants.filter(p => p._id !== user._id).map((p, i) => {
                const remoteStream = groupStreams[p._id];
                return (
                  <motion.div 
                    key={p._id}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="relative group"
                  >
                     <div className={`w-32 h-32 md:w-48 md:h-48 rounded-2xl overflow-hidden bg-dark-900 border-2 ${remoteStream ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-dark-700'} shadow-2xl transition-all`}>
                        {activeConversation.activeMeeting?.type === 'video' && remoteStream ? (
                           <video 
                              autoPlay 
                              playsInline 
                              className="w-full h-full object-cover"
                              ref={el => { if (el) el.srcObject = remoteStream; }}
                           />
                        ) : (
                           <div className="w-full h-full flex items-center justify-center bg-dark-800">
                              <img src={p.profilePhoto || '/default-avatar.png'} alt="" className={`w-20 h-20 rounded-full object-cover ${remoteStream ? 'animate-pulse' : 'opacity-40'}`} />
                              {!remoteStream && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                  <p className="text-[8px] font-bold text-white uppercase tracking-widest">Waiting...</p>
                                </div>
                              )}
                           </div>
                        )}
                        {/* Audio fallback if not video but stream exists */}
                        {activeConversation.activeMeeting?.type === 'voice' && remoteStream && (
                          <audio autoPlay ref={el => { if (el) el.srcObject = remoteStream; }} />
                        )}
                     </div>
                     <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-dark-800 rounded-full border border-dark-700 shadow-xl">
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{p.fullName}</span>
                     </div>
                  </motion.div>
                );
             })}
          </div>

          <div className="mb-12 flex items-center gap-6">
             <button className="w-14 h-14 rounded-full bg-dark-800 flex items-center justify-center text-white hover:bg-dark-700 transition shadow-xl border border-dark-700"><Mic className="w-6 h-6" /></button>
             <button className="w-14 h-14 rounded-full bg-dark-800 flex items-center justify-center text-white hover:bg-dark-700 transition shadow-xl border border-dark-700"><Video className="w-6 h-6" /></button>
             
             {/* End/Leave Button */}
             <button 
                onClick={() => {
                  if (activeConversation.groupAdmin === user._id || activeConversation.groupAdmin?._id === user._id) {
                    if (confirm('End meeting for everyone?')) {
                      endGroupMeeting(activeConversation._id);
                      setShowMeetingRoom(false);
                    }
                  } else {
                    setShowMeetingRoom(false);
                  }
                }}
                className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition shadow-2xl shadow-rose-500/40"
             >
                <PhoneOff className="w-7 h-7" />
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
