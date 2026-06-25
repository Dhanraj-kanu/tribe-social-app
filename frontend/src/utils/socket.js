import { io } from 'socket.io-client';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  // If there's an existing disconnected socket, clean it up
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }

  // Dynamically connect to backend (VITE_BACKEND_URL for production, origin for local proxy)
  const socketUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;

  console.log('🔌 Connecting socket to:', socketUrl);

  socket = io(socketUrl, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected, id:', socket.id);
  });

  socket.on('connect_error', (err) => {
    console.error('🔌 Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('reconnect', (attemptNumber) => {
    console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
