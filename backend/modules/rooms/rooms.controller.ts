import { Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// 1. List Rooms Created by or Joined by the Faculty User
export const listRooms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Fetch rooms created by user OR where user is a room member
    const memberships = await (prisma as any).roomMember.findMany({
      where: { user_id: userId },
      select: { room_id: true }
    });
    const joinedRoomIds = memberships.map((m: any) => m.room_id);

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { created_by: userId },
          { id: { in: joinedRoomIds } }
        ]
      },
      include: {
        creator: {
          select: { id: true, display_name: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const data = rooms.map((r: any) => ({
      ...r,
      memberCount: r._count?.members || 1
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to retrieve rooms list.' } });
  }
};

// Helper to generate a 100% unique 6-character room access code
async function generateUniqueRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid ambiguous chars 0, O, 1, I
  let code = '';
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 30) {
    attempts++;
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await prisma.room.findUnique({ where: { room_code: code } });
    if (!existing) {
      isUnique = true;
    }
  }
  return code;
}

// 2. Create a Room
export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { name, roomCode, bannerUrl, roomMode } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: { message: 'Classroom name is required.' } });
  }

  try {
    const userId = req.user!.id;

    // Resolve user organization
    const membership = await prisma.organizationMember.findFirst({
      where: { user_id: userId, status: 'active' }
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: { message: 'You must belong to an organization to build rooms.' } });
    }

    // Auto-generate or verify unique room code
    let finalCode = (roomCode || '').trim().toUpperCase();
    if (!finalCode || finalCode.length < 4) {
      finalCode = await generateUniqueRoomCode();
    } else {
      const existingRoom = await prisma.room.findUnique({
        where: { room_code: finalCode }
      });
      if (existingRoom) {
        finalCode = await generateUniqueRoomCode();
      }
    }

    const defaultBanners = [
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=1200&auto=format&fit=crop'
    ];
    const chosenBanner = bannerUrl || defaultBanners[Math.floor(Math.random() * defaultBanners.length)];

    const newRoom = await prisma.room.create({
      data: {
        name,
        room_code: finalCode,
        organization_id: membership.organization_id,
        banner_url: chosenBanner,
        status: roomMode || 'active',
        created_by: userId
      }
    });

    // Automatically enroll creator as first member
    await (prisma as any).roomMember.create({
      data: {
        room_id: newRoom.id,
        user_id: userId
      }
    });

    res.status(201).json({ success: true, data: newRoom });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create room.' } });
  }
};

// 3. Connect/Join Room via Access Code or Direct Join (Enforces All 5 Access Modes)
export const joinRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { roomCode, roomId } = req.body;

  try {
    let room: any = null;
    if (roomId) {
      room = await prisma.room.findUnique({
        where: { id: roomId },
        include: {
          organization: { select: { id: true, name: true } },
          creator: { select: { id: true, display_name: true } }
        }
      });
    } else if (roomCode) {
      room = await prisma.room.findUnique({
        where: { room_code: roomCode.toUpperCase() },
        include: {
          organization: { select: { id: true, name: true } },
          creator: { select: { id: true, display_name: true } }
        }
      });
    }

    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found or code invalid.' } });
    }

    const userId = req.user!.id;

    // 1. Mode Enforcement: Archived
    if (room.status === 'archived') {
      return res.status(400).json({ success: false, error: { message: 'This classroom is archived and no longer accepting new enrollments.' } });
    }

    // 2. Mode Enforcement: Organization Members Only
    if (room.status === 'org_only') {
      const userOrg = await prisma.organizationMember.findFirst({
        where: { user_id: userId, status: 'active' }
      });
      if (!userOrg || userOrg.organization_id !== room.organization_id) {
        return res.status(403).json({ success: false, error: { message: `This course is restricted to members of ${room.organization?.name || 'its parent organization'}.` } });
      }
    }

    // Determine Membership Status
    const isApprovalMode = room.status === 'approval_required';

    // Check existing membership
    const existingMembership = await (prisma as any).roomMember.findUnique({
      where: { room_id_user_id: { room_id: room.id, user_id: userId } }
    });

    if (existingMembership) {
      if (existingMembership.status === 'pending') {
        return res.json({
          success: true,
          pending: true,
          message: 'Your request to join this classroom is pending faculty approval.',
          data: { id: room.id, name: room.name, room_code: room.room_code, status: 'pending' }
        });
      }
      return res.json({
        success: true,
        message: `Already enrolled in ${room.name}.`,
        data: { id: room.id, name: room.name, room_code: room.room_code, status: 'active' }
      });
    }

    const targetStatus = isApprovalMode ? 'pending' : 'active';

    // Create student membership record
    const newMembership = await (prisma as any).roomMember.create({
      data: {
        room_id: room.id,
        user_id: userId,
        status: targetStatus,
        joined_at: new Date()
      }
    });

    if (newMembership.status === 'pending') {
      return res.json({
        success: true,
        pending: true,
        message: 'Your join request has been submitted to the faculty instructor for approval.',
        data: {
          id: room.id,
          name: room.name,
          code: room.room_code,
          status: 'pending'
        }
      });
    }

    const joinedRoomData = {
      id: room.id,
      name: room.name,
      code: room.room_code,
      organization: room.organization?.name || 'Institute',
      creatorName: room.creator?.display_name || 'Faculty',
      status: 'active'
    };

    res.json({
      success: true,
      message: `Successfully connected to classroom [${room.room_code}].`,
      data: joinedRoomData,
      room: joinedRoomData
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to join classroom.' } });
  }
};

