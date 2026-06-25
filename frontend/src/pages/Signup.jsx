import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Mail, Lock, User, AtSign, ArrowRight, Zap } from 'lucide-react';

const Signup = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Verification states
  const [showVerification, setShowVerification] = useState(false);
  const [otp, setOtp] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  
  const { signup, verifyEmail } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Passwords do not match');
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(formData.password)) {
      return setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }

    setLoading(true);
    try {
      const res = await signup({
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      if (res.requiresVerification) {
        setRegisteredEmail(res.email);
        setShowVerification(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
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
    <div className="min-h-screen flex" id="signup-page">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-dark-950">
        <div className="w-full max-w-md animate-fade-in">
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
              <h2 className="text-3xl font-bold text-white mb-2">Join the Tribe</h2>
              <p className="text-dark-400 mb-8">Create your account and start connecting</p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 animate-slide-down text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
                        id="signup-fullname"
                        type="text"
                        className="input-field pl-12"
                        placeholder="John Doe"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">Username</label>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
                        id="signup-username"
                        type="text"
                        className="input-field pl-12"
                        placeholder="johndoe"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      id="signup-email"
                      type="email"
                      className="input-field pl-12"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        className="input-field pl-12"
                        placeholder="••••••"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">Confirm</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                      <input
                        id="signup-confirm-password"
                        type={showPassword ? 'text' : 'password'}
                        className="input-field pl-12"
                        placeholder="••••••"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="accent-tribe-500"
                  />
                  Show passwords
                </label>

                <button
                  id="signup-submit"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Account
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-dark-400 mt-8">
                Already have an account?{' '}
                <Link to="/login" className="text-tribe-400 hover:text-tribe-300 font-semibold transition" id="login-link">
                  Sign in
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
                Didn't receive the code?{' '}
                <button onClick={() => setShowVerification(false)} className="text-tribe-400 hover:text-tribe-300 font-semibold transition">
                  Go back
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-bl from-tribe-950 via-dark-900 to-purple-950">
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-tribe-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
        </div>
        <div className="relative z-10 text-center px-8 max-w-lg">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-tribe-400 to-tribe-600 rounded-2xl flex items-center justify-center shadow-glow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black gradient-text">Tribe</h1>
          </div>
          <div className="space-y-6 text-left">
            {[
              { icon: '💬', title: 'Real-time Chat', desc: 'Instant messaging with typing indicators' },
              { icon: '👥', title: 'Build Your Circle', desc: 'Connect with friends and communities' },
              { icon: '📸', title: 'Share Moments', desc: 'Post photos and status updates' },
              { icon: '🔔', title: 'Stay Updated', desc: 'Never miss what matters to you' }
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 glass-light rounded-xl px-4 py-3 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="text-2xl">{feature.icon}</span>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-dark-400 text-sm">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
