import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';
import { evaluateUserBadges, ensureGamificationDefaults } from './gamification.service.js';

// 1. Get Logged-in User's Gamification Summary (Level, XP, Badges, Achievements)
export const getUserGamificationProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Trigger dynamic badge evaluation
    const newlyUnlocked = await evaluateUserBadges(userId);

    // Fetch user stats & user details
    const [user, stats, streak, userBadges, userAch] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, display_name: true, email: true, avatar_url: true }
      }),
      (prisma as any).userGamification.findUnique({ where: { user_id: userId } }),
      (prisma as any).userStreak.findUnique({ where: { user_id: userId } }),
      (prisma as any).userBadge.findMany({
        where: { user_id: userId },
        include: { badge: true },
        orderBy: { earned_at: 'desc' }
      }),
      (prisma as any).userAchievement.findMany({
        where: { user_id: userId },
        include: { achievement: true }
      })
    ]);

    const totalXp = Number(stats?.total_xp || 0);
    const currentLevel = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);
    const xpCurrentLevelBase = Math.pow(currentLevel - 1, 2) * 100;
    const xpNextLevelBase = Math.pow(currentLevel, 2) * 100;
    const xpProgress = Math.min(100, Math.round(((totalXp - xpCurrentLevelBase) / (xpNextLevelBase - xpCurrentLevelBase)) * 100));

    res.json({
      success: true,
      data: {
        user: {
          id: user?.id,
          displayName: user?.display_name,
          avatarUrl: user?.avatar_url
        },
        stats: {
          totalXp,
          currentLevel,
          xpProgress,
          xpToNextLevel: xpNextLevelBase - totalXp,
          quizzesPlayed: stats?.quizzes_played || 0,
          quizzesCreated: stats?.quizzes_created || 0,
          marketplacePublishes: stats?.marketplace_publishes || 0,
          marketplaceClones: stats?.marketplace_clones || 0,
          currentStreak: streak?.current_streak || 0,
          longestStreak: streak?.longest_streak || 0
        },
        badges: userBadges.map((ub: any) => ({
          ...ub.badge,
          earnedAt: ub.earned_at,
          isPinned: ub.is_pinned
        })),
        achievements: userAch.map((ua: any) => ({
          ...ua.achievement,
          currentTier: ua.current_tier,
          currentProgress: ua.current_progress
        })),
        newlyUnlockedBadges: newlyUnlocked
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to retrieve gamification profile.' }
    });
  }
};

// 2. Get All System Badges (with user's earned status)
export const getBadges = async (req: Request, res: Response) => {
  try {
    await ensureGamificationDefaults();
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id || null;

    const allBadges = await (prisma as any).badge.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'asc' }
    });

    let earnedMap: Record<string, any> = {};
    if (userId) {
      const userBadges = await (prisma as any).userBadge.findMany({
        where: { user_id: userId }
      });
      userBadges.forEach((ub: any) => {
        earnedMap[ub.badge_id] = ub;
      });
    }

    const data = allBadges.map((badge: any) => ({
      ...badge,
      isEarned: !!earnedMap[badge.id],
      earnedAt: earnedMap[badge.id]?.earned_at || null,
      isPinned: earnedMap[badge.id]?.is_pinned || false
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to retrieve badges.' }
    });
  }
};

// 3. Toggle Pin Badge
export const togglePinBadge = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { badgeId } = req.params;

    const userBadge = await (prisma as any).userBadge.findUnique({
      where: { user_id_badge_id: { user_id: userId, badge_id: badgeId } }
    });

    if (!userBadge) {
      return res.status(404).json({
        success: false,
        error: { message: 'Badge not earned yet.' }
      });
    }

    const updated = await (prisma as any).userBadge.update({
      where: { id: userBadge.id },
      data: { is_pinned: !userBadge.is_pinned }
    });

    res.json({
      success: true,
      message: updated.is_pinned ? 'Badge pinned to profile!' : 'Badge unpinned.',
      isPinned: updated.is_pinned
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to toggle pin badge.' }
    });
  }
};

// 4. Get Global Leaderboard Rankings
export const getGlobalLeaderboard = async (req: Request, res: Response) => {
  try {
    const { limit = '20' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));

    // Fetch top users by total_xp from user_gamification table
    const topGamification = await (prisma as any).userGamification.findMany({
      orderBy: { total_xp: 'desc' },
      take: limitNum
    });

    const userIds = topGamification.map((g: any) => g.user_id);

    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, display_name: true, avatar_url: true, user_roles: { include: { role: true } } }
    });

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const leaderboard = topGamification.map((g: any, index: number) => {
      const u: any = userMap.get(g.user_id);
      const totalXp = Number(g.total_xp || 0);
      const level = Math.max(1, Math.floor(Math.sqrt(totalXp / 100)) + 1);

      return {
        rank: index + 1,
        userId: g.user_id,
        displayName: u?.display_name || 'Anonymous Scholar',
        avatarUrl: u?.avatar_url || null,
        roleName: u?.user_roles?.[0]?.role?.display_name || 'Student',
        totalXp,
        level,
        quizzesPlayed: g.quizzes_played || 0
      };
    });

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to retrieve global leaderboard.' }
    });
  }
};
