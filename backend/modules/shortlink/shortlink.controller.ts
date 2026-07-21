import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// Helper function to generate unique 6-character short code (e.g. "a7K9x2")
function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 1. Create or retrieve Short Link for a Quiz, Room, or Marketplace Listing
export const createShortLink = async (req: Request, res: Response) => {
  try {
    const { targetType, targetId, title } = req.body;
    const authReq = req as AuthenticatedRequest;
    const createdBy = authReq.user?.id || null;

    if (!targetType || !targetId) {
      return res.status(400).json({
        success: false,
        error: { message: 'targetType and targetId are required.' }
      });
    }

    // Check if a short link already exists for this entity
    const existing = await (prisma as any).shortLink.findFirst({
      where: { target_type: targetType, target_id: targetId }
    });

    if (existing) {
      return res.json({
        success: true,
        data: {
          shortCode: existing.short_code,
          shortUrl: `/s/${existing.short_code}`,
          targetType: existing.target_type,
          targetId: existing.target_id,
          clicks: existing.clicks
        }
      });
    }

    // Generate a unique code
    let shortCode = generateShortCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const found = await (prisma as any).shortLink.findUnique({
        where: { short_code: shortCode }
      });
      if (!found) {
        isUnique = true;
      } else {
        shortCode = generateShortCode();
        attempts++;
      }
    }

    const created = await (prisma as any).shortLink.create({
      data: {
        short_code: shortCode,
        target_type: targetType,
        target_id: targetId,
        title: title || null,
        created_by: createdBy
      }
    });

    res.status(201).json({
      success: true,
      data: {
        shortCode: created.short_code,
        shortUrl: `/s/${created.short_code}`,
        targetType: created.target_type,
        targetId: created.target_id,
        clicks: created.clicks
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to create short URL link.' }
    });
  }
};

// 2. Resolve a Short Code to target details and increment click counter
export const resolveShortLink = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const shortLink = await (prisma as any).shortLink.findUnique({
      where: { short_code: code }
    });

    if (!shortLink) {
      return res.status(404).json({
        success: false,
        error: { message: 'Short URL link not found or expired.' }
      });
    }

    // Increment click count asynchronously
    await (prisma as any).shortLink.update({
      where: { id: shortLink.id },
      data: { clicks: { increment: 1 } }
    });

    // Fetch extra details if target is a quiz
    let quizDetails = null;
    if (shortLink.target_type === 'quiz') {
      const q = await prisma.quiz.findUnique({
        where: { id: shortLink.target_id },
        include: {
          creator: { select: { display_name: true, email: true } },
          questions: { select: { id: true } }
        }
      });
      if (q) {
        quizDetails = {
          id: q.id,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          questionCount: q.questions?.length || (q as any).question_count || 0,
          creatorName: q.creator?.display_name || 'Educator',
          coverImageUrl: (q as any).cover_image_url || null
        };
      }
    }

    res.json({
      success: true,
      data: {
        shortCode: shortLink.short_code,
        targetType: shortLink.target_type,
        targetId: shortLink.target_id,
        title: shortLink.title || quizDetails?.title,
        clicks: shortLink.clicks + 1,
        quizDetails
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { message: error.message || 'Failed to resolve short URL link.' }
    });
  }
};
