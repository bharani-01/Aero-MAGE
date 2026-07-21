import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// Helper to generate 6-char short code
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 1. Publish a Quiz to Public Marketplace
export const publishQuizToMarketplace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { quizId, title, description, category, difficulty } = req.body;

    if (!quizId) {
      return res.status(400).json({ success: false, error: { message: 'quizId is required.' } });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { creator: true, questions: true }
    });

    if (!quiz) {
      return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
    }

    if (quiz.created_by !== userId && (req.user as any)?.role !== 'super_admin') {
      return res.status(403).json({ success: false, error: { message: 'Permission denied. You can only publish your own quizzes.' } });
    }

    // Check if already published
    const existing = await (prisma as any).marketplaceListing.findFirst({
      where: { quiz_id: quizId, status: 'published' }
    });

    if (existing) {
      return res.json({
        success: true,
        message: 'Quiz is already published in marketplace.',
        data: existing
      });
    }

    // Generate short code
    const shortCode = generateShortCode();

    // Create Marketplace Listing
    const listing = await (prisma as any).marketplaceListing.create({
      data: {
        quiz_id: quizId,
        creator_user_id: userId,
        creator_name: quiz.creator?.display_name || (req.user as any)?.displayName || 'Creator',
        title: title || quiz.title,
        description: description || quiz.description,
        category: category || 'General',
        difficulty: difficulty || quiz.difficulty || 'medium',
        question_count: quiz.questions?.length || quiz.question_count || 0,
        short_code: shortCode
      }
    });

    // Also register ShortLink entry for routing
    await (prisma as any).shortLink.create({
      data: {
        short_code: shortCode,
        target_type: 'marketplace',
        target_id: listing.id,
        title: listing.title,
        created_by: userId
      }
    });

    // Update Quiz status to published
    await prisma.quiz.update({
      where: { id: quizId },
      data: { status: 'published', visibility: 'public' }
    });

    // Update User Gamification Stats
    try {
      await (prisma as any).userGamification.upsert({
        where: { user_id: userId },
        update: {
          marketplace_publishes: { increment: 1 },
          total_xp: { increment: 150 }
        },
        create: {
          user_id: userId,
          marketplace_publishes: 1,
          total_xp: 150
        }
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Quiz successfully published to Aero MAGE Marketplace!',
      data: {
        ...listing,
        shortUrl: `/s/${shortCode}`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to publish quiz to marketplace.' }
    });
  }
};

// 2. Explore / Search Marketplace Quizzes
export const exploreMarketplace = async (req: Request, res: Response) => {
  try {
    const { q, category, difficulty, sort = 'trending', page = '1', limit = '12' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 12));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = { status: 'published' };

    if (category && category !== 'All') {
      whereClause.category = category as string;
    }

    if (difficulty && difficulty !== 'All') {
      whereClause.difficulty = difficulty as string;
    }

    if (q) {
      const searchStr = (q as string).trim();
      whereClause.OR = [
        { title: { contains: searchStr, mode: 'insensitive' } },
        { description: { contains: searchStr, mode: 'insensitive' } },
        { creator_name: { contains: searchStr, mode: 'insensitive' } },
        { category: { contains: searchStr, mode: 'insensitive' } }
      ];
    }

    let orderBy: any = { published_at: 'desc' };
    if (sort === 'rating') {
      orderBy = { average_rating: 'desc' };
    } else if (sort === 'clones' || sort === 'popular') {
      orderBy = { clone_count: 'desc' };
    } else if (sort === 'trending') {
      orderBy = [
        { clone_count: 'desc' },
        { average_rating: 'desc' },
        { published_at: 'desc' }
      ];
    }

    const [items, total] = await Promise.all([
      (prisma as any).marketplaceListing.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: limitNum
      }),
      (prisma as any).marketplaceListing.count({ where: whereClause })
    ]);

    res.json({
      success: true,
      data: items.map((item: any) => ({
        ...item,
        shortUrl: item.short_code ? `/s/${item.short_code}` : null
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to explore marketplace.' }
    });
  }
};

// 3. Get Single Marketplace Listing Details
export const getMarketplaceListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const listing = await (prisma as any).marketplaceListing.findUnique({
      where: { id },
      include: {
        ratings: { take: 5, orderBy: { created_at: 'desc' } }
      }
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: { message: 'Marketplace listing not found.' } });
    }

    // Increment view count asynchronously
    await (prisma as any).marketplaceListing.update({
      where: { id },
      data: { view_count: { increment: 1 } }
    });

    res.json({
      success: true,
      data: {
        ...listing,
        shortUrl: listing.short_code ? `/s/${listing.short_code}` : null
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to retrieve marketplace listing.' }
    });
  }
};

