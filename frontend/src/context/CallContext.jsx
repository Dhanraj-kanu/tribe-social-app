import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { getSocket } from '../utils/socket';
import { useAuth } from './AuthContext';

const CallContext = createContext(null);

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

// ========================
// RINGTONE GENERATOR (Web Audio API)
// ========================
class RingtonePlayer {
  constructor() {
    this.audioContext = null;
    this.intervalId = null;
    this.isPlaying = false;
  }

  _getContext() {
    if (!this.audioContext || this.audioContext.state === 'closed') {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  // Play a single beep tone
  _playTone(frequency, duration, startTime, volume = 0.3) {
    const ctx = this._getContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Smooth fade in/out to avoid clicks
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
    gainNode.gain.setValueAtTime(volume, startTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // Outgoing call: classic "ring... ring..." pattern
  playOutgoingRing() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playPattern = () => {
      try {
        const ctx = this._getContext();
        const now = ctx.currentTime;
        // Two short tones with a gap (ring-ring), then 3s silence
        this._playTone(440, 0.4, now, 0.25);        // First ring
        this._playTone(440, 0.4, now + 0.5, 0.25);   // Second ring
      } catch (e) {
        console.error('Ringtone error:', e);
      }
    };

    playPattern();
    this.intervalId = setInterval(playPattern, 3000); // Repeat every 3 seconds
  }

  // Incoming call: more attention-grabbing alternating tones
  playIncomingRing() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const playPattern = () => {
      try {
        const ctx = this._getContext();
        const now = ctx.currentTime;
        // Alternating high-low pattern for incoming
        this._playTone(523, 0.15, now, 0.35);        // C5
        this._playTone(659, 0.15, now + 0.18, 0.35);  // E5
        this._playTone(784, 0.15, now + 0.36, 0.35);  // G5
        this._playTone(659, 0.15, now + 0.54, 0.35);  // E5
        this._playTone(523, 0.15, now + 0.72, 0.35);  // C5
        this._playTone(784, 0.20, now + 0.90, 0.35);  // G5
      } catch (e) {
        console.error('Ringtone error:', e);
      }
    };

    playPattern();
    this.intervalId = setInterval(playPattern, 2000); // Repeat every 2 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isPlaying = false;
    // Don't close the context, just let it be reused
  }
}

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const [callState, setCallState] = useState('idle'); // idle, calling, incoming, connected
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [remoteUser, setRemoteUser] = useState(null); // { _id, fullName, profilePhoto }
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [groupPeers, setGroupPeers] = useState({}); // userId -> peerConnection
  const [groupStreams, setGroupStreams] = useState({}); // userId -> MediaStream

  const peerConnection = useRef(null);
  const localStream = useRef(null);
  const remoteStream = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const groupPeersRef = useRef({}); // Ref for socket handlers
  const groupStreamsRef = useRef({});
  const callTimerRef = useRef(null);
  const incomingOffer = useRef(null);
  const pendingCandidates = useRef([]);
  const ringtonePlayer = useRef(new RingtonePlayer());

  // Refs to hold latest values for use inside socket handlers (avoids stale closures)
  const callStateRef = useRef(callState);
  const remoteUserRef = useRef(remoteUser);
  const callTypeRef = useRef(callType);

  // Keep refs in sync with state
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { remoteUserRef.current = remoteUser; }, [remoteUser]);
  useEffect(() => { callTypeRef.current = callType; }, [callType]);
  useEffect(() => { groupPeersRef.current = groupPeers; }, [groupPeers]);
  useEffect(() => { groupStreamsRef.current = groupStreams; }, [groupStreams]);

