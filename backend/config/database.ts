import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient({
  log: ['info', 'warn', 'error'],
});

async function seedRole(id: string, name: string, display_name: string, description: string, hierarchy_level: number, is_default = false) {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) {
    await prisma.role.create({
      data: {
        id,
        name,
        display_name,
        description,
        scope: 'system',
        is_system: true,
        is_default,
        hierarchy_level
      }
    });
  }
}

async function seedPermission(name: string, display_name: string, resource: string, action: string) {
  let perm = await prisma.permission.findUnique({ where: { name } });
  if (!perm) {
    perm = await prisma.permission.create({
      data: {
        name,
        display_name,
        resource,
        action
      }
    });
  }
  return perm;
}

async function linkPermission(roleId: string, permissionName: string) {
  const perm = await prisma.permission.findUnique({ where: { name: permissionName } });
  if (perm) {
    const existingLink = await prisma.rolePermission.findFirst({
      where: { role_id: roleId, permission_id: perm.id }
    });
    if (!existingLink) {
      await prisma.rolePermission.create({
        data: {
          role_id: roleId,
          permission_id: perm.id
        }
      });
    }
  }
}

async function seedDefaultRolesAndUser() {
  try {
    // 1. Seed Roles
    await seedRole('11111111-1111-1111-1111-111111111111', 'guest', 'Guest', 'Temporary session-only access', 0);
    await seedRole('22222222-2222-2222-2222-222222222222', 'user', 'User', 'Default registered user', 10, true);
    await seedRole('33333333-3333-3333-3333-333333333333', 'faculty', 'Faculty', 'Organization quiz creator & room host', 30);
    await seedRole('44444444-4444-4444-4444-444444444444', 'student', 'Student', 'Organization participant', 10);
    await seedRole('77777777-7777-7777-7777-777777777777', 'organization_admin', 'Organization Admin', 'Organization administrator control', 70);
    await seedRole('88888888-8888-8888-8888-888888888888', 'it_admin', 'IT Admin', 'IT integration controller', 60);
    await seedRole('99999999-9999-9999-9999-999999999999', 'super_admin', 'Super Admin', 'Full system control', 100);
    
    console.log('🌱 System roles verified and seeded.');

    // 2. Seed Permissions
    await seedPermission('config:manage', 'Manage System Config', 'config', 'manage');
    await seedPermission('audit:view', 'View Audit Logs', 'audit', 'view');
    await seedPermission('organization:create', 'Create Organization', 'organization', 'create');
    
    await seedPermission('role:assign', 'Assign Role to User', 'role', 'assign');
    await seedPermission('organization:read', 'View Organization', 'organization', 'read');
    await seedPermission('organization:update', 'Update Organization', 'organization', 'update');
    await seedPermission('organization:configure', 'Configure Organization', 'organization', 'configure');
    
    await seedPermission('member:view', 'View Members', 'member', 'view');
    await seedPermission('member:approve', 'Approve Join Requests', 'member', 'approve');
    await seedPermission('member:remove', 'Remove Members', 'member', 'remove');
    await seedPermission('member:invite', 'Invite Members', 'member', 'invite');
    await seedPermission('audit:view_org', 'View Org Audit Logs', 'audit', 'view_org');
    
    await seedPermission('room:create', 'Create Live Session', 'room', 'create');
    await seedPermission('room:start', 'Start Live Session', 'room', 'start');
    await seedPermission('room:end', 'End Live Session', 'room', 'end');
    await seedPermission('room:pause', 'Pause Live Session', 'room', 'pause');
    
    await seedPermission('quiz:create', 'Create Quiz', 'quiz', 'create');
    await seedPermission('quiz:read', 'View Quiz', 'quiz', 'read');
    await seedPermission('quiz:update', 'Update Quiz', 'quiz', 'update');
    await seedPermission('quiz:delete', 'Delete Quiz', 'quiz', 'delete');
    await seedPermission('quiz:publish', 'Publish Quiz', 'quiz', 'publish');
    await seedPermission('question:create', 'Create Question', 'question', 'create');
    await seedPermission('question:update', 'Update Question', 'question', 'update');
    await seedPermission('question:delete', 'Delete Question', 'question', 'delete');

    console.log('🌱 Core permissions verified and seeded.');

    // 3. Link Role Permissions (RBAC Matrix)
    // Student Mappings
    await linkPermission('44444444-4444-4444-4444-444444444444', 'quiz:read');

    // Faculty Mappings
    await linkPermission('33333333-3333-3333-3333-333333333333', 'room:create');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'room:start');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'room:end');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'room:pause');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'quiz:create');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'quiz:read');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'quiz:update');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'quiz:delete');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'quiz:publish');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'question:create');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'question:update');
    await linkPermission('33333333-3333-3333-3333-333333333333', 'question:delete');

    // Regular User Mappings
    await linkPermission('22222222-2222-2222-2222-222222222222', 'room:create');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'room:start');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'room:end');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'room:pause');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'quiz:create');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'quiz:read');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'quiz:update');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'quiz:delete');
    await linkPermission('22222222-2222-2222-2222-222222222222', 'quiz:publish');

    // IT Admin Mappings
    await linkPermission('88888888-8888-8888-8888-888888888888', 'organization:read');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'organization:update');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'organization:configure');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'member:view');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'member:approve');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'member:remove');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'member:invite');
    await linkPermission('88888888-8888-8888-8888-888888888888', 'audit:view_org');

    // Org Admin Mappings
    await linkPermission('77777777-7777-7777-7777-777777777777', 'room:create');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'room:start');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'room:end');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'room:pause');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'quiz:create');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'quiz:read');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'quiz:update');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'quiz:delete');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'role:assign');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'organization:read');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'organization:update');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'organization:configure');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'member:view');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'member:approve');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'member:remove');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'member:invite');
    await linkPermission('77777777-7777-7777-7777-777777777777', 'audit:view_org');

    console.log('🌱 RBAC role permission links completed.');

    // 4. Seed Default Admin User
    let defaultAdmin = await prisma.user.findUnique({
      where: { email_lower: 'admin@aeromage.com' }
    });

    if (!defaultAdmin) {
      console.log('🌱 Seeding default test administrator (admin@aeromage.com)...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      defaultAdmin = await prisma.user.create({
        data: {
          email: 'admin@aeromage.com',
          email_lower: 'admin@aeromage.com',
          password_hash: passwordHash,
          display_name: 'Aero Admin',
          status: 'active',
          is_verified: true,
          has_password: true,
          user_roles: {
            create: {
              role_id: '99999999-9999-9999-9999-999999999999' // Super Admin Role
            }
          },
          profile: { create: {} },
          gamification: { create: {} },
          streak: { create: {} }
        }
      });
      console.log('🌱 Default test administrator seeded.');
    }

    // 5. Seed Default Organization
    let defaultOrg = await prisma.organization.findUnique({
      where: { slug: 'aeromage-community' }
    });

    if (!defaultOrg && defaultAdmin) {
      console.log('🌱 Seeding default Aero MAGE Community Organization...');
      defaultOrg = await prisma.organization.create({
        data: {
          name: 'Aero MAGE Community',
          name_lower: 'aero mage community',
          slug: 'aeromage-community',
          description: 'The default public organization for all Aero MAGE users.',
          owner_user_id: defaultAdmin.id,
          created_by: defaultAdmin.id,
          members: {
            create: {
              user_id: defaultAdmin.id,
              status: 'active'
            }
          }
        }
      });
      console.log('🌱 Default Organization seeded.');
    }

    // 6. Seed Default Org Admin User and Org
    let defaultOrgAdmin = await prisma.user.findUnique({
      where: { email_lower: 'org@aeromage.com' }
    });

    if (!defaultOrgAdmin) {
      console.log('🌱 Seeding default test Org Admin (org@aeromage.com)...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      defaultOrgAdmin = await prisma.user.create({
        data: {
          email: 'org@aeromage.com',
          email_lower: 'org@aeromage.com',
          password_hash: passwordHash,
          display_name: 'Workspace Admin',
          status: 'active',
          is_verified: true,
          has_password: true,
          user_roles: {
            create: {
              role_id: '77777777-7777-7777-7777-777777777777' // Org Admin Role
            }
          },
          profile: { create: {} },
          gamification: { create: {} },
          streak: { create: {} }
        }
      });

      // Create an Org Workspace for this Org Admin
      await prisma.organization.create({
        data: {
          name: 'Acme Learning Academy',
          name_lower: 'acme learning academy',
          slug: 'acme-learning',
          description: 'Custom corporate training workspace.',
          owner_user_id: defaultOrgAdmin.id,
          created_by: defaultOrgAdmin.id,
          members: {
            create: {
              user_id: defaultOrgAdmin.id,
              status: 'active'
            }
          }
        }
      });
      console.log('🌱 Default Org Admin and custom organization seeded.');
    }

    // 7. Seed Default IT Admin User
    let defaultITAdmin = await prisma.user.findUnique({
      where: { email_lower: 'it@aeromage.com' }
    });

    if (!defaultITAdmin) {
      console.log('🌱 Seeding default test IT Admin (it@aeromage.com)...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      await prisma.user.create({
        data: {
          email: 'it@aeromage.com',
          email_lower: 'it@aeromage.com',
          password_hash: passwordHash,
          display_name: 'Aero IT Engineer',
          status: 'active',
          is_verified: true,
          has_password: true,
          user_roles: {
            create: {
              role_id: '88888888-8888-8888-8888-888888888888' // IT Admin Role
            }
          },
          profile: { create: {} },
          gamification: { create: {} },
          streak: { create: {} }
        }
      });
      console.log('🌱 Default IT Admin user seeded.');
    }

    // 8. Seed Default Faculty User (Google Classroom-style creator)
    let defaultFaculty = await prisma.user.findUnique({
      where: { email_lower: 'faculty@aeromage.com' }
    });

    if (!defaultFaculty && defaultOrg) {
      console.log('🌱 Seeding default test Faculty (faculty@aeromage.com)...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      defaultFaculty = await prisma.user.create({
        data: {
          email: 'faculty@aeromage.com',
          email_lower: 'faculty@aeromage.com',
          password_hash: passwordHash,
          display_name: 'Professor Albert',
          status: 'active',
          is_verified: true,
          has_password: true,
          user_roles: {
            create: {
              role_id: '33333333-3333-3333-3333-333333333333' // Faculty Role
            }
          },
          profile: { create: {} },
          gamification: { create: {} },
          streak: { create: {} },
          organization_memberships: {
            create: {
              organization_id: defaultOrg.id,
              status: 'active'
            }
          }
        }
      });

      // Increment member count in organization
      await prisma.organization.update({
        where: { id: defaultOrg.id },
        data: { member_count: { increment: 1 } }
      });

      // Seed a default live playroom room created by this faculty
      await prisma.room.create({
        data: {
          name: 'Physics 101 Playroom Lobbies',
          room_code: 'PHYS99',
          organization_id: defaultOrg.id,
          status: 'active',
          created_by: defaultFaculty.id
        }
      });

      // Seed rich list of quizzes with interactive questions
      await prisma.quiz.create({
        data: {
          title: 'Quantum Mechanics & The Multiverse Theory',
          description: 'Explore the fundamental principles of quantum states, wave-particle duality, and parallel universes.',
          visibility: 'organization',
          difficulty: 'hard',
          status: 'published',
          question_count: 2,
          total_points: 30,
          created_by: defaultFaculty.id,
          organization_id: defaultOrg.id,
          questions: {
            create: [
              {
                question_text: 'Which principle states that position and momentum cannot be measured simultaneously with precision?',
                question_type: 'multiple_choice',
                points: 20,
                time_limit: 30,
                options_json: JSON.stringify(['Heisenberg Uncertainty Principle', 'Pauli Exclusion Principle', 'Schrödinger Equation', 'Planck Constant']),
                correct_answer: 'Heisenberg Uncertainty Principle'
              },
              {
                question_text: 'Light exhibits both wave-like and particle-like properties.',
                question_type: 'true_false',
                points: 10,
                time_limit: 15,
                options_json: JSON.stringify(['True', 'False']),
                correct_answer: 'True'
              }
            ]
          }
        }
      });

      await prisma.quiz.create({
        data: {
          title: 'General Relativity & Black Holes',
          description: 'A study of space-time curvature, gravity wells, event horizons, and Einstein field equations.',
          visibility: 'public',
          difficulty: 'expert',
          status: 'published',
          question_count: 2,
          total_points: 30,
          created_by: defaultFaculty.id,
          organization_id: defaultOrg.id,
          questions: {
            create: [
              {
                question_text: 'What is the boundary surrounding a black hole beyond which nothing can escape?',
                question_type: 'multiple_choice',
                points: 20,
                time_limit: 30,
                options_json: JSON.stringify(['Event Horizon', 'Singularity', 'Photon Sphere', 'Accretion Disk']),
                correct_answer: 'Event Horizon'
              },
              {
                question_text: 'Gravity according to General Relativity is a force rather than geometric curvature.',
                question_type: 'true_false',
                points: 10,
                time_limit: 15,
                options_json: JSON.stringify(['True', 'False']),
                correct_answer: 'False'
              }
            ]
          }
        }
      });

      await prisma.quiz.create({
        data: {
          title: 'World History & Strategic Battles',
          description: 'Test your knowledge on major historical events, ancient empires, and pivotal 20th-century conflicts.',
          visibility: 'public',
          difficulty: 'medium',
          status: 'published',
          question_count: 3,
          total_points: 40,
          created_by: defaultFaculty.id,
          organization_id: defaultOrg.id,
          questions: {
            create: [
              {
                question_text: 'In which year did World War II officially conclude?',
                question_type: 'multiple_choice',
                points: 10,
                time_limit: 30,
                options_json: JSON.stringify(['1943', '1945', '1948', '1950']),
                correct_answer: '1945'
              },
              {
                question_text: 'The Battle of Hastings in 1066 took place in which country?',
                question_type: 'multiple_choice',
                points: 20,
                time_limit: 30,
                options_json: JSON.stringify(['France', 'England', 'Germany', 'Spain']),
                correct_answer: 'England'
              },
              {
                question_text: 'Julius Caesar was the first officially crowned Emperor of the Roman Empire.',
                question_type: 'true_false',
                points: 10,
                time_limit: 15,
                options_json: JSON.stringify(['True', 'False']),
                correct_answer: 'False'
              }
            ]
          }
        }
      });

      await prisma.quiz.create({
        data: {
          title: 'Computer Science & Data Structures',
          description: 'Master time complexities, hash tables, trees, graphs, and memory management concepts.',
          visibility: 'organization',
          difficulty: 'hard',
          status: 'published',
          question_count: 3,
          total_points: 50,
          created_by: defaultFaculty.id,
          organization_id: defaultOrg.id,
          questions: {
            create: [
              {
                question_text: 'What is the average time complexity of key lookup in a Hash Table?',
                question_type: 'multiple_choice',
                points: 20,
                time_limit: 30,
                options_json: JSON.stringify(['O(n)', 'O(log n)', 'O(1)', 'O(n^2)']),
                correct_answer: 'O(1)'
              },
              {
                question_text: 'Which data structure operates on a Last-In, First-Out (LIFO) order?',
                question_type: 'multiple_choice',
                points: 20,
                time_limit: 30,
                options_json: JSON.stringify(['Queue', 'Stack', 'Linked List', 'Heap']),
                correct_answer: 'Stack'
              },
              {
                question_text: 'A binary tree can have at most 2 child nodes per parent.',
                question_type: 'true_false',
                points: 10,
                time_limit: 15,
                options_json: JSON.stringify(['True', 'False']),
                correct_answer: 'True'
              }
            ]
          }
        }
      });

      await prisma.quiz.create({
        data: {
          title: 'Astronomy & Cosmic Wonders',
          description: 'Discover planets, solar systems, nebulae, and space exploration achievements.',
          visibility: 'public',
          difficulty: 'easy',
          status: 'published',
          question_count: 2,
          total_points: 20,
          created_by: defaultFaculty.id,
          organization_id: defaultOrg.id,
          questions: {
            create: [
              {
                question_text: 'Which planet is popularly known as the Red Planet?',
                question_type: 'multiple_choice',
                points: 10,
                time_limit: 30,
                options_json: JSON.stringify(['Venus', 'Mars', 'Jupiter', 'Saturn']),
                correct_answer: 'Mars'
              },
              {
                question_text: 'The Sun is a yellow dwarf star at the center of our Solar System.',
                question_type: 'true_false',
                points: 10,
                time_limit: 15,
                options_json: JSON.stringify(['True', 'False']),
                correct_answer: 'True'
              }
            ]
          }
        }
      });

      await prisma.quiz.create({
        data: {
          title: 'Full-Stack Web Development Essentials',
          description: 'Test your understanding of modern Web APIs, JavaScript runtime, CSS layout models, and RESTful architectures.',
          visibility: 'public',
          difficulty: 'medium',
          status: 'published',
          question_count: 2,
          total_points: 30,
          created_by: defaultFaculty.id,
          organization_id: defaultOrg.id,
          questions: {
            create: [
              {
                question_text: 'What does HTML stand for in web standards?',
                question_type: 'multiple_choice',
                points: 20,
                time_limit: 30,
                options_json: JSON.stringify(['HyperText Markup Language', 'HighTech Machine Language', 'Hyperlink Text Management', 'Home Tool Markup Language']),
                correct_answer: 'HyperText Markup Language'
              },
              {
                question_text: 'JavaScript is a dynamically typed programming language.',
                question_type: 'true_false',
                points: 10,
                time_limit: 15,
                options_json: JSON.stringify(['True', 'False']),
                correct_answer: 'True'
              }
            ]
          }
        }
      });

      console.log('🌱 Default Faculty user, default room, and 6 rich quizzes with questions seeded.');
    }

    // 9. Seed Default Student User in community
    let defaultStudent = await prisma.user.findUnique({
      where: { email_lower: 'student@aeromage.com' }
    });

    if (!defaultStudent && defaultOrg) {
      console.log('🌱 Seeding default test Student (student@aeromage.com)...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Password123!', salt);

      await prisma.user.create({
        data: {
          email: 'student@aeromage.com',
          email_lower: 'student@aeromage.com',
          password_hash: passwordHash,
          display_name: 'Aero Student',
          status: 'active',
          is_verified: true,
          has_password: true,
          user_roles: {
            create: {
              role_id: '44444444-4444-4444-4444-444444444444' // Student/User Role
            }
          },
          profile: { create: {} },
          gamification: { create: {} },
          streak: { create: {} },
          organization_memberships: {
            create: {
              organization_id: defaultOrg.id,
              status: 'active'
            }
          }
        }
      });

      // Increment member count in organization
      await prisma.organization.update({
        where: { id: defaultOrg.id },
        data: { member_count: { increment: 1 } }
      });

      console.log('🌱 Default Student user seeded.');
    }

    // 10. Auto-Populate Quiz List if fewer than 6 exist
    const currentQuizCount = await prisma.quiz.count();
    if (currentQuizCount < 6) {
      const facultyUser = await prisma.user.findFirst({
        where: { email_lower: 'faculty@aeromage.com' }
      });
      const communityOrg = await prisma.organization.findFirst({
        where: { slug: 'aeromage-community' }
      });

      if (facultyUser && communityOrg) {
        console.log('🌱 Populating complete library of 6 rich quizzes with questions...');

        // Clear any old incomplete quizzes
        await prisma.quiz.deleteMany({});

        await prisma.quiz.create({
          data: {
            title: 'Quantum Mechanics & The Multiverse Theory',
            description: 'Explore the fundamental principles of quantum states, wave-particle duality, and parallel universes.',
            visibility: 'organization',
            difficulty: 'hard',
            status: 'published',
            question_count: 2,
            total_points: 30,
            created_by: facultyUser.id,
            organization_id: communityOrg.id,
            questions: {
              create: [
                {
                  question_text: 'Which principle states that position and momentum cannot be measured simultaneously with precision?',
                  question_type: 'multiple_choice',
                  points: 20,
                  time_limit: 30,
                  options_json: JSON.stringify(['Heisenberg Uncertainty Principle', 'Pauli Exclusion Principle', 'Schrödinger Equation', 'Planck Constant']),
                  correct_answer: 'Heisenberg Uncertainty Principle'
                },
                {
                  question_text: 'Light exhibits both wave-like and particle-like properties.',
                  question_type: 'true_false',
                  points: 10,
                  time_limit: 15,
                  options_json: JSON.stringify(['True', 'False']),
                  correct_answer: 'True'
                }
              ]
            }
          }
        });

        await prisma.quiz.create({
          data: {
            title: 'General Relativity & Black Holes',
            description: 'A study of space-time curvature, gravity wells, event horizons, and Einstein field equations.',
            visibility: 'public',
            difficulty: 'expert',
            status: 'published',
            question_count: 2,
            total_points: 30,
            created_by: facultyUser.id,
            organization_id: communityOrg.id,
            questions: {
              create: [
                {
                  question_text: 'What is the boundary surrounding a black hole beyond which nothing can escape?',
                  question_type: 'multiple_choice',
                  points: 20,
                  time_limit: 30,
                  options_json: JSON.stringify(['Event Horizon', 'Singularity', 'Photon Sphere', 'Accretion Disk']),
                  correct_answer: 'Event Horizon'
                },
                {
                  question_text: 'Gravity according to General Relativity is a force rather than geometric curvature.',
                  question_type: 'true_false',
                  points: 10,
                  time_limit: 15,
                  options_json: JSON.stringify(['True', 'False']),
                  correct_answer: 'False'
                }
              ]
            }
          }
        });

        await prisma.quiz.create({
          data: {
            title: 'World History & Strategic Battles',
            description: 'Test your knowledge on major historical events, ancient empires, and pivotal 20th-century conflicts.',
            visibility: 'public',
            difficulty: 'medium',
            status: 'published',
            question_count: 3,
            total_points: 40,
            created_by: facultyUser.id,
            organization_id: communityOrg.id,
            questions: {
              create: [
                {
                  question_text: 'In which year did World War II officially conclude?',
                  question_type: 'multiple_choice',
                  points: 10,
                  time_limit: 30,
                  options_json: JSON.stringify(['1943', '1945', '1948', '1950']),
                  correct_answer: '1945'
                },
                {
                  question_text: 'The Battle of Hastings in 1066 took place in which country?',
                  question_type: 'multiple_choice',
                  points: 20,
                  time_limit: 30,
                  options_json: JSON.stringify(['France', 'England', 'Germany', 'Spain']),
                  correct_answer: 'England'
                },
                {
                  question_text: 'Julius Caesar was the first officially crowned Emperor of the Roman Empire.',
                  question_type: 'true_false',
                  points: 10,
                  time_limit: 15,
                  options_json: JSON.stringify(['True', 'False']),
                  correct_answer: 'False'
                }
              ]
            }
          }
        });

        await prisma.quiz.create({
          data: {
            title: 'Computer Science & Data Structures',
            description: 'Master time complexities, hash tables, trees, graphs, and memory management concepts.',
            visibility: 'organization',
            difficulty: 'hard',
            status: 'published',
            question_count: 3,
            total_points: 50,
            created_by: facultyUser.id,
            organization_id: communityOrg.id,
            questions: {
              create: [
                {
                  question_text: 'What is the average time complexity of key lookup in a Hash Table?',
                  question_type: 'multiple_choice',
                  points: 20,
                  time_limit: 30,
                  options_json: JSON.stringify(['O(n)', 'O(log n)', 'O(1)', 'O(n^2)']),
                  correct_answer: 'O(1)'
                },
                {
                  question_text: 'Which data structure operates on a Last-In, First-Out (LIFO) order?',
                  question_type: 'multiple_choice',
                  points: 20,
                  time_limit: 30,
                  options_json: JSON.stringify(['Queue', 'Stack', 'Linked List', 'Heap']),
                  correct_answer: 'Stack'
                },
                {
                  question_text: 'A binary tree can have at most 2 child nodes per parent.',
                  question_type: 'true_false',
                  points: 10,
                  time_limit: 15,
                  options_json: JSON.stringify(['True', 'False']),
                  correct_answer: 'True'
                }
              ]
            }
          }
        });

        await prisma.quiz.create({
          data: {
            title: 'Astronomy & Cosmic Wonders',
            description: 'Discover planets, solar systems, nebulae, and space exploration achievements.',
            visibility: 'public',
            difficulty: 'easy',
            status: 'published',
            question_count: 2,
            total_points: 20,
            created_by: facultyUser.id,
            organization_id: communityOrg.id,
            questions: {
              create: [
                {
                  question_text: 'Which planet is popularly known as the Red Planet?',
                  question_type: 'multiple_choice',
                  points: 10,
                  time_limit: 30,
                  options_json: JSON.stringify(['Venus', 'Mars', 'Jupiter', 'Saturn']),
                  correct_answer: 'Mars'
                },
                {
                  question_text: 'The Sun is a yellow dwarf star at the center of our Solar System.',
                  question_type: 'true_false',
                  points: 10,
                  time_limit: 15,
                  options_json: JSON.stringify(['True', 'False']),
                  correct_answer: 'True'
                }
              ]
            }
          }
        });

        await prisma.quiz.create({
          data: {
            title: 'Full-Stack Web Development Essentials',
            description: 'Test your understanding of modern Web APIs, JavaScript runtime, CSS layout models, and RESTful architectures.',
            visibility: 'public',
            difficulty: 'medium',
            status: 'published',
            question_count: 2,
            total_points: 30,
            created_by: facultyUser.id,
            organization_id: communityOrg.id,
            questions: {
              create: [
                {
                  question_text: 'What does HTML stand for in web standards?',
                  question_type: 'multiple_choice',
                  points: 20,
                  time_limit: 30,
                  options_json: JSON.stringify(['HyperText Markup Language', 'HighTech Machine Language', 'Hyperlink Text Management', 'Home Tool Markup Language']),
                  correct_answer: 'HyperText Markup Language'
                },
                {
                  question_text: 'JavaScript is a dynamically typed programming language.',
                  question_type: 'true_false',
                  points: 10,
                  time_limit: 15,
                  options_json: JSON.stringify(['True', 'False']),
                  correct_answer: 'True'
                }
              ]
            }
          }
        });

        console.log('🌱 Complete library of 6 rich quizzes auto-seeded.');
      }
    }

  } catch (err) {
    console.error('❌ Failed to seed default data:', err);
  }
}

prisma.$connect()
  .then(async () => {
    console.log('🔌 Prisma ORM connected to PostgreSQL database successfully.');
    await seedDefaultRolesAndUser();
  })
  .catch((err) => {
    console.error('❌ Prisma ORM connection failure:', err);
  });
