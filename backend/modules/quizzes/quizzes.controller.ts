import { Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// Helper to resolve user's roles
async function getUserRoles(userId: string): Promise<string[]> {
  const userRoles = await prisma.userRole.findMany({
    where: { user_id: userId },
    include: { role: true }
  });
  return userRoles.map(ur => ur.role.name);
}

// 1. List Quizzes
export const listQuizzes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const roles = await getUserRoles(userId);

    // Resolve user organization
    const membership = await prisma.organizationMember.findFirst({
      where: { user_id: userId, status: 'active' }
    });

    let quizzes = [];

    if (roles.includes('super_admin')) {
      quizzes = await prisma.quiz.findMany({
        where: { deleted_at: null },
        include: { 
          creator: { select: { display_name: true } },
          questions: true
        },
        orderBy: { created_at: 'desc' }
      });
    } else if (roles.includes('faculty') || roles.includes('organization_admin')) {
      // Faculty/OrgAdmin sees their created quizzes + organization quizzes + public quizzes
      quizzes = await prisma.quiz.findMany({
        where: {
          deleted_at: null,
          OR: [
            { created_by: userId },
            { visibility: 'public' },
            {
              organization_id: membership?.organization_id || undefined,
              visibility: 'organization'
            }
          ]
        },
        include: { 
          creator: { select: { display_name: true } },
          questions: true
        },
        orderBy: { created_at: 'desc' }
      });
    } else {
      // Students/Regular users see published organization or public quizzes
      quizzes = await prisma.quiz.findMany({
        where: {
          deleted_at: null,
          status: 'published',
          OR: [
            { visibility: 'public' },
            {
              organization_id: membership?.organization_id || undefined,
              visibility: 'organization'
            }
          ]
        },
        include: { 
          creator: { select: { display_name: true } },
          questions: true
        },
        orderBy: { created_at: 'desc' }
      });
    }

    res.json({ success: true, data: quizzes });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve quizzes.' } });
  }
};

// 2. Get Quiz Details
export const getQuizDetails = async (req: AuthenticatedRequest, res: Response) => {
  const { quizId } = req.params;

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        creator: { select: { display_name: true } },
        questions: {
          orderBy: { created_at: 'asc' }
        }
      }
    });

    if (!quiz || quiz.deleted_at) {
      return res.status(404).json({ success: false, error: { message: 'Quiz template not found.' } });
    }

    res.json({ success: true, data: quiz });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve quiz details.' } });
  }
};

// 3. Create Quiz
export const createQuiz = async (req: AuthenticatedRequest, res: Response) => {
  const { title, description, cover_image_url, visibility, difficulty, questions } = req.body;

  if (!title) {
    return res.status(400).json({ success: false, error: { message: 'Quiz title is required.' } });
  }

  try {
    const userId = req.user!.id;

    // Resolve organization
    const membership = await prisma.organizationMember.findFirst({
      where: { user_id: userId, status: 'active' }
    });

    const parsedQuestions = Array.isArray(questions) ? questions : [];
    const questionCount = parsedQuestions.length;
    const totalPoints = parsedQuestions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);

    const newQuiz = await prisma.quiz.create({
      data: {
        title,
        description,
        cover_image_url,
        status: 'published',
        visibility: visibility || 'private',
        difficulty: difficulty || 'medium',
        question_count: questionCount,
        total_points: totalPoints,
        created_by: userId,
        organization_id: membership?.organization_id || null,
        questions: {
          create: parsedQuestions.map((q: any) => ({
            question_text: q.question_text || 'Untitled Question',
            question_type: q.question_type || 'multiple_choice',
            points: q.points || 10,
            time_limit: q.time_limit !== undefined ? q.time_limit : 30,
            options_json: JSON.stringify(q.options || []),
            correct_answer: String(q.correct_answer ?? '')
          }))
        }
      },
      include: { questions: true }
    });

    res.status(201).json({ success: true, data: newQuiz });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create quiz.' } });
  }
};

// 4. Update Quiz
export const updateQuiz = async (req: AuthenticatedRequest, res: Response) => {
  const { quizId } = req.params;
  const { title, description, cover_image_url, visibility, difficulty, questions } = req.body;

  try {
    const userId = req.user!.id;

    const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!existing || existing.deleted_at) {
      return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
    }

    const parsedQuestions = Array.isArray(questions) ? questions : [];
    const questionCount = parsedQuestions.length;
    const totalPoints = parsedQuestions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);

    // Replace questions
    await prisma.question.deleteMany({ where: { quiz_id: quizId } });

    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        cover_image_url: cover_image_url !== undefined ? cover_image_url : existing.cover_image_url,
        visibility: visibility || existing.visibility,
        difficulty: difficulty || existing.difficulty,
        question_count: questionCount,
        total_points: totalPoints,
        questions: {
          create: parsedQuestions.map((q: any) => ({
            question_text: q.question_text || 'Untitled Question',
            question_type: q.question_type || 'multiple_choice',
            points: q.points || 10,
            time_limit: q.time_limit !== undefined ? q.time_limit : 30,
            options_json: JSON.stringify(q.options || []),
            correct_answer: String(q.correct_answer ?? '')
          }))
        }
      },
      include: { questions: true }
    });

    res.json({ success: true, data: updatedQuiz });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to update quiz.' } });
  }
};

// 5. Update Quiz Visibility
export const updateQuizVisibility = async (req: AuthenticatedRequest, res: Response) => {
  const { quizId } = req.params;
  const { visibility } = req.body;

  if (!['private', 'department', 'organization', 'public'].includes(visibility)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid visibility scope.' } });
  }

  try {
    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: { visibility }
    });
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to update quiz visibility.' } });
  }
};

// 6. Clone Quiz into Personal Library
export const cloneQuiz = async (req: AuthenticatedRequest, res: Response) => {
  const { quizId } = req.params;
  const userId = req.user!.id;

  try {
    const originalQuiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });

    if (!originalQuiz || originalQuiz.deleted_at) {
      return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
    }

    const clonedQuiz = await prisma.quiz.create({
      data: {
        title: `${originalQuiz.title} (Copy)`,
        description: originalQuiz.description,
        cover_image_url: originalQuiz.cover_image_url,
        status: 'published',
        visibility: 'private',
        difficulty: originalQuiz.difficulty,
        question_count: originalQuiz.question_count,
        total_points: originalQuiz.total_points,
        created_by: userId,
        questions: {
          create: originalQuiz.questions.map(q => ({
            question_text: q.question_text,
            question_type: q.question_type,
            points: q.points,
            time_limit: q.time_limit,
            options_json: q.options_json,
            correct_answer: q.correct_answer
          }))
        }
      },
      include: { questions: true }
    });

    res.status(201).json({ success: true, data: clonedQuiz });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to clone quiz.' } });
  }
};
