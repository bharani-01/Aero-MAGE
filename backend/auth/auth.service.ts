import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { AppError } from '../shared/errors/AppError.js';

// JWT Generation Helpers
const generateAccessToken = (user: { id: string; email: string }) => {
  return jwt.sign({ id: user.id, email: user.email }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRY as any,
  });
};

const generateRefreshToken = (user: { id: string; email: string }) => {
  return jwt.sign({ id: user.id, email: user.email }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRY as any,
  });
};

// 1. User Registration Service
export const handleRegister = async (userData: any) => {
  const { email, password, displayName } = userData;

  if (!email || !password || !displayName) {
    throw new AppError('Email, password, and display name are required.', 400, 'AUTH_BAD_REQUEST');
  }

  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400, 'AUTH_WEAK_PASSWORD');
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email_lower: email.toLowerCase() }
  });

  if (existingUser && existingUser.deleted_at === null) {
    throw new AppError('Email is already registered.', 409, 'AUTH_EMAIL_CONFLICT');
  }

  // Hash Password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Generate Email Verification Token Hash
  const verificationToken = jwt.sign({ email }, config.JWT_ACCESS_SECRET, { expiresIn: '24h' });
  const verificationTokenHash = await bcrypt.hash(verificationToken, 10);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Execute database transaction to create user and all dependent objects
  const user = await prisma.$transaction(async (tx) => {
    // Fetch default organization
    const defaultOrg = await tx.organization.findUnique({
      where: { slug: 'aeromage-community' }
    });

    if (!defaultOrg) {
      throw new AppError('Default organization (aeromage-community) not found. Seeding is required.', 500, 'DATABASE_UNSEEDED');
    }

    const newUser = await tx.user.create({
      data: {
        email,
        email_lower: email.toLowerCase(),
        password_hash: passwordHash,
        display_name: displayName,
        status: 'active',
        is_verified: true,
        has_password: true,
        user_roles: {
          create: {
            role_id: '22222222-2222-2222-2222-222222222222' // Default 'User' Role
          }
        },
        profile: {
          create: {}
        },
        gamification: {
          create: {}
        },
        streak: {
          create: {}
        },
        email_verification_tokens: {
          create: {
            token_hash: verificationTokenHash,
            expires_at: expiresAt
          }
        },
        // Auto-join default organization membership
        organization_memberships: {
          create: {
            organization_id: defaultOrg.id,
            status: 'active'
          }
        }
      }
    });

    // Increment member count in organization
    await tx.organization.update({
      where: { id: defaultOrg.id },
      data: { member_count: { increment: 1 } }
    });

    return newUser;
  });

  // Remove password hash from returned object for safety
  const { password_hash, ...userResponse } = user;
  return { user: userResponse, verificationToken };
};

// 2. User Login Service
export const handleLogin = async (credentials: any, ipAddress: string, userAgent: string) => {
  const { email, password } = credentials;

  if (!email || !password) {
    throw new AppError('Email and password are required.', 400, 'AUTH_BAD_REQUEST');
  }

  const user = await prisma.user.findUnique({
    where: { email_lower: email.toLowerCase() }
  });

  if (!user || user.deleted_at !== null) {
    throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
  }

  // Lockout check
  if (user.status === 'locked' && user.locked_until && user.locked_until > new Date()) {
    const timeDiff = user.locked_until.getTime() - Date.now();
    const minutesLeft = Math.ceil(timeDiff / (60 * 1000));
    throw new AppError(`Account is temporarily locked. Try again in ${minutesLeft} minutes.`, 403, 'AUTH_ACCOUNT_LOCKED');
  }

  // Verify Password
  const isMatch = await bcrypt.compare(password, user.password_hash || '');

  if (!isMatch) {
    const newFailedAttempts = user.failed_login_attempts + 1;
    
    if (newFailedAttempts >= 5) {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins lock
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: newFailedAttempts,
          status: 'locked',
          locked_until: lockedUntil
        }
      });
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { failed_login_attempts: newFailedAttempts }
      });
    }

    // Log history
    await prisma.loginHistory.create({
      data: {
        user_id: user.id,
        login_method: 'email',
        status: 'failed',
        ip_address: ipAddress,
        user_agent: userAgent,
        failure_reason: 'Incorrect password'
      }
    });

    if (newFailedAttempts >= 5) {
      throw new AppError('Too many failed attempts. Account locked for 15 minutes.', 403, 'AUTH_ACCOUNT_LOCKED');
    }

    throw new AppError('Invalid email or password.', 401, 'AUTH_INVALID_CREDENTIALS');
  }

  // Successful Login: Generate Token Pair
  const accessToken = generateAccessToken({ id: user.id, email: user.email });
  const refreshToken = generateRefreshToken({ id: user.id, email: user.email });

  const salt = await bcrypt.genSalt(10);
  const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.$transaction(async (tx) => {
    // Reset counter & update last login
    await tx.user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: new Date()
      }
    });

    // Record login audit log
    await tx.loginHistory.create({
      data: {
        user_id: user.id,
        login_method: 'email',
        status: 'success',
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });

    // Store refresh token
    await tx.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: refreshTokenHash,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
    },
  };
};