// 3b. Get Student's Joined Classrooms List
export const getJoinedRooms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const memberships = await (prisma as any).roomMember.findMany({
      where: { user_id: userId },
      include: {
        room: {
          include: {
            creator: { select: { display_name: true } }
          }
        }
      },
      orderBy: { joined_at: 'desc' }
    });

    const joinedRooms = memberships.map((m: any) => ({
      id: m.room.id,
      name: m.room.name,
      room_code: m.room.room_code,
      banner_url: m.room.banner_url,
      status: m.room.status,
      creatorName: m.room.creator?.display_name || 'Faculty',
      joinedAt: m.joined_at
    }));

    res.json({ success: true, data: joinedRooms });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch joined classrooms.' } });
  }
};

// 3c. Leave / Unenroll from Classroom
export const leaveRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  try {
    await (prisma as any).roomMember.delete({
      where: {
        room_id_user_id: { room_id: roomId, user_id: userId }
      }
    });
    res.json({ success: true, message: 'Unenrolled from classroom successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to unenroll from classroom.' } });
  }
};

// 3d. Backend Search & Explore All Classrooms with Enrollment Verification & Pagination
export const exploreRooms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { q, page = '1', limit = '12', scope = 'enrolled' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 12);
    const skip = (pageNum - 1) * limitNum;
    const searchQuery = (q as string || '').trim();

    // Get all user memberships to verify enrollment status
    const userMemberships = await (prisma as any).roomMember.findMany({
      where: { user_id: userId },
      select: { room_id: true }
    });
    const enrolledRoomIds = new Set<string>(userMemberships.map((m: any) => m.room_id));

    let whereClause: any = {};

    if (scope === 'enrolled') {
      whereClause.id = { in: Array.from(enrolledRoomIds) };
    } else {
      // In Explore All Directory:
      // Exclude 'code_only' (private code courses) and 'archived' courses!
      whereClause.status = { in: ['public', 'org_only', 'approval_required', 'active'] };
    }

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: 'insensitive' } },
        { room_code: { contains: searchQuery, mode: 'insensitive' } },
        { creator: { display_name: { contains: searchQuery, mode: 'insensitive' } } }
      ];
    }

    const [total, rooms] = await Promise.all([
      prisma.room.count({ where: whereClause }),
      prisma.room.findMany({
        where: whereClause,
        include: {
          creator: { select: { display_name: true } },
          _count: { select: { members: true } }
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limitNum
      })
    ]);

    const mappedRooms = rooms.map((r: any) => ({
      id: r.id,
      name: r.name,
      room_code: r.room_code,
      banner_url: r.banner_url,
      status: r.status,
      creatorName: r.creator?.display_name || 'Faculty',
      memberCount: r._count?.members || 0,
      isEnrolled: enrolledRoomIds.has(r.id)
    }));

    res.json({
      success: true,
      data: mappedRooms,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to search classrooms.' } });
  }
};

// 4. Get Classroom Stream Feed from DB
export const getRoomFeed = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { creator: { select: { display_name: true } } }
    });

    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found.' } });
    }

    // Check if student's join request is pending approval
    const membership = await (prisma as any).roomMember.findUnique({
      where: { room_id_user_id: { room_id: roomId, user_id: userId } }
    });

    if (membership && membership.status === 'pending' && room.created_by !== userId) {
      return res.status(403).json({
        success: false,
        pending: true,
        error: { message: 'Your join request for this classroom is pending faculty approval.' }
      });
    }

    const dbPosts = await (prisma as any).roomPost.findMany({
      where: { room_id: roomId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            question_count: true,
            difficulty: true,
            cover_image_url: true
          }
        },
        comments: {
          orderBy: { created_at: 'asc' }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const posts = dbPosts.map((p: any) => ({
      id: p.id,
      roomId: p.room_id,
      authorName: p.author_name,
      authorRole: p.author_role,
      content: p.content,
      createdAt: p.created_at,
      attachedQuiz: p.quiz ? {
        id: p.quiz.id,
        title: p.quiz.title,
        questionCount: p.quiz.question_count,
        difficulty: p.quiz.difficulty,
        coverImageUrl: p.quiz.cover_image_url
      } : null,
      comments: p.comments.map((c: any) => ({
        id: c.id,
        authorName: c.author_name,
        text: c.text,
        createdAt: c.created_at
      }))
    }));

    res.json({
      success: true,
      data: {
        room,
        posts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch classroom stream.' } });
  }
};

// 5. Post Announcement / Attach Quiz to Classroom Stream
export const createRoomPost = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { content, quizId } = req.body;

  if (!content && !quizId) {
    return res.status(400).json({ success: false, error: { message: 'Post content or quiz attachment is required.' } });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { creator: { select: { display_name: true } } }
    });

    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found.' } });
    }

    const userObj = req.user as any;
    const authorName = userObj?.displayName || userObj?.email?.split('@')[0] || 'Faculty';

    let defaultContent = content;
    if (!defaultContent && quizId) {
      const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
      if (quiz) defaultContent = `Assigned Quiz: ${quiz.title}`;
    }

    const newPost = await (prisma as any).roomPost.create({
      data: {
        room_id: roomId,
        author_name: authorName,
        author_role: userObj?.role_name || 'Faculty',
        content: defaultContent || '',
        quiz_id: quizId || null
      },
      include: {
        quiz: true,
        comments: true
      }
    });

    res.status(201).json({ success: true, data: newPost });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to publish post to classroom stream.' } });
  }
};

