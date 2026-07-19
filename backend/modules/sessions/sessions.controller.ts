import { Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// Helper to generate a 6-digit session code
function generateSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper: grade an answer server-side for any question type
function gradeAnswer(question: any, submittedAnswer: string, elapsedSeconds?: number): number {
  const maxPoints = question.points || 10;
  const qType = question.question_type || 'multiple_choice';

  let parsedOptions: string[] = [];
  try {
    parsedOptions = typeof question.options_json === 'string'
      ? JSON.parse(question.options_json)
      : (question.options_json || []);
  } catch (_) { parsedOptions = []; }

  let isCorrect = false;

  if (qType === 'multiple_choice' || qType === 'true_false' || qType === 'audio_mcq' || qType === 'video_mcq' || qType === 'image_choice') {
    isCorrect = submittedAnswer.trim() === String(question.correct_answer || '').trim();

  } else if (qType === 'short_answer' || qType === 'fill_blank') {
    // Case-insensitive, trimmed match
    isCorrect = submittedAnswer.trim().toLowerCase() === String(question.correct_answer || '').trim().toLowerCase();

  } else if (qType === 'multi_select') {
    // Submitted as comma-separated sorted string; correct_answer also comma-separated sorted
    const submitted = submittedAnswer.split(',').map(s => s.trim()).filter(Boolean).sort().join(',');
    const correct = String(question.correct_answer || '').split(',').map((s: string) => s.trim()).filter(Boolean).sort().join(',');
    isCorrect = submitted === correct;

  } else if (qType === 'ordering') {
    // Submitted as pipe-separated string; correct_answer also pipe-separated
    const submitted = submittedAnswer.split('|').map(s => s.trim()).join('|');
    const correct = String(question.correct_answer || '').split('|').map((s: string) => s.trim()).join('|');
    isCorrect = submitted === correct;

  } else if (qType === 'match_following') {
    // Submitted as "Left1:Right1,Left2:Right2" sorted; correct_answer same format
    const normalise = (s: string) => s.split(',').map(pair => pair.trim()).sort().join(',');
    isCorrect = normalise(submittedAnswer) === normalise(String(question.correct_answer || ''));
  }

  if (!isCorrect) return 0;

  // Speed-rush time-decay bonus (if elapsedSeconds provided)
  if (elapsedSeconds !== undefined && elapsedSeconds >= 0) {
    const timeLimit = question.time_limit || 30;
    const ratio = Math.max(0, (timeLimit - elapsedSeconds) / timeLimit);
    return Math.round(maxPoints * ratio);
  }

  return maxPoints;
}

// 1. Launch a Quiz in Live Mode (Faculty Host)
export const launchLiveSession = async (req: AuthenticatedRequest, res: Response) => {
  const { quizId } = req.body;

  if (!quizId) {
    return res.status(400).json({ success: false, error: { message: 'Quiz ID is required.' } });
  }

  try {
    const userId = req.user!.id;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true }
    });

    if (!quiz || quiz.deleted_at) {
      return res.status(404).json({ success: false, error: { message: 'Quiz template not found.' } });
    }

    if (!quiz.questions || quiz.questions.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'Quiz must have at least 1 question to launch.' } });
    }

    const sessionCode = generateSessionCode();

    const liveSession = await prisma.liveSession.create({
      data: {
        session_code: sessionCode,
        quiz_id: quizId,
        host_user_id: userId,
        status: 'waiting',
        current_question_index: 0,
        is_options_revealed: false
      },
      include: {
        quiz: {
          include: { questions: true }
        },
        participants: true
      }
    });

    res.status(201).json({ success: true, data: liveSession });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to launch live session.' } });
  }
};

// 2. Join a Live Quiz Session (Student or Guest Participant)
export const joinLiveSession = async (req: AuthenticatedRequest, res: Response) => {
  const { sessionCode, displayName, sessionId } = req.body;

  const codeOrId = sessionCode || sessionId;
  if (!codeOrId) {
    return res.status(400).json({ success: false, error: { message: 'Session PIN/Code is required.' } });
  }

  try {
    const userId = req.user?.id || null;
    const nameToUse = displayName || (req.user?.email ? req.user.email.split('@')[0] : 'Student');

    // Find session — by code OR by UUID (direct URL join)
    let session: any = null;
    if (sessionCode) {
      session = await prisma.liveSession.findUnique({
        where: { session_code: String(sessionCode).toUpperCase().trim() },
        include: { quiz: { include: { questions: true } } }
      });
    } else if (sessionId) {
      session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { quiz: { include: { questions: true } } }
      });
    }

    if (!session || session.status === 'completed') {
      return res.status(404).json({ success: false, error: { message: 'Live session not found or has already completed.' } });
    }

    // Upsert participant
    let participant;
    if (userId) {
      participant = await prisma.sessionParticipant.upsert({
        where: {
          session_id_user_id: { session_id: session.id, user_id: userId }
        },
        update: { display_name: nameToUse },
        create: {
          session_id: session.id,
          user_id: userId,
          display_name: nameToUse
        }
      });
    } else {
      participant = await prisma.sessionParticipant.create({
        data: {
          session_id: session.id,
          display_name: nameToUse
        }
      });
    }

    res.json({ success: true, data: { session, participant } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to join live session.' } });
  }
};