// 3. Token Refresh Service (with rotation and reuse protection)
export const handleRefresh = async (refreshTokenStr: string, ipAddress: string, userAgent: string) => {
  if (!refreshTokenStr) {
    throw new AppError('Refresh token required.', 400, 'AUTH_BAD_REQUEST');
  }

  let decoded: any;
  try {
    decoded = jwt.verify(refreshTokenStr, config.JWT_REFRESH_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired refresh token.', 401, 'AUTH_REFRESH_TOKEN_INVALID');
  }

  const { id: userId, email } = decoded;

  // Retrieve all tokens for this user to check match
  const userTokens = await prisma.refreshToken.findMany({
    where: { user_id: userId }
  });

  let targetToken: any = null;

  for (const tokenRecord of userTokens) {
    const isMatch = await bcrypt.compare(refreshTokenStr, tokenRecord.token_hash);
    if (isMatch) {
      targetToken = tokenRecord;
      break;
    }
  }

  if (!targetToken || targetToken.is_revoked || new Date(targetToken.expires_at) < new Date()) {
    throw new AppError('Invalid refresh token.', 401, 'AUTH_REFRESH_TOKEN_INVALID');
  }

  // Token reuse attack detection
  if (targetToken.is_used) {
    // Revoke all tokens for security
    await prisma.refreshToken.updateMany({
      where: { user_id: userId },
      data: { is_revoked: true }
    });
    throw new AppError('Security breach: Refresh token reuse detected. Revoking all sessions.', 401, 'AUTH_SECURITY_BREACH');
  }

  // Rotate Tokens
  const accessToken = generateAccessToken({ id: userId, email });
  const newRefreshToken = generateRefreshToken({ id: userId, email });

  const salt = await bcrypt.genSalt(10);
  const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, salt);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.$transaction(async (tx) => {
    // Mark previous token as used
    await tx.refreshToken.update({
      where: { id: targetToken.id },
      data: { is_used: true }
    });

    // Save new token
    await tx.refreshToken.create({
      data: {
        user_id: userId,
        token_hash: newRefreshTokenHash,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent
      }
    });
  });

  return { accessToken, refreshToken: newRefreshToken };
};

// 4. Logout Service
export const handleLogout = async (refreshTokenStr: string) => {
  if (!refreshTokenStr) return;

  let decoded: any;
  try {
    decoded = jwt.verify(refreshTokenStr, config.JWT_REFRESH_SECRET);
  } catch (err) {
    return; // Already invalid
  }

  const userId = decoded.id;

  const activeTokens = await prisma.refreshToken.findMany({
    where: { user_id: userId, is_revoked: false }
  });

  for (const tokenRecord of activeTokens) {
    const isMatch = await bcrypt.compare(refreshTokenStr, tokenRecord.token_hash);
    if (isMatch) {
      await prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: { is_revoked: true }
      });
      break;
    }
  }
};

// 5. Get Profile Service
export const getUserProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deleted_at: null },
    include: {
      user_roles: {
        include: {
          role: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('User not found.', 404, 'AUTH_USER_NOT_FOUND');
  }

  // Map role
  const firstRole = user.user_roles[0]?.role;

  return {
    id: user.id,
    email: user.email,
    displayName: user.display_name,
    avatarUrl: user.avatar_url,
    status: user.status,
    isVerified: user.is_verified,
    role_name: firstRole?.name || 'user',
    hierarchy_level: firstRole?.hierarchy_level || 10
  };
};

// 6. Forgot Password Service
export const handleForgotPassword = async (email: string) => {
  if (!email) {
    throw new AppError('Email is required.', 400, 'AUTH_BAD_REQUEST');
  }

  const user = await prisma.user.findUnique({
    where: { email_lower: email.toLowerCase() }
  });

  if (!user || user.deleted_at !== null) {
    return { success: true, message: 'If the email exists, a reset link has been generated.' };
  }

  const resetToken = jwt.sign({ id: user.id }, config.JWT_ACCESS_SECRET, { expiresIn: '1h' });
  const resetTokenHash = await bcrypt.hash(resetToken, 10);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      user_id: user.id,
      token_hash: resetTokenHash,
      expires_at: expiresAt
    }
  });

  console.log(`📧 Resend Email simulation: Forgot password reset token generated for ${email}: ${resetToken}`);
  return { success: true, resetToken };
};

// 7. Reset Password Service
export const handleResetPassword = async (token: string, newPassword: any) => {
  if (!token || !newPassword) {
    throw new AppError('Token and new password are required.', 400, 'AUTH_BAD_REQUEST');
  }

  if (newPassword.length < 8) {
    throw new AppError('Password must be at least 8 characters long.', 400, 'AUTH_WEAK_PASSWORD');
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, config.JWT_ACCESS_SECRET);
  } catch (err) {
    throw new AppError('Invalid or expired reset link.', 400, 'AUTH_RESET_TOKEN_INVALID');
  }

  const userId = decoded.id;

  const resetTokens = await prisma.passwordResetToken.findMany({
    where: { user_id: userId }
  });

  let targetToken: any = null;

  for (const tokenRecord of resetTokens) {
    const isMatch = await bcrypt.compare(token, tokenRecord.token_hash);
    if (isMatch) {
      targetToken = tokenRecord;
      break;
    }
  }

  if (!targetToken || targetToken.is_used || new Date(targetToken.expires_at) < new Date()) {
    throw new AppError('Invalid or expired reset link.', 400, 'AUTH_RESET_TOKEN_INVALID');
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.$transaction(async (tx) => {
    // Update password & unlock user
    await tx.user.update({
      where: { id: userId },
      data: {
        password_hash: passwordHash,
        failed_login_attempts: 0,
        locked_until: null,
        status: 'active'
      }
    });

    // Mark reset token as used
    await tx.passwordResetToken.update({
      where: { id: targetToken.id },
      data: { is_used: true }
    });

    // Revoke all refresh tokens
    await tx.refreshToken.updateMany({
      where: { user_id: userId },
      data: { is_revoked: true }
    });
  });
};
