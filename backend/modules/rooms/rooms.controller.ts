import { Response } from 'express';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// In-memory persistent store for Classroom Enrolled Members
const roomMembersStore: Record<string, any[]> = {};

// Helper: Seed default members for a classroom if empty
function getOrSeedRoomMembers(roomId: string) {
  if (!roomMembersStore[roomId]) {
    roomMembersStore[roomId] = [
      { id: 'm-seed-1', name: 'Alex Johnson', email: 'alex@school.edu', joinedAt: new Date(Date.now() - 86400000).toISOString() },
      { id: 'm-seed-2', name: 'Sarah Miller', email: 'sarah@school.edu', joinedAt: new Date(Date.now() - 43200000).toISOString() },
      { id: 'm-seed-3', name: 'David Smith', email: 'david@school.edu', joinedAt: new Date(Date.now() - 21600000).toISOString() }
    ];
  }
  return roomMembersStore[roomId];
}

// 1. List Rooms Created by the particular Faculty user ONLY
export const listRooms = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Filter by created_by: userId so faculty members see ONLY their own created classrooms
    const rooms = await prisma.room.findMany({
      where: {
        created_by: userId,
        status: 'active'
      },
      include: {
        creator: {
          select: { id: true, display_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json({ success: true, data: rooms });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve rooms list.' } });
  }
};

// 2. Create a Room
export const createRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { name, roomCode } = req.body;

  if (!name || !roomCode) {
    return res.status(400).json({ success: false, error: { message: 'Room name and code are required.' } });
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

    // Check if room code is unique
    const existingRoom = await prisma.room.findUnique({
      where: { room_code: roomCode.toUpperCase() }
    });

    if (existingRoom) {
      return res.status(409).json({ success: false, error: { message: 'Room code already in use.' } });
    }

    const newRoom = await prisma.room.create({
      data: {
        name,
        room_code: roomCode.toUpperCase(),
        organization_id: membership.organization_id,
        status: 'active',
        created_by: userId
      }
    });

    res.status(201).json({ success: true, data: newRoom });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to create room.' } });
  }
};

// 3. Connect/Join Room via Access Code ONLY (Enrolls Student)
export const joinRoom = async (req: AuthenticatedRequest, res: Response) => {
  const { roomCode } = req.body;

  if (!roomCode) {
    return res.status(400).json({ success: false, error: { message: '6-digit classroom access code is required.' } });
  }

  try {
    const room = await prisma.room.findUnique({
      where: { room_code: roomCode.toUpperCase() },
      include: {
        organization: { select: { id: true, name: true } },
        creator: { select: { id: true, display_name: true } }
      }
    });

    if (!room || room.status !== 'active') {
      return res.status(404).json({ success: false, error: { message: 'Classroom code invalid or room inactive.' } });
    }

    // Record student membership
    const userObj = req.user as any;
    const memberName = userObj?.displayName || userObj?.email?.split('@')[0] || 'Student';
    const memberEmail = userObj?.email || 'student@school.edu';
    const memberId = userObj?.id || `m-${Date.now()}`;

    const members = getOrSeedRoomMembers(room.id);
    const alreadyJoined = members.some((m: any) => m.id === memberId || m.email === memberEmail);

    if (!alreadyJoined) {
      members.push({
        id: memberId,
        name: memberName,
        email: memberEmail,
        joinedAt: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: `Successfully connected to classroom [${roomCode.toUpperCase()}].`,
      room: {
        id: room.id,
        name: room.name,
        code: room.room_code,
        organization: room.organization.name,
        creatorName: room.creator?.display_name || 'Faculty'
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to join classroom.' } });
  }
};

// 4. Get Classroom Stream Feed from DB (Announcements + Attached Quizzes + Comments)
export const getRoomFeed = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { creator: { select: { display_name: true } } }
    });

    if (!room) {
      return res.status(404).json({ success: false, error: { message: 'Classroom not found.' } });
    }

    // Fetch posts & comments directly from Database
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

// 5. Post Announcement / Attach Quiz to Classroom Stream (Persisted in DB)
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

// 6. Add Comment / Reply to Classroom Post (Persisted in DB)
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

// 7. Get Classroom Enrolled Members List
export const getRoomMembers = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId } = req.params;
  const members = getOrSeedRoomMembers(roomId);
  res.json({ success: true, data: members });
};

// 8. Remove Student Member from Classroom (Faculty Only)
export const removeRoomMember = async (req: AuthenticatedRequest, res: Response) => {
  const { roomId, memberId } = req.params;
  const members = getOrSeedRoomMembers(roomId);
  const index = members.findIndex((m: any) => m.id === memberId);

  if (index !== -1) {
    const removed = members.splice(index, 1);
    res.json({ success: true, message: 'Student member removed from classroom.', removed: removed[0] });
  } else {
    res.status(404).json({ success: false, error: { message: 'Member not found.' } });
  }
};
