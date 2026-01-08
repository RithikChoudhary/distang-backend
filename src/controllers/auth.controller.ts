import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { User } from '../models/User.model';
import { OTP, OTPType, generateOTP } from '../models/OTP.model';
import { generateToken } from '../utils/jwt';
import { sendOTPEmail } from '../services/email.service';

/**
 * Step 1: Initiate signup - collect basic info and send OTP
 * POST /auth/signup/init
 */
export const initiateSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, email, phoneNumber } = req.body;

    // Validate required fields
    if (!name || !username || !email) {
      res.status(400).json({
        success: false,
        message: 'Name, username, and email are required.',
      });
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-z0-9_]{3,30}$/;
    if (!usernameRegex.test(username.toLowerCase())) {
      res.status(400).json({
        success: false,
        message: 'Username must be 3-30 characters, lowercase letters, numbers, and underscores only.',
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format.',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        res.status(409).json({
          success: false,
          message: 'Email already registered. Please login.',
        });
      } else {
        res.status(409).json({
          success: false,
          message: 'Username already taken.',
        });
      }
      return;
    }

    // Generate and save OTP
    const otp = generateOTP();
    await OTP.findOneAndDelete({ email: email.toLowerCase(), type: OTPType.SIGNUP }); // Remove old OTP
    
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      type: OTPType.SIGNUP,
    });
    await otpDoc.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, 'signup');

    if (!emailSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again.',
      });
      return;
    }

    // Include OTP in dev mode for testing
    const isDev = process.env.NODE_ENV !== 'production';
    
    res.status(200).json({
      success: true,
      message: isDev 
        ? `Verification code sent! DEV MODE - Your OTP is: ${otp}` 
        : 'Verification code sent to your email.',
      data: {
        email: email.toLowerCase(),
        expiresIn: 600, // 10 minutes in seconds
        ...(isDev && { devOtp: otp }), // Only include in dev mode
      },
    });
  } catch (error) {
    console.error('Signup initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

/**
 * Step 2: Verify OTP and complete signup
 * POST /auth/signup/verify
 */
export const verifySignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, username, email, phoneNumber, otp } = req.body;

    // Validate OTP
    if (!otp || otp.length !== 6) {
      res.status(400).json({
        success: false,
        message: 'Invalid verification code.',
      });
      return;
    }

    // Find OTP document
    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      type: OTPType.SIGNUP,
      isUsed: false,
    });

    if (!otpDoc) {
      res.status(400).json({
        success: false,
        message: 'No verification code found. Please request a new one.',
      });
      return;
    }

    // Check if expired
    if (new Date() > otpDoc.expiresAt) {
      res.status(400).json({
        success: false,
        message: 'Verification code expired. Please request a new one.',
      });
      return;
    }

    // Check attempts
    if (otpDoc.attempts >= 5) {
      res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      });
      return;
    }

    // Verify OTP
    if (otpDoc.otp !== otp) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      res.status(400).json({
        success: false,
        message: 'Invalid verification code.',
        data: { attemptsRemaining: 5 - otpDoc.attempts },
      });
      return;
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Create user - only include phoneNumber if provided
    const userData: any = {
      name: name.trim(),
      username: username.toLowerCase().trim(),
      email: email.toLowerCase(),
      isVerified: true,
    };
    
    // Only add phoneNumber if it's a non-empty string
    if (phoneNumber && phoneNumber.trim()) {
      userData.phoneNumber = phoneNumber.trim();
    }
    
    const user = new User(userData);

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString(), user.uniqueId);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: {
        user: {
          id: user._id,
          uniqueId: user.uniqueId,
          name: user.name,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          isProfileComplete: user.isProfileComplete,
        },
        token,
      },
    });
  } catch (error: any) {
    console.error('Signup verification error:', error);
    
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        message: 'Username or email already taken.',
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

/**
 * Step 1: Initiate login - send OTP
 * POST /auth/login/init
 */
export const initiateLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username } = req.body;

    // Email is required, username is optional
    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Find user by email
    let user = await User.findOne({ email: cleanEmail });

    // If username is provided, verify it matches
    if (username && user) {
      const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');
      if (user.username !== cleanUsername) {
        console.log(`Login attempt: email=${cleanEmail}, username=${cleanUsername}, db_username=${user.username}`);
        res.status(401).json({
          success: false,
          message: 'Username does not match the email. Please check your credentials.',
        });
        return;
      }
    }

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Account not found. Please check your email.',
      });
      return;
    }

    // Generate and save OTP
    const otp = generateOTP();
    await OTP.findOneAndDelete({ email: email.toLowerCase(), type: OTPType.LOGIN });
    
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      type: OTPType.LOGIN,
    });
    await otpDoc.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, 'login');

    if (!emailSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to send login code. Please try again.',
      });
      return;
    }

    // Include OTP in dev mode for testing
    const isDev = process.env.NODE_ENV !== 'production';

    res.status(200).json({
      success: true,
      message: isDev 
        ? `Login code sent! DEV MODE - Your OTP is: ${otp}` 
        : 'Login code sent to your email.',
      data: {
        email: email.toLowerCase(),
        name: user.name,
        expiresIn: 600,
        ...(isDev && { devOtp: otp }), // Only include in dev mode
      },
    });
  } catch (error) {
    console.error('Login initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

/**
 * Step 2: Verify OTP and complete login
 * POST /auth/login/verify
 */
export const verifyLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!otp || otp.length !== 6) {
      res.status(400).json({
        success: false,
        message: 'Invalid login code.',
      });
      return;
    }

    // Find OTP document
    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      type: OTPType.LOGIN,
      isUsed: false,
    });

    if (!otpDoc) {
      res.status(400).json({
        success: false,
        message: 'No login code found. Please request a new one.',
      });
      return;
    }

    if (new Date() > otpDoc.expiresAt) {
      res.status(400).json({
        success: false,
        message: 'Login code expired. Please request a new one.',
      });
      return;
    }

    if (otpDoc.attempts >= 5) {
      res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new code.',
      });
      return;
    }

    if (otpDoc.otp !== otp) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      res.status(400).json({
        success: false,
        message: 'Invalid login code.',
        data: { attemptsRemaining: 5 - otpDoc.attempts },
      });
      return;
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Get user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    // Generate token
    const token = generateToken(user._id.toString(), user.uniqueId);

    res.status(200).json({
      success: true,
      message: 'Login successful!',
      data: {
        user: {
          id: user._id,
          uniqueId: user.uniqueId,
          name: user.name,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profilePhoto: user.profilePhoto,
          photos: user.photos,
          favorites: user.favorites,
          gender: user.gender,
          relationshipStatus: user.relationshipStatus,
          coupleId: user.coupleId,
          isProfileComplete: user.isProfileComplete,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Login verification error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

/**
 * Resend OTP
 * POST /auth/resend-otp
 */
export const resendOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type } = req.body;

    if (!email || !type) {
      res.status(400).json({
        success: false,
        message: 'Email and type are required.',
      });
      return;
    }

    // Check rate limiting (max 1 OTP per minute)
    const recentOTP = await OTP.findOne({
      email: email.toLowerCase(),
      type,
      createdAt: { $gte: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOTP) {
      res.status(429).json({
        success: false,
        message: 'Please wait 1 minute before requesting a new code.',
      });
      return;
    }

    // Generate new OTP
    const otp = generateOTP();
    await OTP.findOneAndDelete({ email: email.toLowerCase(), type });
    
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      type,
    });
    await otpDoc.save();

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp, type);

    if (!emailSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to send code. Please try again.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'New code sent to your email.',
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

/**
 * Complete profile setup (first time user)
 * POST /auth/complete-profile
 */
export const completeProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!._id;
    const { profilePhoto, photos, favorites, gender } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found.',
      });
      return;
    }

    // Update profile
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (photos && Array.isArray(photos)) user.photos = photos.slice(0, 3);
    if (favorites) {
      user.favorites = {
        food: favorites.food || user.favorites.food,
        placeVisited: favorites.placeVisited || user.favorites.placeVisited,
        placeToBe: favorites.placeToBe || user.favorites.placeToBe,
      };
    }
    if (gender) user.gender = gender;
    
    user.isProfileComplete = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully!',
      data: {
        user: {
          id: user._id,
          uniqueId: user.uniqueId,
          name: user.name,
          username: user.username,
          email: user.email,
          profilePhoto: user.profilePhoto,
          photos: user.photos,
          favorites: user.favorites,
          gender: user.gender,
          isProfileComplete: user.isProfileComplete,
        },
      },
    });
  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.',
    });
  }
};

// Legacy exports for backward compatibility
export const register = initiateSignup;
export const login = initiateLogin;
