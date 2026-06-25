import { useEffect, useRef } from 'react';
import { useCall } from '../context/CallContext';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, Volume1, SwitchCamera } from 'lucide-react';

const CallModal = () => {
  const {
    callState,
    callType,
    remoteUser,
    callDuration,
    isMuted,
    isVideoOff,
    isSpeaker,
    localVideoRef,
    remoteVideoRef,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleCamera,
    toggleSpeaker
  } = useCall();

  const localVideoElement = useRef(null);
  const remoteVideoElement = useRef(null);

  // Sync the context refs to our local DOM elements whenever callState changes
  // or whenever the component mounts/renders with a non-idle state
  useEffect(() => {
    if (callState === 'idle') return;

    // Small delay to ensure DOM elements are rendered
    const timer = setTimeout(() => {
      if (localVideoRef && localVideoElement.current) {
        localVideoRef.current = localVideoElement.current;
        // If there's already a local stream, re-attach it
        if (localVideoElement.current && !localVideoElement.current.srcObject) {
          // The stream will be set by the context when available
        }
      }
      if (remoteVideoRef && remoteVideoElement.current) {
        remoteVideoRef.current = remoteVideoElement.current;
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [callState, localVideoRef, remoteVideoRef]);

  // Also sync on every render while call is active (for safety)
  useEffect(() => {
    if (callState !== 'idle') {
      if (localVideoRef) localVideoRef.current = localVideoElement.current;
      if (remoteVideoRef) remoteVideoRef.current = remoteVideoElement.current;
    }
  });

  // Vibrate on incoming call (mobile devices)
  useEffect(() => {
    if (callState === 'incoming' && navigator.vibrate) {
      // Vibrate pattern: vibrate 500ms, pause 300ms, repeat
      const vibrateInterval = setInterval(() => {
        navigator.vibrate([500, 300, 500, 300]);
      }, 2600);
      navigator.vibrate([500, 300, 500, 300]); // Start immediately
      return () => {
        clearInterval(vibrateInterval);
        navigator.vibrate(0); // Stop vibration
      };
    }
  }, [callState]);

  if (callState === 'idle') return null;

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isVideoCall = callType === 'video';
  const isConnected = callState === 'connected';
  const isIncoming = callState === 'incoming';
  const isCalling = callState === 'calling';

  const avatar = remoteUser?.profilePhoto
    ? <img src={remoteUser.profilePhoto} alt="" className="w-24 h-24 rounded-full object-cover ring-4 ring-white/10" />
    : <div className="w-24 h-24 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white/10">
        {remoteUser?.fullName?.charAt(0)?.toUpperCase() || '?'}
      </div>;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" id="call-modal">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-dark-950/95 backdrop-blur-xl" />

      {/* Video streams (only for video calls) */}
      {isVideoCall && (
        <>
          {/* Remote video (full screen) */}
          <video
            ref={remoteVideoElement}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover ${isConnected ? 'opacity-100' : 'opacity-0'}`}
          />
          {/* Dark overlay on video */}
          {isConnected && <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />}

          {/* Local video (small PiP) */}
          <div className={`absolute top-6 right-6 z-20 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 ${isConnected ? 'w-36 h-48' : 'w-0 h-0'}`}>
            <video
              ref={localVideoElement}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
            {isVideoOff && (
              <div className="absolute inset-0 bg-dark-900 flex items-center justify-center">
                <VideoOff className="w-6 h-6 text-dark-400" />
              </div>
            )}
          </div>
        </>
      )}

      {/* Hidden audio elements for voice calls */}
      {!isVideoCall && (
        <>
          <audio ref={remoteVideoElement} autoPlay playsInline />
          <audio ref={localVideoElement} autoPlay playsInline muted style={{ display: 'none' }} />
        </>
      )}

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen w-full p-8">
        
        {/* Caller info (show when not connected for video, always for voice) */}
        {(!isVideoCall || !isConnected) && (
          <div className="text-center mb-8 animate-fade-in">
            {/* Pulsing ring animation for calling/incoming */}
            <div className="relative inline-block mb-6">
              {(isCalling || isIncoming) && (
                <>
                  <div className="absolute inset-0 w-24 h-24 rounded-full bg-tribe-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                  <div className="absolute -inset-3 rounded-full border-2 border-tribe-500/30 animate-pulse" />
                </>
              )}
              {avatar}
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">{remoteUser?.fullName || 'Unknown'}</h2>
            
            <p className="text-dark-300 text-sm">
              {isCalling && (
                <span className="flex items-center justify-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-tribe-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-tribe-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-tribe-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                  {isVideoCall ? 'Video calling' : 'Calling'}
                </span>
              )}
              {isIncoming && (
                <span className="text-tribe-400 font-medium">
                  Incoming {isVideoCall ? 'video' : 'voice'} call...
                </span>
              )}
              {isConnected && (
                <span className="text-emerald-400 font-mono text-lg">{formatDuration(callDuration)}</span>
              )}
            </p>
          </div>
        )}

        {/* Connected video call - show duration overlay */}
        {isVideoCall && isConnected && (
          <div className="absolute top-6 left-6 z-20">
            <div className="glass rounded-xl px-4 py-2 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-white font-mono text-sm">{formatDuration(callDuration)}</span>
              <span className="text-dark-300 text-xs">• {remoteUser?.fullName}</span>
            </div>
          </div>
        )}

        {/* Call controls */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20">
          {/* Incoming call - Answer/Reject */}
          {isIncoming && (
            <div className="flex items-center gap-8 animate-slide-up">
              <button
                onClick={rejectCall}
                className="w-16 h-16 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/30 transition-all hover:scale-110 active:scale-95"
                id="reject-call-btn"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              
              <button
                onClick={answerCall}
                className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 transition-all hover:scale-110 active:scale-95 animate-pulse"
                id="answer-call-btn"
              >
                {isVideoCall ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
              </button>
            </div>
          )}

          {/* Calling / Connected - Controls */}
          {(isCalling || isConnected) && (
            <div className="flex items-center gap-4 animate-slide-up">
              {/* Mute */}
              <button
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                  isMuted 
                    ? 'bg-white text-dark-900' 
                    : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                }`}
                id="mute-btn"
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* Video toggle (only for video calls) */}
              {isVideoCall ? (
                <>
                  <button
                    onClick={toggleVideo}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                      isVideoOff 
                        ? 'bg-white text-dark-900' 
                        : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                    }`}
                    id="video-toggle-btn"
                  >
                    {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                  </button>

                  <button
                    onClick={toggleCamera}
                    className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
                    id="camera-toggle-btn"
                  >
                    <SwitchCamera className="w-6 h-6" />
                  </button>
                </>
              ) : (
                /* Speaker toggle (only for audio calls) */
                <button
                  onClick={toggleSpeaker}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                    isSpeaker 
                      ? 'bg-white text-dark-900' 
                      : 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm'
                  }`}
                  id="speaker-toggle-btn"
                >
                  {isSpeaker ? <Volume2 className="w-6 h-6" /> : <Volume1 className="w-6 h-6" />}
                </button>
              )}

              {/* End call */}
              <button
                onClick={endCall}
                className="w-16 h-16 bg-rose-500 hover:bg-rose-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/30 transition-all hover:scale-110 active:scale-95"
                id="end-call-btn"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .mirror {
          transform: scaleX(-1);
        }
        @keyframes slide-up {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s ease-out;
        }
      `}
      </style>
    </div>
  );
};

export default CallModal;
