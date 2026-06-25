import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { CallProvider } from './context/CallContext';
import { ThemeProvider } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import Sidebar from './components/Sidebar';
import CallModal from './components/CallModal';
import StoryCreator from './components/StoryCreator';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Feed from './pages/Feed';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import SearchPage from './pages/SearchPage';
import Friends from './pages/Friends';
import FriendRequests from './pages/FriendRequests';
import Notifications from './pages/Notifications';
import SavedPosts from './pages/SavedPosts';
import { Menu, Zap, Home, Search, MessageCircle, User, Users, Camera, Bell, UserPlus } from 'lucide-react';
import { useState, useRef } from 'react';

// Protected route wrapper
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121216] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-tribe-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-dark-400">Loading Tribe...</p>
        </div>
      </div>
    );
  }
  return user ? <Outlet /> : <Navigate to="/login" />;
};

// Public route - redirect to home if logged in
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/" /> : children;
};

// Main layout with sidebar
const MainLayout = () => {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const cameraInputRef = useRef(null);
  const [storyFile, setStoryFile] = useState(null);
  const [showStoryCreator, setShowStoryCreator] = useState(false);

  const handleCameraSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setStoryFile(file);
    setShowStoryCreator(true);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <ChatProvider>
      <CallProvider>
        <div className="flex min-h-screen bg-dark-950">
          <Sidebar mobileOpen={sidebarOpen} setMobileOpen={setSidebarOpen} />
          
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header - Clean branding with Notifications & Requests */}
            <header className="md:hidden h-14 bg-dark-950/90 backdrop-blur-xl flex items-center justify-between px-5 sticky top-0 z-40">
              <NavLink to={`/profile/${user?._id}`} className={({isActive}) => `p-1.5 rounded-full transition-colors ${isActive ? 'text-tribe-400' : 'text-dark-300 hover:text-white'}`}>
                {user?.profilePhoto ? (
                  <img src={user.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover ring-2 ring-dark-700" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white text-[11px] font-bold">
                    {user?.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                )}
              </NavLink>
              <h1 className="text-lg font-bold text-dark-50 tracking-wider">TRIBE</h1>
              <div className="flex items-center gap-1">
                <NavLink to="/requests" className={({isActive}) => `p-2 rounded-full transition-colors relative ${isActive ? 'text-tribe-400' : 'text-dark-300 hover:text-white'}`} id="mobile-requests-link">
                  <UserPlus className="w-5 h-5" />
                </NavLink>
                <NavLink to="/notifications" className={({isActive}) => `p-2 rounded-full transition-colors relative ${isActive ? 'text-tribe-400' : 'text-dark-300 hover:text-white'}`}>
                  <Bell className="w-5 h-5" />
                </NavLink>
              </div>
            </header>

            <main className="flex-1 ml-0 md:ml-72 pb-28 md:pb-0">
              <Outlet />
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-6 left-6 right-6 h-[72px] bg-[#222228] rounded-[36px] shadow-2xl flex items-center justify-between px-6 z-40">
              <NavLink to="/" className={({isActive}) => `relative p-2 rounded-full transition-colors ${isActive ? 'text-white' : 'text-[#7A7A8C] hover:text-white'}`}>
                {({isActive}) => (
                  <>
                    <Home className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                    {isActive && <div className="w-1 h-1 bg-amber-400 rounded-full mx-auto mt-1 absolute" style={{ bottom: '12px', left: '50%', transform: 'translateX(-50%)' }} />}
                  </>
                )}
              </NavLink>
              
              <NavLink to="/search" className={({isActive}) => `p-2 rounded-full transition-colors ${isActive ? 'text-white' : 'text-[#7A7A8C] hover:text-white'}`}>
                {({isActive}) => (
                  <Search className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                )}
              </NavLink>

              {/* Central Camera FAB */}
              <div className="relative -top-8 -mx-2">
                <button 
                  onClick={() => cameraInputRef.current?.click()} 
                  className="w-16 h-16 bg-[#5C67FF] rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(92,103,255,0.4)] border-[6px] border-dark-950 transition-transform active:scale-95"
                >
                  <Camera className="w-7 h-7" strokeWidth={2} />
                </button>
                <input 
                  type="file" 
                  ref={cameraInputRef} 
                  className="hidden" 
                  onChange={handleCameraSelect} 
                  accept="image/*" 
                />
              </div>

              <NavLink to="/chat" className={({isActive}) => `p-2 rounded-full transition-colors ${isActive ? 'text-white' : 'text-[#7A7A8C] hover:text-white'}`}>
                {({isActive}) => (
                  <MessageCircle className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                )}
              </NavLink>
              
              <NavLink to="/friends" className={({isActive}) => `p-2 rounded-full transition-colors ${isActive ? 'text-white' : 'text-[#7A7A8C] hover:text-white'}`}>
                {({isActive}) => (
                  <Users className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                )}
              </NavLink>
            </nav>

            {/* Story Creator Modal - rendered outside nav for full-screen overlay */}
            {showStoryCreator && storyFile && (
              <StoryCreator
                imageFile={storyFile}
                onClose={() => { setShowStoryCreator(false); setStoryFile(null); }}
                onCreated={() => { setShowStoryCreator(false); setStoryFile(null); window.location.reload(); }}
              />
            )}
          </div>
        </div>
        <CallModal />
      </CallProvider>
    </ChatProvider>
  );
};

// Chat layout (no sidebar padding)
const ChatLayout = () => {
  return (
    <ChatProvider>
      <CallProvider>
        <div className="flex min-h-screen bg-[#121216]">
          <Sidebar />
          <main className="flex-1 ml-0 md:ml-72">
            <Outlet />
          </main>
        </div>
        <CallModal />
      </CallProvider>
    </ChatProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<Feed />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/profile/:id" element={<Profile />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/requests" element={<FriendRequests />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/saved" element={<SavedPosts />} />
                </Route>
              </Route>

              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;