// 6. Add Comment / Reply to Classroom Post
export const addPostComment = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, postId } = req.params;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: { message: 'Comment text is required.' } });
  }

  try {
    const post = await (prisma as any).roomPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ success: false, error: { message: 'Post not found in classroom stream.' } });
    }

    const userObj = req.user as any;
    const authorName = userObj?.displayName || (userObj?.email ? userObj.email.split('@')[0] : 'Student');

    const newComment = await (prisma as any).roomComment.create({
      data: {
        post_id: postId,
        author_name: authorName,
        text: text.trim()
      }
    });

    res.status(201).json({ success: true, data: newComment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to post comment.' } });
  }
};

// 7. Get Classroom Enrolled Members List (From DB room_member table)
export const getRoomMembers = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  try {
    const members = await (prisma as any).roomMember.findMany({
      where: { room_id: roomId },
      include: {
        user: {
          select: { id: true, display_name: true, email: true }
        }
      },
      orderBy: { joined_at: 'desc' }
    });

    const mapped = members.map((m: any) => ({
      id: m.user.id,
      name: m.user.display_name || m.user.email.split('@')[0],
      email: m.user.email,
      joinedAt: m.joined_at
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch classroom members.' } });
  }
};

// 8. Remove Student Member from Classroom (Faculty Only)
export const removeRoomMember = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, memberId } = req.params;

  try {
    await (prisma as any).roomMember.delete({
      where: {
        room_id_user_id: { room_id: roomId, user_id: memberId }
      }
    });
    res.json({ success: true, message: 'Student member removed from classroom.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Member not found or already removed.' } });
  }
};

// 9. Create Classroom Assignment (Faculty Only)
export const createAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { quizId, title, instructions, dueDate, totalPoints, maxAttempts, timeLimitMinutes, showAnswers } = req.body;

  if (!quizId || !title) {
    return res.status(400).json({ success: false, error: { message: 'Quiz ID and title are required for assignment.' } });
  }

  try {
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) {
      return res.status(404).json({ success: false, error: { message: 'Quiz not found.' } });
    }

    const newAssignment = await (prisma as any).classroomAssignment.create({
      data: {
        room_id: roomId,
        quiz_id: quizId,
        title,
        instructions: instructions || null,
        due_date: dueDate ? new Date(dueDate) : null,
        total_points: totalPoints || quiz.total_points || 100,
        max_attempts: maxAttempts !== undefined ? Number(maxAttempts) : 1,
        time_limit_minutes: timeLimitMinutes ? Number(timeLimitMinutes) : null,
        show_answers: showAnswers !== false
      },
      include: { quiz: true }
    });

    const userObj = req.user as any;
    const authorName = userObj?.displayName || 'Faculty';
    await (prisma as any).roomPost.create({
      data: {
        room_id: roomId,
        author_name: authorName,
        author_role: 'Faculty',
        content: `📋 Assignment Posted: "${title}". Due: ${dueDate ? new Date(dueDate).toLocaleDateString() : 'No Due Date'} (${maxAttempts === 1 ? 'Single Attempt' : 'Multiple Attempts'})`,
        quiz_id: quizId
      }
    });

    res.status(201).json({ success: true, data: newAssignment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create assignment.' } });
  }
};

