import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
import { AuthenticatedRequest } from '../../middleware/auth.js';

// 1. List All Members Scoped to the Org Admin's Tenant
export const listOrgMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgAdminUserId = req.user!.id;

    // Retrieve organization owned by this org admin
    const org = await prisma.organization.findFirst({
      where: { owner_user_id: orgAdminUserId }
    });

    if (!org) {
      return res.status(404).json({ success: false, error: { message: 'Organization not found for this administrator.' } });
    }

    // Query members
    const members = await prisma.organizationMember.findMany({
      where: { organization_id: org.id },
      include: {
        user: {
          select: { id: true, email: true, display_name: true, status: true, created_at: true }
        }
      },
      orderBy: { joined_at: 'desc' }
    });

    res.json({
      success: true,
      organization: { id: org.id, name: org.name },
      data: members.map(m => ({
        membership_id: m.id,
        status: m.status,
        joined_at: m.joined_at,
        id: m.user.id,
        email: m.user.email,
        display_name: m.user.display_name,
        user_status: m.user.status,
        created_at: m.user.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve organization members.' } });
  }
};

// 2. Change Member Status (Suspend / Reactivate)
export const updateMemberStatus = async (req: AuthenticatedRequest, res: Response) => {
  const { membershipId, status } = req.body;

  if (!membershipId || !status) {
    return res.status(400).json({ success: false, error: { message: 'Membership ID and status are required.' } });
  }

  try {
    const orgAdminUserId = req.user!.id;

    const org = await prisma.organization.findFirst({
      where: { owner_user_id: orgAdminUserId }
    });

    if (!org) {
      return res.status(404).json({ success: false, error: { message: 'Organization not found for this administrator.' } });
    }

    // Ensure member belongs to this administrator's organization
    const membership = await prisma.organizationMember.findFirst({
      where: { id: membershipId, organization_id: org.id }
    });

    if (!membership) {
      return res.status(404).json({ success: false, error: { message: 'Member not found in your organization.' } });
    }

    const updated = await prisma.organizationMember.update({
      where: { id: membershipId },
      data: { status }
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to update member status.' } });
  }
};

// 3. Remove Member from Organization (Enforce atomic member count decrement)
export const removeOrgMember = async (req: AuthenticatedRequest, res: Response) => {
  const { membershipId } = req.params;

  try {
    const orgAdminUserId = req.user!.id;

    const org = await prisma.organization.findFirst({
      where: { owner_user_id: orgAdminUserId }
    });

    if (!org) {
      return res.status(404).json({ success: false, error: { message: 'Organization not found for this administrator.' } });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { id: membershipId, organization_id: org.id }
    });

    if (!membership) {
      return res.status(404).json({ success: false, error: { message: 'Member not found in your organization.' } });
    }

    await prisma.$transaction(async (tx) => {
      // Delete membership row
      await tx.organizationMember.delete({
        where: { id: membershipId }
      });

      // Decrement count
      await tx.organization.update({
        where: { id: org.id },
        data: { member_count: { decrement: 1 } }
      });
    });

    res.json({ success: true, message: 'Member removed from organization successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Failed to remove member.' } });
  }
};

// 4. Add Member with Custom Role scoped to this Tenant
export const addOrgMember = async (req: AuthenticatedRequest, res: Response) => {
  const { email, displayName, roleName } = req.body;

  if (!email || !displayName || !roleName) {
    return res.status(400).json({ success: false, error: { message: 'Email, display name, and role are required.' } });
  }

  const allowedRoles = ['student', 'faculty'];
  if (!allowedRoles.includes(roleName)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid role assignment requested. Org Admins can only assign Student or Faculty roles.' } });
  }

  try {
    const orgAdminUserId = req.user!.id;

    const org = await prisma.organization.findFirst({
      where: { owner_user_id: orgAdminUserId }
    });

    if (!org) {
      return res.status(404).json({ success: false, error: { message: 'Organization not found for this administrator.' } });
    }

    // Check user uniqueness
    let targetUser = await prisma.user.findUnique({
      where: { email_lower: email.toLowerCase() }
    });

    // Lookup role UUID from database
    const dbRole = await prisma.role.findFirst({
      where: { name: roleName }
    });

    if (!dbRole) {
      return res.status(404).json({ success: false, error: { message: `Role "${roleName}" not found in database.` } });
    }

    if (targetUser) {
      const existingMember = await prisma.organizationMember.findFirst({
        where: { organization_id: org.id, user_id: targetUser.id }
      });

      if (existingMember) {
        return res.status(409).json({ success: false, error: { message: 'User is already a member of this organization.' } });
      }

      // Add to organization members
      await prisma.organizationMember.create({
        data: {
          organization_id: org.id,
          user_id: targetUser.id,
          status: 'active'
        }
      });

      // Map organization-scoped role inside UserRole
      await prisma.userRole.create({
        data: {
          user_id: targetUser.id,
          role_id: dbRole.id,
          organization_id: org.id
        }
      });

    } else {
      // Create user with standard defaults
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      targetUser = await prisma.user.create({
        data: {
          email,
          email_lower: email.toLowerCase(),
          password_hash: passwordHash,
          display_name: displayName,
          status: 'active',
          is_verified: true,
          has_password: true,
          profile: { create: {} },
          gamification: { create: {} },
          streak: { create: {} },
          organization_memberships: {
            create: {
              organization_id: org.id,
              status: 'active'
            }
          },
          user_roles: {
            create: {
              role_id: dbRole.id,
              organization_id: org.id
            }
          }
        }
      });
    }

    // Increment member count in organization
    await prisma.organization.update({
      where: { id: org.id },
      data: { member_count: { increment: 1 } }
    });

    res.status(201).json({ success: true, data: { email: targetUser.email, displayName: targetUser.display_name, role: roleName } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { message: error.message || 'Failed to add member.' } });
  }
};
