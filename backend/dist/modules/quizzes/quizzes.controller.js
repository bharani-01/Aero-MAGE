import { prisma } from '../../config/database.js';
// Helper to resolve user's roles
async function getUserRoles(userId) {
    const userRoles = await prisma.userRole.findMany({
        where: { user_id: userId },
        include: { role: true }
    });
    return userRoles.map(ur => ur.role.name);
}
// 1. List Quizzes
export const listQuizzes = async (req, res) => {
    try {
        const userId = req.user.id;
        const roles = await getUserRoles(userId);
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
        }
        else if (roles.includes('faculty') || roles.includes('organization_admin')) {
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
        }
        else {
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
        const userBookmarks = await prisma.userBookmark.findMany({
            where: { user_id: userId },
            select: { quiz_id: true }
        });
        const bookmarkedQuizIds = new Set(userBookmarks.map((b) => b.quiz_id));
        const quizzesWithBookmarkFlag = quizzes.map((q) => ({
            ...q,
            isBookmarked: bookmarkedQuizIds.has(q.id)
        }));
        res.json({ success: true, data: quizzesWithBookmarkFlag });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve quizzes.' } });
    }
};
// 2. Get Quiz Details
export const getQuizDetails = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve quiz details.' } });
    }
};
// 3. Create Quiz
export const createQuiz = async (req, res) => {
    const { title, description, cover_image_url, visibility, difficulty, questions } = req.body;
    if (!title) {
        return res.status(400).json({ success: false, error: { message: 'Quiz title is required.' } });
    }
    try {
        const userId = req.user.id;
        const membership = await prisma.organizationMember.findFirst({
            where: { user_id: userId, status: 'active' }
        });
        const parsedQuestions = Array.isArray(questions) ? questions : [];
        const questionCount = parsedQuestions.length;
        const totalPoints = parsedQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
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
                    create: parsedQuestions.map((q) => ({
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to create quiz.' } });
    }
};
// 4. Update Quiz
export const updateQuiz = async (req, res) => {
    const { quizId } = req.params;
    const { title, description, cover_image_url, visibility, difficulty, questions } = req.body;
    try {
        const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
        if (!existing || existing.deleted_at) {
            return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
        }
        const parsedQuestions = Array.isArray(questions) ? questions : [];
        const questionCount = parsedQuestions.length;
        const totalPoints = parsedQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
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
                    create: parsedQuestions.map((q) => ({
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to update quiz.' } });
    }
};
// 5. Update Quiz Visibility
export const updateQuizVisibility = async (req, res) => {
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to update quiz visibility.' } });
    }
};
// 6. Clone Quiz into Personal Library
export const cloneQuiz = async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;
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
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to clone quiz.' } });
    }
};
// 7. Toggle Quiz Bookmark (Saved in user_bookmark DB table)
export const toggleBookmark = async (req, res) => {
    const { quizId } = req.params;
    const userId = req.user.id;
    try {
        const existing = await prisma.userBookmark.findUnique({
            where: {
                user_id_quiz_id: { user_id: userId, quiz_id: quizId }
            }
        });
        if (existing) {
            await prisma.userBookmark.delete({
                where: { id: existing.id }
            });
            return res.json({ success: true, isBookmarked: false, message: 'Quiz removed from bookmarks.' });
        }
        else {
            const bookmark = await prisma.userBookmark.create({
                data: {
                    user_id: userId,
                    quiz_id: quizId
                }
            });
            return res.json({ success: true, isBookmarked: true, data: bookmark, message: 'Quiz saved to bookmarks.' });
        }
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to toggle bookmark.' } });
    }
};
// 8. Get Saved / Bookmarked Quizzes for current user
export const getUserBookmarks = async (req, res) => {
    const userId = req.user.id;
    try {
        const bookmarks = await prisma.userBookmark.findMany({
            where: { user_id: userId },
            include: {
                quiz: {
                    include: {
                        creator: { select: { display_name: true } },
                        questions: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        const savedQuizzes = bookmarks.map((b) => ({
            ...b.quiz,
            isBookmarked: true,
            bookmarkedAt: b.created_at
        }));
        res.json({ success: true, data: savedQuizzes });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve saved bookmarks.' } });
    }
};
// 9. Save Student Quiz Attempt / Completion Progress (In quiz_attempt DB table)
export const recordQuizAttempt = async (req, res) => {
    const { quizId } = req.params;
    const { score, totalPoints, timeTakenSeconds, answers } = req.body;
    const userId = req.user.id;
    const userObj = req.user;
    try {
        const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
            return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
        }
        const studentName = userObj?.displayName || userObj?.email?.split('@')[0] || 'Student';
        const total = totalPoints || quiz.total_points || 100;
        const achievedScore = score || 0;
        const percentage = Math.round((achievedScore / total) * 100 * 10) / 10;
        const attempt = await prisma.quizAttempt.create({
            data: {
                quiz_id: quizId,
                user_id: userId,
                student_name: studentName,
                score: achievedScore,
                total_points: total,
                percentage,
                time_taken_seconds: timeTakenSeconds || 0,
                answers_json: answers ? JSON.stringify(answers) : null,
                completed_at: new Date()
            }
        });
        res.status(201).json({ success: true, data: attempt, message: 'Quiz attempt saved to database.' });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to save quiz attempt.' } });
    }
};
// 10. Get Student Quiz Results & Attempt Analytics for Faculty (From quiz_attempt & assignment_submission DB tables)
export const getQuizAttempts = async (req, res) => {
    const { quizId } = req.params;
    try {
        const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
        if (!quiz) {
            return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
        }
        const attempts = await prisma.quizAttempt.findMany({
            where: { quiz_id: quizId },
            include: {
                user: { select: { email: true, display_name: true } }
            },
            orderBy: { completed_at: 'desc' }
        });
        // Also include classroom assignment submissions for this quiz
        const assignmentsForQuiz = await prisma.classroomAssignment.findMany({
            where: { quiz_id: quizId },
            select: { id: true }
        });
        const assignmentIds = assignmentsForQuiz.map((a) => a.id);
        let assignmentSubmissions = [];
        if (assignmentIds.length > 0) {
            assignmentSubmissions = await prisma.assignmentSubmission.findMany({
                where: { assignment_id: { in: assignmentIds } },
                include: { user: { select: { email: true, display_name: true } } },
                orderBy: { submitted_at: 'desc' }
            });
        }
        const map = new Map();
        // Add direct attempts
        attempts.forEach((a) => {
            const key = `${a.user_id}_${a.completed_at.getTime()}`;
            map.set(key, {
                id: a.id,
                studentId: a.user_id,
                studentName: a.student_name || a.user?.display_name || 'Student',
                studentEmail: a.user?.email || 'student@school.edu',
                score: a.score,
                totalPoints: a.total_points,
                percentage: a.percentage,
                timeTakenSeconds: a.time_taken_seconds,
                completedAt: a.completed_at
            });
        });
        // Add assignment submissions if not already present
        assignmentSubmissions.forEach((sub) => {
            const existingUserAttempt = Array.from(map.values()).find(x => x.studentId === sub.user_id && Math.abs(new Date(x.completedAt).getTime() - new Date(sub.submitted_at).getTime()) < 5000);
            if (!existingUserAttempt) {
                const key = `sub_${sub.id}`;
                map.set(key, {
                    id: sub.id,
                    studentId: sub.user_id,
                    studentName: sub.student_name || sub.user?.display_name || 'Student',
                    studentEmail: sub.user?.email || 'student@school.edu',
                    score: sub.score,
                    totalPoints: sub.total_points,
                    percentage: sub.percentage,
                    timeTakenSeconds: sub.time_taken_seconds,
                    completedAt: sub.submitted_at
                });
            }
        });
        const mappedAttempts = Array.from(map.values()).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
        const totalAttempts = mappedAttempts.length;
        const avgScore = totalAttempts > 0
            ? Math.round(mappedAttempts.reduce((sum, a) => sum + a.score, 0) / totalAttempts)
            : 0;
        const avgPercentage = totalAttempts > 0
            ? Math.round((mappedAttempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts) * 10) / 10
            : 0;
        res.json({
            success: true,
            data: {
                quiz,
                stats: {
                    totalAttempts,
                    avgScore,
                    avgPercentage
                },
                attempts: mappedAttempts
            }
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to fetch quiz attempt analytics.' } });
    }
};
