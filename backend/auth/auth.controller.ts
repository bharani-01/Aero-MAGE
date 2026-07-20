import { Request, Response, NextFunction } from 'express';
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
  getUserProfile,
  handleForgotPassword,
  handleResetPassword,
} from './auth.service.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../config/database.js';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await handleRegister(req.body);
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.get('user-agent') || 'unknown';
    const result = await handleLogin(req.body, ipAddress, userAgent);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required.' });
    }
    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.get('user-agent') || 'unknown';
    const result = await handleRefresh(refreshToken, ipAddress, userAgent);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await handleLogout(refreshToken);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    const profile = await getUserProfile(req.user.id);
    res.status(200).json({
      success: true,
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const userId = req.user.id;
    const { displayName, username, phoneNumber, bio, location } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        display_name: displayName || undefined,
        username: username || undefined,
        phone_number: phoneNumber || undefined,
        profile: {
          upsert: {
            create: { bio: bio || '', location: location || '' },
            update: { bio: bio !== undefined ? bio : undefined, location: location !== undefined ? location : undefined }
          }
        }
      },
      include: {
        profile: true,
        user_roles: { include: { role: true } }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await handleForgotPassword(req.body.email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    const result = await handleResetPassword(token, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
