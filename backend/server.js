import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import chatRoutes from './routes/chat.js';
import postRoutes from './routes/posts.js';
import storyRoutes from './routes/stories.js';
import setupSocket from './socket/socketHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// CORS - Allow connections from any device on the network
const allowedOrigins = (origin, callback) => {
  // Allow requests with no origin (mobile apps, curl, etc.)
  if (!origin) return callback(null, true);
  // Allow localhost and any LAN IP
  if (
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.match(/^https?:\/\/192\.168\./) ||
    origin.match(/^https?:\/\/10\./) ||
    origin.match(/^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\./) ||
    origin.includes('ngrok') ||
    origin.includes('ngrok-free.app') ||
    origin === process.env.CLIENT_URL
  ) {
    return callback(null, true);
  }
  callback(new Error('Not allowed by CORS'));
};

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Serve uploaded files with aggressive caching (images don't change)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '365d',
  immutable: true,
  etag: true,
  lastModified: true,
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/stories', storyRoutes);

// Error handler middleware
app.use((err, req, res, next) => {
  console.error('❌ Error details:', {
    message: err.message,
    stack: err.stack,
    code: err.code,
    status: err.status
  });
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large. Max limit is 100MB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  
  if (err.message === 'Invalid file type') {
    return res.status(400).json({ message: 'Invalid file type. Only images and videos are allowed.' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'An unexpected error occurred'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Tribe API is running 🚀' });
});

// Setup Socket.io
setupSocket(io);

// Connect to DB and start server
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Tribe Server running on port ${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api`);
    console.log(`🌐 Network: accessible from all devices on LAN`);
    console.log(`🔌 Socket.io ready`);
  });
});
