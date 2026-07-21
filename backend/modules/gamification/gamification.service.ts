import { prisma } from '../../config/database.js';

// Default Badge Seed Definitions
const DEFAULT_BADGES = [
  {
    name: 'First Steps',
    description: 'Complete your first quiz in Aero MAGE',
    icon_name: 'flag',
    category: 'participation',
    rarity: 'common',
    criteria_type: 'quizzes_played',
    criteria_value: 1,
    xp_reward: 100
  },
  {
    name: 'Quiz Master',
    description: 'Play 10 quizzes',
    icon_name: 'psychology',
    category: 'participation',
    rarity: 'rare',
    criteria_type: 'quizzes_played',
    criteria_value: 10,
    xp_reward: 300
  },
  {
    name: 'Content Creator',
    description: 'Create your first custom quiz',
    icon_name: 'edit_note',
    category: 'creation',
    rarity: 'common',
    criteria_type: 'quizzes_created',
    criteria_value: 1,
    xp_reward: 150
  },
  {
    name: 'Publisher',
    description: 'Publish a quiz to the Aero MAGE Public Marketplace',
    icon_name: 'storefront',
    category: 'social',
    rarity: 'rare',
    criteria_type: 'marketplace_publishes',
    criteria_value: 1,
    xp_reward: 250
  },
  {
    name: 'Legendary Scholar',
    description: 'Reach 1,000 Total XP',
    icon_name: 'military_tech',
    category: 'mastery',
    rarity: 'epic',
    criteria_type: 'xp_total',
    criteria_value: 1000,
    xp_reward: 500
  },
  {
    name: 'Unstoppable',
    description: 'Maintain a 5-day active streak',
    icon_name: 'local_fire_department',
    category: 'mastery',
    rarity: 'legendary',
    criteria_type: 'streak_days',
    criteria_value: 5,
    xp_reward: 1000
  }
];

// Default Achievements
const DEFAULT_ACHIEVEMENTS = [
  {
    name: 'Knowledge Collector',
    description: 'Play quizzes to earn badges & climb rankings',
    icon_name: 'emoji_events',
    category: 'participation',
    max_tier: 3,
    tiers_json: JSON.stringify([
      { tier: 1, target: 3, reward_xp: 100 },
      { tier: 2, target: 10, reward_xp: 300 },
      { tier: 3, target: 25, reward_xp: 1000 }
    ])
  },
  {
    name: 'Architect of Knowledge',
    description: 'Build quizzes for your institution',
    icon_name: 'architecture',
    category: 'creation',
    max_tier: 3,
    tiers_json: JSON.stringify([
      { tier: 1, target: 1, reward_xp: 150 },
      { tier: 2, target: 5, reward_xp: 500 },
      { tier: 3, target: 15, reward_xp: 1500 }
    ])
  }
];

// Ensure Badges & Achievements are seeded in DB
export const ensureGamificationDefaults = async () => {
  try {
    const badgeCount = await (prisma as any).badge.count();
    if (badgeCount === 0) {
      for (const badge of DEFAULT_BADGES) {
        await (prisma as any).badge.create({ data: badge });
      }
    }

    const achCount = await (prisma as any).achievement.count();
    if (achCount === 0) {
      for (const ach of DEFAULT_ACHIEVEMENTS) {
        await (prisma as any).achievement.create({ data: ach });
      }
    }
  } catch (err) {
    console.error('Gamification seed error:', err);
  }
};

// Evaluate and award unlocked Badges for a user
export const evaluateUserBadges = async (userId: string) => {
  try {
    await ensureGamificationDefaults();

    // Fetch user gamification stats
    const stats = await (prisma as any).userGamification.findUnique({
      where: { user_id: userId }
    });
    const streak = await (prisma as any).userStreak.findUnique({
      where: { user_id: userId }
    });

    if (!stats) return [];

    const quizzesPlayed = stats.quizzes_played || 0;
    const quizzesCreated = stats.quizzes_created || 0;
    const totalXp = Number(stats.total_xp || 0);
    const marketplacePublishes = stats.marketplace_publishes || 0;
    const streakDays = streak?.current_streak || 0;

    // Fetch all active badges
    const badges = await (prisma as any).badge.findMany({ where: { is_active: true } });

    // Fetch user's existing badges
    const earnedUserBadges = await (prisma as any).userBadge.findMany({
      where: { user_id: userId },
      select: { badge_id: true }
    });
    const earnedBadgeIds = new Set(earnedUserBadges.map((ub: any) => ub.badge_id));

    const newlyUnlocked: any[] = [];

    for (const badge of badges) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let qualified = false;
      if (badge.criteria_type === 'quizzes_played' && quizzesPlayed >= badge.criteria_value) {
        qualified = true;
      } else if (badge.criteria_type === 'quizzes_created' && quizzesCreated >= badge.criteria_value) {
        qualified = true;
      } else if (badge.criteria_type === 'xp_total' && totalXp >= badge.criteria_value) {
        qualified = true;
      } else if (badge.criteria_type === 'marketplace_publishes' && marketplacePublishes >= badge.criteria_value) {
        qualified = true;
      } else if (badge.criteria_type === 'streak_days' && streakDays >= badge.criteria_value) {
        qualified = true;
      }

      if (qualified) {
        await (prisma as any).userBadge.create({
          data: {
            user_id: userId,
            badge_id: badge.id
          }
        });

        // Award badge XP reward
        if (badge.xp_reward > 0) {
          await (prisma as any).userGamification.update({
            where: { user_id: userId },
            data: { total_xp: { increment: badge.xp_reward } }
          });
        }

        newlyUnlocked.push(badge);
      }
    }

    return newlyUnlocked;
  } catch (err) {
    console.error('Error evaluating user badges:', err);
    return [];
  }
};
