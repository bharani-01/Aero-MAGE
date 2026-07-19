import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database.js';
// 1. List All System Organizations
export const listOrganizations = async (req, res) => {
    try {
        const orgs = await prisma.organization.findMany({
            include: {
                owner: {
                    select: { id: true, email: true, display_name: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
        res.json({ success: true, data: orgs });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve organizations.' } });
    }
};
// 2. Create a New Organization & Assign Org Admin Owner
export const createOrganization = async (req, res) => {
    const { name, slug, description, ownerEmail } = req.body;
    if (!name || !slug || !ownerEmail) {
        return res.status(400).json({ success: false, error: { message: 'Name, slug, and owner email are required.' } });
    }
    try {
        // Check if slug is unique
        const existingOrg = await prisma.organization.findUnique({
            where: { slug }
        });
        if (existingOrg) {
            return res.status(409).json({ success: false, error: { message: 'Organization slug must be unique.' } });
        }
        // Find or create Owner User
        let ownerUser = await prisma.user.findUnique({
            where: { email_lower: ownerEmail.toLowerCase() }
        });
        if (!ownerUser) {
            // Create user with org_admin role
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash('Password123!', salt);
            ownerUser = await prisma.user.create({
                data: {
                    email: ownerEmail,
                    email_lower: ownerEmail.toLowerCase(),
                    password_hash: passwordHash,
                    display_name: `${name} Admin`,
                    status: 'active',
                    is_verified: true,
                    has_password: true,
                    user_roles: {
                        create: {
                            role_id: '77777777-7777-7777-7777-777777777777' // Organization Admin role
                        }
                    },
                    profile: { create: {} },
                    gamification: { create: {} },
                    streak: { create: {} }
                }
            });
        }
        else {
            // User exists, assign organization_admin role if not already assigned
            const hasRole = await prisma.userRole.findFirst({
                where: {
                    user_id: ownerUser.id,
                    role_id: '77777777-7777-7777-7777-777777777777'
                }
            });
            if (!hasRole) {
                await prisma.userRole.create({
                    data: {
                        user_id: ownerUser.id,
                        role_id: '77777777-7777-7777-7777-777777777777'
                    }
                });
            }
        }
        // Create the organization and bind owner as first member
        const newOrg = await prisma.organization.create({
            data: {
                name,
                name_lower: name.toLowerCase(),
                slug,
                description,
                owner_user_id: ownerUser.id,
                created_by: req.user.id,
                members: {
                    create: {
                        user_id: ownerUser.id,
                        status: 'active'
                    }
                }
            }
        });
        res.status(201).json({ success: true, data: newOrg });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: error.message || 'Failed to create organization.' } });
    }
};
// 3. List All Org Admins
export const listOrgAdmins = async (req, res) => {
    try {
        const admins = await prisma.userRole.findMany({
            where: { role_id: '77777777-7777-7777-7777-777777777777' },
            include: {
                user: {
                    select: { id: true, email: true, display_name: true, status: true, created_at: true }
                }
            }
        });
        // Map to remove duplicates if an admin is assigned to multiple scopes
        const uniqueAdmins = Array.from(new Map(admins.map(item => [item.user.id, item.user])).values());
        res.json({ success: true, data: uniqueAdmins });
    }
    catch (error) {
        res.status(500).json({ success: false, error: { message: 'Failed to retrieve organization administrators.' } });
    }
};
