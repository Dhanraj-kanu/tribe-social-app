import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Zap } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Verification states
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const { login, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      if (err.response?.data?.requiresVerification) {
        setRegisteredEmail(err.response.data.email);
        setShowVerification(true);
        setError('Please verify your email address. A new code has been sent.');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyEmail(registeredEmail, otp);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" id="login-page">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-tribe-950 via-dark-900 to-tribe-900">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-tribe-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-pink-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 text-center px-8 max-w-lg">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-tribe-400 to-tribe-600 rounded-2xl flex items-center justify-center shadow-glow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black gradient-text">Tribe</h1>
          </div>
          <p className="text-xl text-dark-300 leading-relaxed mb-6">
            Connect with your community.<br />
            <span className="text-tribe-400 font-semibold">Chat, Share & Grow together.</span>
          </p>
          <div className="flex items-center justify-center gap-4 mt-10">
            <div className="flex -space-x-3">
              {['🧑‍💻', '👩‍🎨', '🧑‍🔬', '👩‍🚀'].map((emoji, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-dark-700 border-2 border-dark-800 flex items-center justify-center text-lg">
                  {emoji}
                </div>
              ))}
            </div>
            <span className="text-dark-400 text-sm">Join 10k+ members</span>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-dark-950">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-tribe-400 to-tribe-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-black gradient-text">Tribe</h1>
            </div>
          </div>

          {!showVerification ? (
            <>
              <h2 className="text-3xl font-bold text-white mb-2">Welcome back</h2>
              <p className="text-dark-400 mb-8">Sign in to continue to Tribe</p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 animate-slide-down text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      id="login-email"
                      type="email"
                      className="input-field pl-12"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-12 pr-12"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm text-tribe-400 hover:text-tribe-300 font-medium transition" id="forgot-password-link">
                    Forgot password?
                  </Link>
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-dark-400 mt-8">
                Don't have an account?{' '}
                <Link to="/signup" className="text-tribe-400 hover:text-tribe-300 font-semibold transition" id="signup-link">
                  Create one
                </Link>
              </p>
            </>
          ) : (
            <div className="animate-fade-in text-center">
              <div className="w-16 h-16 bg-tribe-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-tribe-500" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-dark-400 mb-8">
                We've sent a 6-digit verification code to<br />
                <span className="text-white font-medium">{registeredEmail}</span>
              </p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 text-sm text-left">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerify} className="space-y-6">
                <div>
                  <input
                    type="text"
                    maxLength="6"
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-4 py-4 text-center text-2xl tracking-[0.5em] text-white focus:outline-none focus:border-tribe-500 transition-colors placeholder:tracking-normal placeholder:text-dark-500/50"
                    placeholder="------"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full py-3"
                >
                  {loading ? (
                    <div className="flex justify-center"><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></div>
                  ) : (
                    'Verify Email'
                  )}
                </button>
              </form>

              <p className="text-dark-400 mt-8 text-sm">
                Already verified?{' '}
                <button onClick={() => setShowVerification(false)} className="text-tribe-400 hover:text-tribe-300 font-semibold transition">
                  Go back to Login
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
