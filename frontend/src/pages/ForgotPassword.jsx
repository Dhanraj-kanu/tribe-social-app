import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { Mail, ArrowRight, ArrowLeft, KeyRound, Lock, Eye, EyeOff, CheckCircle, ShieldCheck, Zap } from 'lucide-react';

const STEPS = {
  EMAIL: 'email',
  OTP: 'otp',
  RESET: 'reset',
  SUCCESS: 'success'
};

const ForgotPassword = () => {
  const [step, setStep] = useState(STEPS.EMAIL);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const otpRefs = useRef([]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Auto-focus first OTP input when entering OTP step
  useEffect(() => {
    if (step === STEPS.OTP && otpRefs.current[0]) {
      otpRefs.current[0].focus();
    }
  }, [step]);

  const handleSendOTP = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const { data } = await authAPI.forgotPassword(email);
      setSuccess(data.message);
      setStep(STEPS.OTP);
      setCountdown(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < 6) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP(email, code);
      setResetToken(data.resetToken);
      setSuccess('Code verified! Set your new password.');
      setStep(STEPS.RESET);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid code');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return setError('Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
    }
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match');
    }
    setLoading(true);
    try {
      const { data } = await authAPI.resetPassword(resetToken, newPassword);
      setSuccess(data.message);
      setStep(STEPS.SUCCESS);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    setOtp(['', '', '', '', '', '']);
    handleSendOTP();
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(b.length) + c)
    : '';

  // Progress bar
  const stepIndex = [STEPS.EMAIL, STEPS.OTP, STEPS.RESET, STEPS.SUCCESS].indexOf(step);
  const progress = ((stepIndex + 1) / 4) * 100;

  return (
    <div className="min-h-screen flex" id="forgot-password-page">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center bg-gradient-to-br from-tribe-950 via-dark-900 to-tribe-900">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-tribe-500/20 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        </div>
        <div className="relative z-10 text-center px-8 max-w-lg">
          <div className="inline-flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-tribe-400 to-tribe-600 rounded-2xl flex items-center justify-center shadow-glow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-5xl font-black gradient-text">Tribe</h1>
          </div>
          <p className="text-xl text-dark-300 leading-relaxed mb-6">
            Don't worry, it happens.<br />
            <span className="text-tribe-400 font-semibold">We'll help you get back in.</span>
          </p>

          {/* Visual Steps */}
          <div className="space-y-4 mt-10">
            {[
              { icon: '📧', title: 'Enter your email', desc: 'We\'ll find your account', active: stepIndex >= 0 },
              { icon: '🔢', title: 'Verify the code', desc: 'Check your inbox for 6-digit OTP', active: stepIndex >= 1 },
              { icon: '🔐', title: 'Set new password', desc: 'Choose a strong new password', active: stepIndex >= 2 },
              { icon: '✅', title: 'You\'re back!', desc: 'Log in with your new password', active: stepIndex >= 3 }
            ].map((item, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-500 ${
                  item.active
                    ? 'glass border border-tribe-500/30 scale-[1.02]'
                    : 'glass-light opacity-40'
                }`}
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="text-left">
                  <h3 className={`font-semibold ${item.active ? 'text-white' : 'text-dark-400'}`}>{item.title}</h3>
                  <p className="text-dark-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
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

          {/* Progress bar */}
          <div className="mb-8">
            <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-tribe-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-dark-500 text-xs mt-2 text-right">Step {stepIndex + 1} of 4</p>
          </div>

          {/* ===== STEP 1: EMAIL ===== */}
          {step === STEPS.EMAIL && (
            <div className="animate-fade-in" key="email-step">
              <div className="w-14 h-14 bg-tribe-500/10 rounded-2xl flex items-center justify-center mb-6 border border-tribe-500/20">
                <Mail className="w-7 h-7 text-tribe-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Forgot Password?</h2>
              <p className="text-dark-400 mb-8">Enter your email and we'll send you a verification code to reset your password.</p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 animate-slide-down text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSendOTP} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      id="forgot-email"
                      type="email"
                      className="input-field pl-12"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  id="send-otp-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Send Reset Code
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-center text-dark-400 mt-8">
                Remember your password?{' '}
                <Link to="/login" className="text-tribe-400 hover:text-tribe-300 font-semibold transition" id="back-to-login">
                  Sign in
                </Link>
              </p>
            </div>
          )}

          {/* ===== STEP 2: OTP VERIFICATION ===== */}
          {step === STEPS.OTP && (
            <div className="animate-fade-in" key="otp-step">
              <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20">
                <KeyRound className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">Enter Code</h2>
              <p className="text-dark-400 mb-2">We sent a 6-digit code to</p>
              <p className="text-tribe-400 font-medium mb-8">{maskedEmail}</p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 animate-slide-down text-sm">
                  {error}
                </div>
              )}
              {success && !error && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-xl mb-6 animate-slide-down text-sm">
                  {success}
                </div>
              )}

              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => (otpRefs.current[index] = el)}
                        id={`otp-input-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        className="w-12 h-14 text-center text-xl font-bold bg-dark-800/50 border border-dark-600/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-tribe-500/50 focus:border-tribe-500 transition-all duration-300"
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(index, e)}
                        autoComplete="one-time-code"
                      />
                    ))}
                  </div>
                </div>

                <button
                  id="verify-otp-btn"
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Verify Code
                      <ShieldCheck className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="flex items-center justify-between mt-6">
                <button
                  onClick={() => { setStep(STEPS.EMAIL); setError(''); setSuccess(''); }}
                  className="text-dark-400 hover:text-white flex items-center gap-1 text-sm transition"
                  id="back-to-email-btn"
                >
                  <ArrowLeft className="w-4 h-4" /> Change email
                </button>
                <button
                  onClick={handleResendOTP}
                  disabled={countdown > 0 || loading}
                  className={`text-sm font-medium transition ${
                    countdown > 0 ? 'text-dark-500 cursor-not-allowed' : 'text-tribe-400 hover:text-tribe-300'
                  }`}
                  id="resend-otp-btn"
                >
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                </button>
              </div>
            </div>
          )}

          {/* ===== STEP 3: NEW PASSWORD ===== */}
          {step === STEPS.RESET && (
            <div className="animate-fade-in" key="reset-step">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                <Lock className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">New Password</h2>
              <p className="text-dark-400 mb-8">Choose a strong password for your account.</p>

              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl mb-6 animate-slide-down text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-12 pr-12"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
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

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      id="confirm-new-password"
                      type={showPassword ? 'text' : 'password'}
                      className="input-field pl-12"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {/* Password strength indicator */}
                {newPassword && (
                  <div className="space-y-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => {
                        const strength = 
                          (newPassword.length >= 8 ? 1 : 0) +
                          (/[A-Z]/.test(newPassword) ? 1 : 0) +
                          (/[0-9]/.test(newPassword) ? 1 : 0) +
                          (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0);
                        const colors = ['bg-rose-500', 'bg-amber-500', 'bg-tribe-500', 'bg-emerald-500'];
                        return (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                              level <= strength ? colors[strength - 1] : 'bg-dark-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                    <p className="text-xs text-dark-400">
                      {(() => {
                        const s = 
                          (newPassword.length >= 8 ? 1 : 0) +
                          (/[A-Z]/.test(newPassword) ? 1 : 0) +
                          (/[0-9]/.test(newPassword) ? 1 : 0) +
                          (/[^A-Za-z0-9]/.test(newPassword) ? 1 : 0);
                        return ['', 'Weak — add uppercase, numbers, symbols', 'Fair — add more variety', 'Good — almost there!', 'Strong 💪'][s];
                      })()}
                    </p>
                  </div>
                )}

                <button
                  id="reset-password-btn"
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Reset Password
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* ===== STEP 4: SUCCESS ===== */}
          {step === STEPS.SUCCESS && (
            <div className="animate-fade-in text-center" key="success-step">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-3">Password Reset!</h2>
              <p className="text-dark-400 mb-8">Your password has been changed successfully. You can now sign in with your new password.</p>

              <button
                id="go-to-login-btn"
                onClick={() => navigate('/login')}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3"
              >
                Back to Sign In
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
