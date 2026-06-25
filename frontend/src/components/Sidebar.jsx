import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Home, Search, Bell, Users, UserPlus, 
  LogOut, Zap, User, Menu, X, Moon, Sun
} from 'lucide-react';

const Sidebar = ({ unreadNotifications = 0, mobileOpen: externalMobileOpen, setMobileOpen: externalSetMobileOpen }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  
  const mobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const setMobileOpen = externalSetMobileOpen || setInternalMobileOpen;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const links = [
    { to: '/', icon: Home, label: 'Feed' },
    { to: '/chat', icon: MessageCircle, label: 'Messages' },
    { to: '/search', icon: Search, label: 'Explore' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/requests', icon: UserPlus, label: 'Requests' },
    { to: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifications },
    { to: `/profile/${user?._id}`, icon: User, label: 'Profile' },
  ];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-dark-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-tribe-400 to-tribe-600 rounded-xl flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-black gradient-text">Tribe</h1>
        </div>
        <button onClick={() => setMobileOpen(false)} className="md:hidden p-2 text-dark-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
            id={`nav-${link.label.toLowerCase()}`}
          >
            <div className="relative">
              <link.icon className="w-5 h-5" />
              {link.badge > 0 && <span className="badge">{link.badge}</span>}
            </div>
            <span className="font-medium">{link.label}</span>
          </NavLink>
        ))}

        <button 
          onClick={toggleTheme}
          className="sidebar-link w-full mt-4"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </nav>

      {/* User Profile Section */}
      <div className="p-4 border-t border-dark-700/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            {user?.profilePhoto ? (
              <img src={user.profilePhoto} alt={user.fullName} className="w-10 h-10 avatar" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-tribe-400 to-tribe-600 flex items-center justify-center text-white font-bold text-sm">
                {user?.fullName?.charAt(0)?.toUpperCase()}
              </div>
            )}
            <div className="online-dot" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark-50 truncate">{user?.fullName}</p>
            <p className="text-xs text-dark-400 truncate">@{user?.username}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-link w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
          id="logout-btn"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" 
          />
        )}
      </AnimatePresence>

      {/* Sidebar Drawer */}
      <aside className={`w-72 h-full bg-dark-900 border-r border-dark-800 flex flex-col fixed left-0 top-0 z-[101] transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        id="sidebar"
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
