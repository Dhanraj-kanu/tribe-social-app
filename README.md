# Tribe 🚀
### Social Media Chat App - MERN Stack

A full-featured social media chat application built with MongoDB, Express, React, and Node.js featuring real-time messaging, social interactions, and a stunning modern UI.

---

## ✨ Features

### 🔐 Authentication
- JWT + bcrypt secure authentication
- Signup/Login with form validation
- Protected routes with auto-redirect
- Profile photo, bio, and username management

### 👥 Social Layer
- Send & accept friend requests
- Follow/unfollow users
- User search by name or username
- User suggestions on explore page
- Real-time notifications

### 💬 Chat Features
- **1-on-1 real-time messaging** (Socket.io)
- **Group chats / chat rooms** with admin controls
- **Typing indicators** ("Dhanraj is typing...")
- **Message status** - sent ✓, delivered ✓✓, seen ✓✓ (blue)
- **Emoji picker** with search
- Chat search & filtering

### 📱 Feed
- Post status updates
- Like & comment in real-time
- Delete your own posts
- Feed from people you follow

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Real-time | Socket.io |
| Auth | JWT + bcrypt |
| File Uploads | Multer |
| Icons | Lucide React |

---

## 📦 MongoDB Collections

- `users` - User accounts, profiles, social connections
- `messages` - Chat messages with delivery/read status
- `conversations` - 1-on-1 and group conversations
- `friendrequests` - Pending friend requests
- `posts` - Feed posts with likes and comments
- `notifications` - Activity notifications

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v18+)
- **MongoDB** running locally on port 27017 (or MongoDB Atlas)

### Installation

```bash
# 1. Install server dependencies
cd server
npm install

# 2. Install client dependencies  
cd ../client
npm install
```

### Running the App

**Terminal 1 - Start the Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Start the Frontend:**
```bash
cd client
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Socket.io: ws://localhost:5000

### OR use the root scripts:
```bash
# Install everything
npm run install:all

# Run both (requires concurrently)
npm install
npm run dev
```

---

## 📁 Project Structure

```
Tribe/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   └── Sidebar.jsx
│   │   ├── context/        # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── ChatContext.jsx
│   │   ├── pages/          # Route pages
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Feed.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── Profile.jsx
│   │   │   ├── SearchPage.jsx
│   │   │   ├── Friends.jsx
│   │   │   ├── FriendRequests.jsx
│   │   │   └── Notifications.jsx
│   │   ├── utils/          # API & Socket utilities
│   │   │   ├── api.js
│   │   │   └── socket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── server/                 # Node.js + Express Backend
│   ├── config/
│   │   └── db.js           # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── chatController.js
│   │   └── postController.js
│   ├── middleware/
│   │   ├── auth.js         # JWT middleware
│   │   └── upload.js       # Multer file upload
│   ├── models/
│   │   ├── User.js
│   │   ├── Message.js
│   │   ├── Conversation.js
│   │   ├── FriendRequest.js
│   │   ├── Post.js
│   │   └── Notification.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── chat.js
│   │   └── posts.js
│   ├── socket/
│   │   └── socketHandler.js
│   ├── uploads/            # Uploaded files
│   ├── server.js
│   └── .env
│
└── package.json            # Root scripts
```

---

## 🔧 Environment Variables

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/tribe
JWT_SECRET=your_super_secret_key
JWT_EXPIRE=Your_key
CLIENT_URL=http://localhost:5173
```

---

## 🎨 Design

- **Dark theme** with glassmorphism
- **Custom Tribe color palette** (indigo/violet)
- **Smooth animations** and micro-interactions
- **Responsive design** (mobile + desktop)
- **Premium UI** with gradient accents