  // Play/stop ringtone based on call state
  useEffect(() => {
    const rt = ringtonePlayer.current;
    if (callState === 'calling') {
      rt.playOutgoingRing();
    } else if (callState === 'incoming') {
      rt.playIncomingRing();
    } else {
      rt.stop();
    }
    return () => rt.stop();
  }, [callState]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log('📞 Call cleanup');
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => track.stop());
      localStream.current = null;
    }
    if (remoteStream.current) {
      remoteStream.current = null;
    }
    // Cleanup group peers
    Object.values(groupPeersRef.current).forEach(pc => pc.close());
    setGroupPeers({});
    setGroupStreams({});
    groupPeersRef.current = {};
    groupStreamsRef.current = {};
    ringtonePlayer.current.stop();
    pendingCandidates.current = [];
    incomingOffer.current = null;
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOff(false);
    setCallState('idle');
    setCallType(null);
    setRemoteUser(null);
    setFacingMode('user');
  }, []);

  // Ref for cleanup so socket handlers always call the latest version
  const cleanupRef = useRef(cleanup);
  useEffect(() => { cleanupRef.current = cleanup; }, [cleanup]);

  // Create peer connection
  const createPeerConnection = useCallback((targetUserId) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('📞 Sending ICE candidate');
        socket.emit('ice_candidate', {
          to: targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      console.log('📞 Remote track received');
      remoteStream.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('📞 ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        // Use ref-based cleanup to avoid stale closure
        const socket = getSocket();
        if (socket && remoteUserRef.current) {
          socket.emit('call_end', { to: remoteUserRef.current._id });
        }
        cleanupRef.current();
      }
    };

    peerConnection.current = pc;
    return pc;
  }, []);

  // Start a call (caller side)
  const startCall = useCallback(async (targetUser, type) => {
    const socket = getSocket();
    if (!socket) {
      console.error('📞 Cannot start call: socket not connected');
      alert('Connection error. Please refresh and try again.');
      return;
    }
    if (!socket.connected) {
      console.error('📞 Cannot start call: socket not connected (connected=false)');
      alert('Connection error. Please refresh and try again.');
      return;
    }

    // Check if we're in a secure context (HTTPS or localhost)
    // Mobile browsers REQUIRE HTTPS for camera/mic access
    if (!window.isSecureContext) {
      console.error('📞 Not a secure context — getUserMedia will be blocked');
      alert(
        'Calls require a secure (HTTPS) connection.\n\n' +
        'Please access the app using the https:// URL instead of http://.\n' +
        'Example: https://' + window.location.hostname + ':' + window.location.port
      );
      return;
    }

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.error('📞 navigator.mediaDevices not available');
      alert(
        'Your browser does not support camera/microphone access.\n\n' +
        'Please make sure you are using HTTPS and a modern browser.'
      );
      return;
    }

    console.log('📞 Starting', type, 'call to', targetUser.fullName);

    try {
      setCallState('calling');
      setCallType(type);
      setRemoteUser(targetUser);

      // Get local media
      const constraints = {
        audio: true,
        video: type === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection and add tracks
      const pc = createPeerConnection(targetUser._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('📞 Emitting call_user to', targetUser._id);
      socket.emit('call_user', {
        to: targetUser._id,
        offer,
        callType: type
      });
    } catch (error) {
      console.error('📞 Start call error:', error);
      if (error.name === 'NotAllowedError') {
        alert('Camera/Microphone permission denied.\n\nPlease allow access in your browser settings and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'NotReadableError') {
        alert('No camera/microphone found on this device, or the device is in use by another app.');
      } else if (error.name === 'TypeError') {
        alert('Camera/Microphone access is not available.\n\nMake sure you are using HTTPS (not HTTP).');
      } else {
        alert('Failed to start call: ' + error.message);
      }
      cleanup();
    }
  }, [createPeerConnection, cleanup]);

  // ========================
  // GROUP MEETING LOGIC (MESH)
  // ========================

  const createGroupPeer = useCallback((targetUserId, conversationId, stream, isInitiator) => {
    console.log(`📡 Creating group peer for ${targetUserId} (Initiator: ${isInitiator})`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    const socket = getSocket();

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('meeting_signal', {
          conversationId,
          to: targetUserId,
          signal: { type: 'ice-candidate', candidate: event.candidate }
        });
      }
    };

    pc.ontrack = (event) => {
      console.log(`📡 Group track from ${targetUserId}`);
      setGroupStreams(prev => ({ ...prev, [targetUserId]: event.streams[0] }));
      groupStreamsRef.current[targetUserId] = event.streams[0];
    };

    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    if (isInitiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        socket.emit('meeting_signal', {
          conversationId,
          to: targetUserId,
          signal: { type: 'offer', offer }
        });
      });
    }

    setGroupPeers(prev => ({ ...prev, [targetUserId]: pc }));
    groupPeersRef.current[targetUserId] = pc;
    return pc;
  }, []);

  const joinGroupMeeting = useCallback(async (conversation) => {
    const socket = getSocket();
    if (!socket) return;

    try {
      setCallState('connected');
      setCallType(conversation.activeMeeting?.type || 'voice');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: conversation.activeMeeting?.type === 'video' ? { facingMode: 'user' } : false
      });
      localStream.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      socket.emit('join_meeting', { conversationId: conversation._id });

      // In a mesh, the new joiner doesn't initiate. 
      // Existing participants will see 'participant_joined' and they will initiate.
    } catch (err) {
      console.error('Join meeting error:', err);
      cleanup();
    }
  }, [cleanup]);

  const handleMeetingSignal = useCallback(async (data) => {
    const { from, signal, conversationId } = data;
    const socket = getSocket();
    let pc = groupPeersRef.current[from];

    if (signal.type === 'offer') {
      pc = createGroupPeer(from, conversationId, localStream.current, false);
      await pc.setRemoteDescription(new RTCSessionDescription(signal.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('meeting_signal', { conversationId, to: from, signal: { type: 'answer', answer } });
    } else if (signal.type === 'answer') {
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(signal.answer));
    } else if (signal.type === 'ice-candidate') {
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
    }
  }, [createGroupPeer]);


  // Answer incoming call
  const answerCall = useCallback(async () => {
    const socket = getSocket();
    if (!socket || !incomingOffer.current || !remoteUserRef.current) {
      console.error('📞 Cannot answer call: missing data');
      return;
    }

    const currentRemoteUser = remoteUserRef.current;
    const currentCallType = callTypeRef.current;

    console.log('📞 Answering call from', currentRemoteUser.fullName);

    try {
      // Stop ringtone immediately
      ringtonePlayer.current.stop();
      setCallState('connected');

      // Get local media (mobile-friendly constraints)
      const constraints = {
        audio: true,
        video: currentCallType === 'video' ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode } : false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection and add tracks
      const pc = createPeerConnection(currentRemoteUser._id);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer.current));

      // Add any pending ICE candidates
      for (const candidate of pendingCandidates.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidates.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('call_answer', {
        to: currentRemoteUser._id,
        answer
      });

      // Start call timer
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('📞 Answer call error:', error);
      alert('Failed to answer call: ' + (error.name === 'NotAllowedError' ? 'Camera/Mic permission denied' : error.message));
      cleanup();
    }
  }, [createPeerConnection, cleanup]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    const socket = getSocket();
    if (socket && remoteUserRef.current) {
      socket.emit('call_reject', { to: remoteUserRef.current._id });
    }
    cleanup();
  }, [cleanup]);

  // End active call
  const endCall = useCallback(() => {
    const socket = getSocket();
    if (socket && remoteUserRef.current) {
      socket.emit('call_end', { to: remoteUserRef.current._id });
    }
    cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, []);

  // Toggle Camera (Front/Back)
  const toggleCamera = useCallback(async () => {
    if (!localStream.current || callType !== 'video') return;
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    try {
      const existingVideoTrack = localStream.current.getVideoTracks()[0];
      if (existingVideoTrack) {
        existingVideoTrack.stop();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      });
      
      const newVideoTrack = stream.getVideoTracks()[0];
      
      if (existingVideoTrack) {
        localStream.current.removeTrack(existingVideoTrack);
      }
      localStream.current.addTrack(newVideoTrack);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
      
      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(newVideoTrack);
        }
      }
      
      if (isVideoOff) {
        newVideoTrack.enabled = false;
      }
    } catch (error) {
      console.error('📞 Error switching camera:', error);
      setFacingMode(facingMode);
    }
  }, [facingMode, isVideoOff, callType]);

  // Toggle Speaker
  const toggleSpeaker = useCallback(() => {
    setIsSpeaker(prev => !prev);
  }, []);

  // Socket event listeners — registered ONCE, use refs for current state
  useEffect(() => {
    if (!user) return;

    let mounted = true;
    let socket = getSocket();

    // If socket is not ready yet, poll until it connects
    let pollInterval = null;
    if (!socket) {
      pollInterval = setInterval(() => {
        socket = getSocket();
        if (socket && mounted) {
          clearInterval(pollInterval);
          pollInterval = null;
          registerListeners(socket);
        }
      }, 500);
    } else {
      registerListeners(socket);
    }

    function registerListeners(sock) {
      console.log('📞 Registering call socket listeners');

      // Incoming call
      sock.on('incoming_call', ({ from, callerName, callerPhoto, offer, callType: type }) => {
        console.log('📞 Incoming call from', callerName, '| current state:', callStateRef.current);
        if (callStateRef.current !== 'idle') {
          // Already in a call, reject
          sock.emit('call_reject', { to: from });
          return;
        }
        setCallState('incoming');
        setCallType(type);
        setRemoteUser({ _id: from, fullName: callerName, profilePhoto: callerPhoto });
        incomingOffer.current = offer;
        // Ringtone will auto-play via the useEffect watching callState
      });

      // Call answered
      sock.on('call_answered', async ({ from, answer }) => {
        console.log('📞 Call answered by', from);
        try {
          // Stop outgoing ringtone
          ringtonePlayer.current.stop();

          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(answer));

            // Add any pending ICE candidates
            for (const candidate of pendingCandidates.current) {
              await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current = [];

            setCallState('connected');
            // Start call timer
            callTimerRef.current = setInterval(() => {
              setCallDuration(prev => prev + 1);
            }, 1000);
          }
        } catch (error) {
          console.error('📞 Handle answer error:', error);
          cleanupRef.current();
        }
      });

      // Call rejected
      sock.on('call_rejected', () => {
        console.log('📞 Call rejected');
        cleanupRef.current();
      });

      // Call failed (user offline)
      sock.on('call_failed', ({ reason }) => {
        console.log('📞 Call failed:', reason);
        alert(`Call failed: ${reason}`);
        cleanupRef.current();
      });

      // ICE candidate received
      sock.on('ice_candidate', async ({ from, candidate }) => {
        try {
          if (peerConnection.current && peerConnection.current.remoteDescription) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            // Queue candidates until remote description is set
            pendingCandidates.current.push(candidate);
          }
        } catch (error) {
          console.error('📞 ICE candidate error:', error);
        }
      });

      // Call ended by remote
      sock.on('call_ended', () => {
        console.log('📞 Call ended by remote');
        cleanupRef.current();
      });

      // Group Meeting Events
      sock.on('participant_joined', ({ userId: joinedUserId }) => {
        console.log(`📡 Participant joined: ${joinedUserId}`);
        // We are already in, so we initiate connection to the newcomer
        if (localStream.current) {
          createGroupPeer(joinedUserId, null, localStream.current, true);
        }
      });

      sock.on('meeting_signal', (data) => {
        handleMeetingSignal(data);
      });

      sock.on('participant_left', ({ userId: leftUserId }) => {
        const pc = groupPeersRef.current[leftUserId];
        if (pc) pc.close();
        setGroupPeers(prev => {
          const updated = { ...prev };
          delete updated[leftUserId];
          return updated;
        });
        setGroupStreams(prev => {
          const updated = { ...prev };
          delete updated[leftUserId];
          return updated;
        });
      });
    }

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
      const sock = getSocket();
      if (sock) {
        sock.off('incoming_call');
        sock.off('call_answered');
        sock.off('call_rejected');
        sock.off('call_failed');
        sock.off('ice_candidate');
        sock.off('call_ended');
      }
    };
  }, [user]); // Only depends on user — listeners use refs for current state

  return (
    <CallContext.Provider value={{
      callState,
      callType,
      remoteUser,
      callDuration,
      isMuted,
      isVideoOff,
      isSpeaker,
      localVideoRef,
      remoteVideoRef,
      startCall,
      answerCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      toggleCamera,
      toggleSpeaker,
      setIsSpeaker,
      groupStreams,
      joinGroupMeeting
    }}>
      {children}
    </CallContext.Provider>
  );
};