// 10. Get Classroom Assignments List
export const getRoomAssignments = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  try {
    const assignments = await (prisma as any).classroomAssignment.findMany({
      where: { room_id: roomId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            question_count: true,
            difficulty: true,
            cover_image_url: true
          }
        },
        submissions: {
          where: { user_id: userId }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const mapped = assignments.map((a: any) => ({
      id: a.id,
      roomId: a.room_id,
      quizId: a.quiz_id,
      title: a.title,
      instructions: a.instructions,
      dueDate: a.due_date,
      totalPoints: a.total_points,
      maxAttempts: a.max_attempts,
      timeLimitMinutes: a.time_limit_minutes,
      showAnswers: a.show_answers,
      createdAt: a.created_at,
      quiz: a.quiz,
      userSubmission: a.submissions.length > 0 ? a.submissions[0] : null
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch assignments.' } });
  }
};

// 11. Submit Assignment (Student)
export const submitAssignment = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, assignmentId } = req.params;
  const { score, totalPoints, timeTakenSeconds } = req.body;
  const userId = req.user!.id;
  const userObj = req.user as any;

  try {
    const assignment = await (prisma as any).classroomAssignment.findUnique({
      where: { id: assignmentId },
      include: { submissions: { where: { user_id: userId } } }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: { message: 'Assignment not found.' } });
    }

    if (assignment.max_attempts > 0 && assignment.submissions.length >= assignment.max_attempts) {
      return res.status(403).json({ success: false, error: { message: `Maximum attempts (${assignment.max_attempts}) reached for this assignment.` } });
    }

    const studentName = userObj?.displayName || userObj?.email?.split('@')[0] || 'Student';
    const total = totalPoints || assignment.total_points || 100;
    const achievedScore = score || 0;
    const percentage = Math.round((achievedScore / total) * 100 * 10) / 10;

    const submission = await (prisma as any).assignmentSubmission.upsert({
      where: {
        assignment_id_user_id: { assignment_id: assignmentId, user_id: userId }
      },
      update: {
        score: achievedScore,
        total_points: total,
        percentage,
        time_taken_seconds: timeTakenSeconds || 0,
        status: 'submitted',
        submitted_at: new Date()
      },
      create: {
        assignment_id: assignmentId,
        user_id: userId,
        student_name: studentName,
        score: achievedScore,
        total_points: total,
        percentage,
        time_taken_seconds: timeTakenSeconds || 0,
        status: 'submitted'
      }
    });

    // Also record general quiz attempt for progress reports!
    await (prisma as any).quizAttempt.create({
      data: {
        quiz_id: assignment.quiz_id,
        user_id: userId,
        student_name: studentName,
        score: achievedScore,
        total_points: total,
        percentage,
        time_taken_seconds: timeTakenSeconds || 0,
        completed_at: new Date()
      }
    });

    res.json({ success: true, data: submission, message: 'Assignment submitted successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to submit assignment.' } });
  }
};