// 3. Get Live Session State (polling endpoint — 1s interval)
export const getLiveSessionState = async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;

  try {
    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: {
          include: { questions: true }
        },
        host: { select: { display_name: true } },
        participants: {
          orderBy: { score: 'desc' }
        }
      }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Live session not found.' } });
    }

    const currentQuestion = session.quiz?.questions?.[session.current_question_index] || null;

    // Count how many participants have answered current question (stored in options_json metadata hint)
    // We use a lightweight convention: track in a separate JSON field if available, else null
    const answeredCount = null; // Could be extended with an AnswerLog table later

    res.json({
      success: true,
      data: {
        session,
        currentQuestion,
        totalQuestions: session.quiz?.questions?.length || 0,
        participants: session.participants,
        answeredCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch session state.' } });
  }
};

// 4. Host Controls (Start, Pause, Resume, Reveal Options, Next Question, End)
export const handleHostAction = async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  const { action } = req.body;

  if (!action) {
    return res.status(400).json({ success: false, error: { message: 'Host action parameter is required.' } });
  }

  try {
    const userId = req.user!.id;

    const session = await prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { quiz: { include: { questions: true } } }
    });

    if (!session) {
      return res.status(404).json({ success: false, error: { message: 'Session not found.' } });
    }

    if (session.host_user_id !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Only the session host can execute controls.' } });
    }

    let updateData: any = {};

    if (action === 'start') {
      updateData = { status: 'active', current_question_index: 0, is_options_revealed: false };
    } else if (action === 'reveal_options') {
      updateData = { is_options_revealed: true };
    } else if (action === 'pause') {
      updateData = { status: 'paused' };
    } else if (action === 'resume') {
      updateData = { status: 'active' };
    } else if (action === 'next_question') {
      const total = session.quiz?.questions?.length || 0;
      const nextIdx = session.current_question_index + 1;
      if (nextIdx >= total) {
        updateData = { status: 'completed' };
      } else {
        updateData = { current_question_index: nextIdx, is_options_revealed: false, status: 'active' };
      }
    } else if (action === 'end') {
      updateData = { status: 'completed' };
    } else {
      return res.status(400).json({ success: false, error: { message: `Unknown host action: ${action}` } });
    }

    const updated = await prisma.liveSession.update({
      where: { id: sessionId },
      data: updateData,
      include: {
        quiz: { include: { questions: true } },
        participants: true
      }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to execute host action.' } });
  }
};

// 5. Submit Participant Answer — server-side graded for all question types
export const submitParticipantAnswer = async (req: AuthenticatedRequest, res: Response) => {
  const { sessionId } = req.params;
  const { participantId, selectedAnswer, pointsAwarded, elapsedSeconds } = req.body;

  if (!participantId) {
    return res.status(400).json({ success: false, error: { message: 'Participant ID is required.' } });
  }

  try {
    let pts = 0;

    // If selectedAnswer is provided, do server-side grading
    if (selectedAnswer !== undefined && selectedAnswer !== null) {
      // Get current question from session
      const session = await prisma.liveSession.findUnique({
        where: { id: sessionId },
        include: { quiz: { include: { questions: true } } }
      });

      if (session && session.quiz?.questions) {
        const currentQ = session.quiz.questions[session.current_question_index];
        if (currentQ) {
          pts = gradeAnswer(currentQ, String(selectedAnswer), elapsedSeconds);
        }
      }
    } else {
      // Fallback: trust client-provided points (legacy / survey mode)
      pts = Number(pointsAwarded) || 0;
    }

    const participant = await prisma.sessionParticipant.update({
      where: { id: participantId },
      data: {
        score: { increment: pts }
      }
    });

    res.json({ success: true, data: participant, pointsAwarded: pts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to submit answer.' } });
  }
};
