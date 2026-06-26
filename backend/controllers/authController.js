import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { sendPasswordResetEmail, sendEmailVerification } from '../utils/sendEmail.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// @desc    Register new user
// @route   POST /api/auth/signup
export const signup = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      if (user.isVerified) {
        return res.status(400).json({ 
          message: user.email === email ? 'Email already registered' : 'Username already taken'
        });
      } else {
        // Update unverified user
        user.username = username;
        user.email = email;
        user.password = password;
        user.fullName = fullName;
      }
    } else {
      user = new User({ username, email, password, fullName });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    user.verifyEmailOTP = crypto.createHash('sha256').update(otp).digest('hex');
    user.verifyEmailExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    try {
      await sendEmailVerification(user.email, otp);
      res.status(201).json({ 
        message: 'Verification code sent to your email',
        requiresVerification: true,
        email: user.email
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      res.status(500).json({ message: 'Failed to send verification email. Please try again later.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      verifyEmailOTP: hashedOTP,
      verifyEmailExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    user.isVerified = true;
    user.verifyEmailOTP = undefined;
    user.verifyEmailExpire = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Email verified successfully!',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        friends: user.friends
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isVerified) {
      // Generate new OTP and send it
      const otp = crypto.randomInt(100000, 999999).toString();
      user.verifyEmailOTP = crypto.createHash('sha256').update(otp).digest('hex');
      user.verifyEmailExpire = Date.now() + 10 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      
      try {
        await sendEmailVerification(user.email, otp);
      } catch (err) {
        console.error('Failed to resend verification on unverified login', err);
      }
      
      return res.status(403).json({ 
        message: 'Please verify your email address to continue. A new code has been sent.',
        requiresVerification: true,
        email: user.email
      });
    }

    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        profilePhoto: user.profilePhoto,
        bio: user.bio,
        followers: user.followers,
        following: user.following,
        friends: user.friends
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('followers', 'username fullName profilePhoto')
      .populate('following', 'username fullName profilePhoto')
      .populate('friends', 'username fullName profilePhoto isOnline lastSeen');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot password - send OTP to email
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide your email address' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists — but still return success-like message
      return res.status(200).json({ message: 'If an account with that email exists, a reset code has been sent.' });
    }

    // Generate a 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();

    // Hash and save the OTP (don't store plain text)
    user.resetPasswordOTP = crypto.createHash('sha256').update(otp).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    // Send the OTP via email
    try {
      await sendPasswordResetEmail(user.email, otp);
      res.status(200).json({ message: 'Password reset code sent to your email' });
    } catch (emailError) {
      // If email fails, clear the OTP fields
      user.resetPasswordOTP = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error('Email sending error:', emailError);
      res.status(500).json({ message: 'Failed to send email. Please try again later.' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Verify OTP code
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

    const user = await User.findOne({
      email: email.toLowerCase(),
      resetPasswordOTP: hashedOTP,
      resetPasswordExpire: { $gt: Date.now() }
    }).select('+resetPasswordOTP +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code. Please request a new one.' });
    }

    // Generate a short-lived reset token for the next step
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    res.status(200).json({ message: 'Code verified successfully', resetToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset password with verified token
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ message: 'Reset token and new password are required' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.' });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Reset session expired. Please start over.' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Set new password and clear reset fields
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ message: 'Password reset successful! You can now log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