// 4. Clone Marketplace Quiz into User's Personal Library
export const cloneMarketplaceQuiz = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const listing = await (prisma as any).marketplaceListing.findUnique({
      where: { id }
    });

    if (!listing) {
      return res.status(404).json({ success: false, error: { message: 'Marketplace listing not found.' } });
    }

    // Fetch original quiz & questions
    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: listing.quiz_id },
      include: { questions: true }
    });

    if (!originalQuiz) {
      return res.status(404).json({ success: false, error: { message: 'Original quiz content missing.' } });
    }

    // Create cloned quiz record in user's library
    const clonedQuiz = await prisma.quiz.create({
      data: {
        title: `${listing.title} (Cloned)`,
        description: listing.description || `Cloned from ${listing.creator_name}'s marketplace item.`,
        status: 'draft',
        visibility: 'private',
        difficulty: listing.difficulty || 'medium',
        question_count: originalQuiz.questions.length,
        total_points: originalQuiz.total_points || 0,
        shuffle_questions: originalQuiz.shuffle_questions,
        shuffle_options: originalQuiz.shuffle_options,
        created_by: userId,
        questions: {
          create: originalQuiz.questions.map((q: any) => ({
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            time_limit: q.time_limit,
            options_json: q.options_json,
            correct_answer: q.correct_answer,
            section_name: q.section_name
          }))
        }
      }
    });

    // Increment clone count on marketplace listing
    await (prisma as any).marketplaceListing.update({
      where: { id },
      data: { clone_count: { increment: 1 } }
    });

    // Update Creator's Gamification stats for clone count
    try {
      await (prisma as any).userGamification.upsert({
        where: { user_id: listing.creator_user_id },
        update: {
          marketplace_clones: { increment: 1 },
          total_xp: { increment: 50 }
        },
        create: {
          user_id: listing.creator_user_id,
          marketplace_clones: 1,
          total_xp: 50
        }
      });
    } catch {}

    res.status(201).json({
      success: true,
      message: 'Quiz successfully cloned to your library!',
      data: clonedQuiz
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to clone quiz from marketplace.' }
    });
  }
};

// 5. Rate Marketplace Listing (1 to 5 Stars)
export const rateMarketplaceListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { rating } = req.body;

    const ratingVal = parseInt(rating);
    if (isNaN(ratingVal) || ratingVal < 1 || ratingVal > 5) {
      return res.status(400).json({ success: false, error: { message: 'Rating must be an integer between 1 and 5.' } });
    }

    const listing = await (prisma as any).marketplaceListing.findUnique({ where: { id } });
    if (!listing) {
      return res.status(404).json({ success: false, error: { message: 'Listing not found.' } });
    }

    // Upsert rating
    const existingRating = await (prisma as any).marketplaceRating.findUnique({
      where: { listing_id_user_id: { listing_id: id, user_id: userId } }
    });

    if (existingRating) {
      const ratingDiff = ratingVal - existingRating.rating;
      await (prisma as any).marketplaceRating.update({
        where: { id: existingRating.id },
        data: { rating: ratingVal }
      });
      
      const newSum = listing.rating_sum + ratingDiff;
      const newAvg = parseFloat((newSum / listing.rating_count).toFixed(2));

      await (prisma as any).marketplaceListing.update({
        where: { id },
        data: { rating_sum: newSum, average_rating: newAvg }
      });
    } else {
      await (prisma as any).marketplaceRating.create({
        data: { listing_id: id, user_id: userId, rating: ratingVal }
      });

      const newCount = listing.rating_count + 1;
      const newSum = listing.rating_sum + ratingVal;
      const newAvg = parseFloat((newSum / newCount).toFixed(2));

      await (prisma as any).marketplaceListing.update({
        where: { id },
        data: { rating_count: newCount, rating_sum: newSum, average_rating: newAvg }
      });
    }

    res.json({ success: true, message: 'Rating submitted successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to submit rating.' } });
  }
};

// 6. Favorite / Unfavorite Marketplace Listing
export const toggleFavoriteMarketplace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const existing = await (prisma as any).marketplaceFavorite.findUnique({
      where: { listing_id_user_id: { listing_id: id, user_id: userId } }
    });

    if (existing) {
      await (prisma as any).marketplaceFavorite.delete({ where: { id: existing.id } });
      await (prisma as any).marketplaceListing.update({
        where: { id },
        data: { favorite_count: { decrement: 1 } }
      });
      return res.json({ success: true, isFavorited: false, message: 'Removed from favorites.' });
    } else {
      await (prisma as any).marketplaceFavorite.create({
        data: { listing_id: id, user_id: userId }
      });
      await (prisma as any).marketplaceListing.update({
        where: { id },
        data: { favorite_count: { increment: 1 } }
      });
      return res.json({ success: true, isFavorited: true, message: 'Added to favorites!' });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to toggle favorite.' } });
  }
};

// 7. Report Marketplace Listing
export const reportMarketplaceListing = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { reason, description } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, error: { message: 'Reason is required.' } });
    }

    await (prisma as any).marketplaceReport.upsert({
      where: { listing_id_reporter_id: { listing_id: id, reporter_id: userId } },
      update: { reason, description, status: 'open' },
      create: { listing_id: id, reporter_id: userId, reason, description }
    });

    res.json({ success: true, message: 'Report submitted. Our moderation team will review this listing.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to submit report.' } });
  }
};