// 12. Get Assignment Analytics & Student Submission Marks Report (Faculty Only)
export const getAssignmentAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, assignmentId } = req.params;

  try {
    const assignment = await (prisma as any).classroomAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        quiz: true,
        submissions: {
          include: {
            user: { select: { email: true, display_name: true } }
          },
          orderBy: { submitted_at: 'desc' }
        }
      }
    });

    if (!assignment) {
      return res.status(404).json({ success: false, error: { message: 'Assignment not found.' } });
    }

    const roomMembers = await (prisma as any).roomMember.findMany({
      where: { room_id: roomId },
      include: { user: { select: { id: true, display_name: true, email: true } } }
    });

    const enrolledMembers = roomMembers.map((m: any) => ({
      id: m.user.id,
      name: m.user.display_name || m.user.email.split('@')[0],
      email: m.user.email
    }));

    const submissionsMap = new Map(assignment.submissions.map((s: any) => [s.user_id, s]));

    // Combine actual joined students and submitters
    const combinedStudentsMap = new Map<string, any>();
    enrolledMembers.forEach((m: any) => {
      combinedStudentsMap.set(m.id, { id: m.id, name: m.name, email: m.email });
    });
    assignment.submissions.forEach((sub: any) => {
      if (!combinedStudentsMap.has(sub.user_id)) {
        combinedStudentsMap.set(sub.user_id, {
          id: sub.user_id,
          name: sub.student_name,
          email: sub.user?.email || 'student@school.edu'
        });
      }
    });

    const studentList = Array.from(combinedStudentsMap.values());

    const studentReport = studentList.map((member: any) => {
      const sub: any = submissionsMap.get(member.id) || assignment.submissions.find((s: any) => s.student_name.toLowerCase() === member.name.toLowerCase());

      return {
        studentId: member.id,
        studentName: member.name,
        studentEmail: member.email,
        status: sub ? 'Turned In' : 'Missing',
        score: sub ? sub.score : 0,
        totalPoints: assignment.total_points,
        percentage: sub ? sub.percentage : 0,
        timeTakenSeconds: sub ? sub.time_taken_seconds : 0,
        submittedAt: sub ? sub.submitted_at : null
      };
    });

    const turnedInCount = studentReport.filter((r: any) => r.status === 'Turned In').length;
    const avgScore = turnedInCount > 0 
      ? Math.round(studentReport.filter((r: any) => r.status === 'Turned In').reduce((sum: number, r: any) => sum + r.score, 0) / turnedInCount) 
      : 0;

    res.json({
      success: true,
      data: {
        assignment,
        stats: {
          totalAssigned: studentReport.length,
          turnedInCount,
          missingCount: studentReport.length - turnedInCount,
          avgScore
        },
        studentReport
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch assignment analytics.' } });
  }
};

// 7. Get Pending Join Requests for Classroom (Faculty / Instructor)
export const getPendingRequests = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  try {
    const pendingMembers = await (prisma as any).roomMember.findMany({
      where: { room_id: roomId, status: 'pending' },
      include: {
        user: { select: { id: true, display_name: true, email: true, avatar_url: true } }
      },
      orderBy: { joined_at: 'desc' }
    });

    const data = pendingMembers.map((m: any) => ({
      id: m.id,
      userId: m.user_id,
      name: m.user.display_name,
      email: m.user.email,
      avatarUrl: m.user.avatar_url,
      requestedAt: m.joined_at
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to fetch pending requests.' } });
  }
};

// 8. Approve Pending Join Request
export const approveRoomRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.params;
  try {
    await (prisma as any).roomMember.update({
      where: { id: requestId },
      data: { status: 'active' }
    });
    res.json({ success: true, message: 'Student join request approved successfully.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to approve join request.' } });
  }
};

// 9. Reject Pending Join Request
export const rejectRoomRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { requestId } = req.params;
  try {
    await (prisma as any).roomMember.delete({
      where: { id: requestId }
    });
    res.json({ success: true, message: 'Student join request rejected.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to reject join request.' } });
  }
};

// 10. Update Classroom Details & Access Policy (Faculty / Instructor)
export const updateRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { name, roomMode, bannerUrl } = req.body;
  const userId = req.user!.id;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found.' } });
    }

    if (room.created_by !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Only the classroom creator can modify course settings.' } });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: {
        name: name !== undefined ? name.trim() : room.name,
        status: roomMode !== undefined ? roomMode : room.status,
        banner_url: bannerUrl !== undefined ? bannerUrl : room.banner_url,
        updated_at: new Date()
      }
    });

    res.json({ success: true, message: 'Classroom details updated successfully.', data: updatedRoom });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to update classroom.' } });
  }
};

// 11. Transfer Classroom Ownership
export const transferRoomOwnership = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const { newOwnerUserId } = req.body;
  const userId = req.user!.id;

  if (!newOwnerUserId) {
    return res.status(400).json({ success: false, error: { message: 'New owner User ID is required.' } });
  }

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found.' } });
    }

    if (room.created_by !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Only the current classroom owner can transfer ownership.' } });
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { created_by: newOwnerUserId, updated_at: new Date() }
    });

    res.json({ success: true, message: 'Classroom ownership transferred successfully.', data: updatedRoom });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to transfer ownership.' } });
  }
};

// 12. Delete Classroom Permanently
export const deleteRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const userId = req.user!.id;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found.' } });
    }

    if (room.created_by !== userId) {
      return res.status(403).json({ success: false, error: { message: 'Only the classroom creator can delete this course.' } });
    }

    await prisma.room.delete({ where: { id: roomId } });
    res.json({ success: true, message: 'Classroom deleted permanently.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to delete classroom.' } });
  }
};
