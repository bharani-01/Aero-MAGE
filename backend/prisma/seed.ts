import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Aero MAGE Production Seeder...');
  const startTime = Date.now();

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // 1. Ensure Roles Exist
  console.log('📦 Creating Roles...');
  const roleDefs = [
    { name: 'super_admin', display: 'Super Admin' },
    { name: 'organization_admin', display: 'Organization Admin' },
    { name: 'it_admin', display: 'IT Admin' },
    { name: 'faculty', display: 'Faculty' },
    { name: 'student', display: 'Student' }
  ];
  const roleMap: Record<string, string> = {};

  for (const r of roleDefs) {
    let role = await prisma.role.findFirst({ where: { name: r.name } });
    if (!role) {
      role = await prisma.role.create({
        data: {
          name: r.name,
          display_name: r.display,
          description: `${r.display} Role`,
          is_system: true
        }
      });
    }
    roleMap[r.name] = role.id;
  }

  // 2. Create Core Demo Accounts First
  console.log('👤 Creating Core Demo Accounts...');
  const demoAccounts = [
    { email: 'admin@school.com', name: 'Dr. Arthur Pendelton (Super Admin)', role: 'super_admin' },
    { email: 'faculty@school.com', name: 'Prof. Marcus Vance (Head of Faculty)', role: 'faculty' },
    { email: 'student@school.com', name: 'Aero Student (Lead Learner)', role: 'student' },
    { email: 'orgadmin@school.com', name: 'Elena Rostova (Org Admin)', role: 'organization_admin' },
    { email: 'itadmin@school.com', name: 'David Miller (IT Admin)', role: 'it_admin' }
  ];

  const demoUserMap: Record<string, string> = {};
  for (const d of demoAccounts) {
    let user = await prisma.user.findUnique({ where: { email_lower: d.email.toLowerCase() } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: d.email,
          email_lower: d.email.toLowerCase(),
          password_hash: passwordHash,
          display_name: d.name,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name)}`,
          status: 'active',
          is_verified: true,
          has_password: true
        }
      });
    }
    demoUserMap[d.role] = user.id;

    const existingUserRole = await prisma.userRole.findFirst({
      where: { user_id: user.id, role_id: roleMap[d.role] }
    });
    if (!existingUserRole) {
      await prisma.userRole.create({
        data: { user_id: user.id, role_id: roleMap[d.role] }
      });
    }
  }

  const superAdminId = demoUserMap['super_admin'];
  const facultyUser = await prisma.user.findUnique({ where: { email_lower: 'faculty@school.com' } });
  const studentUser = await prisma.user.findUnique({ where: { email_lower: 'student@school.com' } });

  // 3. Create Organizations (12 Top Tier Institutes)
  console.log('🏛️ Creating 12 Higher Ed Organizations...');
  const orgConfigs = [
    { name: 'MIT School of Engineering & Computing', code: 'MIT', slug: 'mit-tech', domain: 'mit.edu' },
    { name: 'Stanford AI & Autonomous Systems Institute', code: 'STANFORD', slug: 'stanford-ai', domain: 'stanford.edu' },
    { name: 'Harvard Biotechnology & Medical Academy', code: 'HARVARD', slug: 'harvard-biotech', domain: 'harvard.edu' },
    { name: 'Caltech Aerospace & Flight Dynamics Lab', code: 'CALTECH', slug: 'caltech-aero', domain: 'caltech.edu' },
    { name: 'Oxford Quantum Computing Research Center', code: 'OXFORD', slug: 'oxford-quantum', domain: 'oxford.ac.uk' },
    { name: 'Cambridge Cyber Security & Software Systems', code: 'CAMBRIDGE', slug: 'cambridge-cyber', domain: 'cam.ac.uk' },
    { name: 'ETH Zurich Robotics & Mechatronics Center', code: 'ETHZ', slug: 'eth-robotics', domain: 'ethz.ch' },
    { name: 'Imperial College London Data Science Lab', code: 'IMPERIAL', slug: 'imperial-data', domain: 'imperial.ac.uk' },
    { name: 'UC Berkeley Full-Stack & Systems Engineering', code: 'UCB', slug: 'ucb-systems', domain: 'berkeley.edu' },
    { name: 'Carnegie Mellon Distributed Systems Hub', code: 'CMU', slug: 'cmu-systems', domain: 'cmu.edu' },
    { name: 'National University of Singapore Digital Learning', code: 'NUS', slug: 'nus-digital', domain: 'nus.edu.sg' },
    { name: 'Sydney Cyber Systems & Network Security Institute', code: 'SYDNEY', slug: 'sydney-cyber', domain: 'sydney.edu.au' }
  ];

  const orgIds: string[] = [];
  for (const config of orgConfigs) {
    let org = await prisma.organization.findUnique({ where: { slug: config.slug } });
    if (!org) {
      org = await prisma.organization.create({
        data: {
          name: config.name,
          name_lower: config.name.toLowerCase(),
          slug: config.slug,
          description: `Premier research institute specializing in ${config.name}.`,
          status: 'active',
          owner_user_id: superAdminId,
          created_by: superAdminId
        }
      });
    }
    orgIds.push(org.id);
  }

  const primaryOrgId = orgIds[0];

  // Link demo users to primary org
  for (const roleKey of Object.keys(demoUserMap)) {
    const uId = demoUserMap[roleKey];
    const existingOrgMember = await prisma.organizationMember.findFirst({
      where: { organization_id: primaryOrgId, user_id: uId }
    });
    if (!existingOrgMember) {
      await prisma.organizationMember.create({
        data: { organization_id: primaryOrgId, user_id: uId, status: 'active' }
      });
    }
  }

  // 3.5 Create Explicit Demo Users for EACH Organization (faculty@domain, student@domain, admin@domain)
  console.log('🔑 Creating Explicit Demo Logins for ALL 12 Organizations...');
  for (let oIdx = 0; oIdx < orgConfigs.length; oIdx++) {
    const orgId = orgIds[oIdx];
    const domain = orgConfigs[oIdx].domain;
    const orgName = orgConfigs[oIdx].name;

    const perOrgDemoAccounts = [
      { email: `faculty@${domain}`, name: `Prof. Lead (${orgConfigs[oIdx].code || domain.split('.')[0].toUpperCase()})`, role: 'faculty' },
      { email: `student@${domain}`, name: `Student (${orgConfigs[oIdx].code || domain.split('.')[0].toUpperCase()})`, role: 'student' },
      { email: `admin@${domain}`, name: `Admin (${orgConfigs[oIdx].code || domain.split('.')[0].toUpperCase()})`, role: 'organization_admin' }
    ];

    for (const acc of perOrgDemoAccounts) {
      let u = await prisma.user.findUnique({ where: { email_lower: acc.email.toLowerCase() } });
      if (!u) {
        u = await prisma.user.create({
          data: {
            email: acc.email,
            email_lower: acc.email.toLowerCase(),
            password_hash: passwordHash,
            display_name: acc.name,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(acc.name)}`,
            status: 'active',
            is_verified: true,
            has_password: true
          }
        });
      }

      const existingRole = await prisma.userRole.findFirst({
        where: { user_id: u.id, role_id: roleMap[acc.role] }
      });
      if (!existingRole) {
        await prisma.userRole.create({
          data: { user_id: u.id, role_id: roleMap[acc.role] }
        });
      }

      const existingOrgMember = await prisma.organizationMember.findFirst({
        where: { organization_id: orgId, user_id: u.id }
      });
      if (!existingOrgMember) {
        await prisma.organizationMember.create({
          data: { organization_id: orgId, user_id: u.id, status: 'active' }
        });
      }
    }
  }

  // 4. Batch Create 200 Realistic Users per Organization (Total ~2,400 users)
  console.log('👥 Batch Generating 2,400 Realistic Students & Faculty Members across Orgs...');

  const firstNames = ['Alex', 'Sarah', 'David', 'Emma', 'Daniel', 'Sophia', 'James', 'Olivia', 'Ethan', 'Ava', 'Liam', 'Isabella', 'Benjamin', 'Mia', 'Lucas', 'Charlotte', 'Mason', 'Amelia', 'Logan', 'Harper', 'Alexander', 'Evelyn', 'Oliver', 'Abigail', 'Jacob', 'Emily', 'Michael', 'Elizabeth', 'Elijah', 'Mila', 'William', 'Ella', 'Henry', 'Avery', 'Samuel', 'Sofia', 'Sebastian', 'Camila', 'Jack', 'Aria'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores'];

  const facultyUserIds: string[] = [facultyUser!.id];
  const studentUserIds: string[] = [studentUser!.id];

  for (let oIdx = 0; oIdx < orgConfigs.length; oIdx++) {
    const orgId = orgIds[oIdx];
    const domain = orgConfigs[oIdx].domain;

    const usersToCreate: any[] = [];
    for (let u = 1; u <= 150; u++) {
      const fn = firstNames[(oIdx * 15 + u) % firstNames.length];
      const ln = lastNames[(oIdx * 17 + u) % lastNames.length];
      const isProf = u <= 15;
      const title = isProf ? `Prof. ${fn} ${ln}` : `${fn} ${ln}`;
      const email = isProf ? `prof.${fn.toLowerCase()}.${ln.toLowerCase()}@${domain}` : `${fn.toLowerCase()}.${ln.toLowerCase()}${u}@${domain}`;

      usersToCreate.push({
        email,
        email_lower: email.toLowerCase(),
        password_hash: passwordHash,
        display_name: title,
        avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        status: 'active',
        is_verified: true,
        has_password: true
      });
    }

    await prisma.user.createMany({ data: usersToCreate, skipDuplicates: true });
    
    const created = await prisma.user.findMany({
      where: { email_lower: { endsWith: `@${domain}` } },
      select: { id: true, email: true }
    });

    const userRoleInserts: any[] = [];
    const orgMemberInserts: any[] = [];

    created.forEach((u) => {
      const isFacultyMember = u.email.startsWith('prof.');
      if (isFacultyMember) facultyUserIds.push(u.id);
      else studentUserIds.push(u.id);

      const chosenRoleId = isFacultyMember ? roleMap['faculty'] : roleMap['student'];
      userRoleInserts.push({ user_id: u.id, role_id: chosenRoleId });
      orgMemberInserts.push({ organization_id: orgId, user_id: u.id, status: 'active' });
    });

    await prisma.userRole.createMany({ data: userRoleInserts, skipDuplicates: true });
    await prisma.organizationMember.createMany({ data: orgMemberInserts, skipDuplicates: true });
  }

  console.log(`✅ Total Users Seeded: ${facultyUserIds.length + studentUserIds.length} Users (${facultyUserIds.length} Faculty, ${studentUserIds.length} Students)`);

  // 5. Generate 120 Realistic Quizzes with 10–25 Multi-Modal Questions Each
  console.log('🧠 Generating 120 Production Quizzes with ~2,000 Questions...');

  const subjectCategories = [
    {
      topic: 'Full-Stack Web Engineering',
      desc: 'Master Modern Next.js, React, Node.js Microservices, and PostgreSQL Architecture.',
      banner: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1200&auto=format&fit=crop',
      diff: 'medium',
      questionsTemplate: [
        { text: 'Which React Hook is primarily used for managing synchronous side-effects and cleanup?', type: 'multiple_choice', opts: ['useEffect', 'useMemo', 'useCallback', 'useRef'], ans: 'useEffect' },
        { text: 'Next.js App Router utilizes Server Components by default.', type: 'true_false', opts: ['True', 'False'], ans: 'True' },
        { text: 'Select all valid HTTP status codes indicating successful client requests:', type: 'multi_select', opts: ['200 OK', '201 Created', '204 No Content', '404 Not Found'], ans: JSON.stringify(['200 OK', '201 Created', '204 No Content']) },
        { text: 'Arrange the execution order of standard Node.js Event Loop phases:', type: 'ordering', opts: ['Timers Phase', 'Pending Callbacks', 'Poll Phase', 'Check Phase'], ans: JSON.stringify(['Timers Phase', 'Pending Callbacks', 'Poll Phase', 'Check Phase']) },
        { text: 'What is the default port for PostgreSQL database connections?', type: 'short_answer', opts: [], ans: '5432' }
      ]
    },
    {
      topic: 'Artificial Intelligence & Deep Learning',
      desc: 'Neural Network Optimization, Backpropagation, Transformers, and Large Language Models.',
      banner: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=1200&auto=format&fit=crop',
      diff: 'expert',
      questionsTemplate: [
        { text: 'Which activation function mitigates the vanishing gradient problem in deep networks?', type: 'multiple_choice', opts: ['ReLU', 'Sigmoid', 'Tanh', 'Linear'], ans: 'ReLU' },
        { text: 'Self-Attention mechanisms in Transformers allow sequence processing in parallel.', type: 'true_false', opts: ['True', 'False'], ans: 'True' },
        { text: 'Select optimization algorithms widely used for training deep neural models:', type: 'multi_select', opts: ['AdamW', 'SGD with Momentum', 'RMSprop', 'Linear Regression'], ans: JSON.stringify(['AdamW', 'SGD with Momentum', 'RMSprop']) },
        { text: 'What mathematical operation forms the core tensor calculations in convolutional layers?', type: 'short_answer', opts: [], ans: 'Convolution' }
      ]
    },
    {
      topic: 'Aerodynamics & Spacecraft Propulsion',
      desc: 'Computational Fluid Dynamics, Supersonic Nozzle Flow, Orbital Mechanics, and Propulsion Systems.',
      banner: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?q=80&w=1200&auto=format&fit=crop',
      diff: 'hard',
      questionsTemplate: [
        { text: 'Bernoulli Principle states that an increase in fluid speed occurs simultaneously with a decrease in pressure.', type: 'true_false', opts: ['True', 'False'], ans: 'True' },
        { text: 'Which Mach number range designates Supersonic airflow?', type: 'multiple_choice', opts: ['Mach 1.2 to Mach 5.0', 'Mach 0.8 to Mach 1.2', 'Mach 0.1 to Mach 0.8', 'Greater than Mach 5.0'], ans: 'Mach 1.2 to Mach 5.0' },
        { text: 'What is the minimum velocity required for a spacecraft to achieve low Earth orbit (LEO)?', type: 'short_answer', opts: [], ans: '7.8 km/s' }
      ]
    },
    {
      topic: 'Cyber Security & Network Ethical Hacking',
      desc: 'Penetration Testing, OWASP Top 10 Vulnerabilities, Cryptography, and Zero-Trust Network Models.',
      banner: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop',
      diff: 'hard',
      questionsTemplate: [
        { text: 'Which protocol secures web HTTP traffic using TLS/SSL encryption?', type: 'multiple_choice', opts: ['HTTPS', 'FTP', 'SSH', 'Telnet'], ans: 'HTTPS' },
        { text: 'SQL Injection allows unauthorized execution of backend database queries.', type: 'true_false', opts: ['True', 'False'], ans: 'True' },
        { text: 'Select core principles of the CIA Security Triad:', type: 'multi_select', opts: ['Confidentiality', 'Integrity', 'Availability', 'Authorization'], ans: JSON.stringify(['Confidentiality', 'Integrity', 'Availability']) }
      ]
    },
    {
      topic: 'Quantum Computing & Information Theory',
      desc: 'Qubit Entanglement, Superposition, Shor Algorithm, and Quantum Logic Gates.',
      banner: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=1200&auto=format&fit=crop',
      diff: 'expert',
      questionsTemplate: [
        { text: 'A single Qubit can represent superposition states of 0 and 1 simultaneously.', type: 'true_false', opts: ['True', 'False'], ans: 'True' },
        { text: 'Which quantum gate creates an equal superposition state from a basis state?', type: 'multiple_choice', opts: ['Hadamard Gate (H)', 'Pauli-X Gate', 'CNOT Gate', 'Phase Gate'], ans: 'Hadamard Gate (H)' }
      ]
    }
  ];

  const createdQuizIds: string[] = [];

  for (let i = 1; i <= 160; i++) {
    const template = subjectCategories[i % subjectCategories.length];
    const creatorId = facultyUserIds[i % facultyUserIds.length];
    const orgId = orgIds[i % orgIds.length];

    const quizTitle = `${template.topic}: Module ${Math.ceil(i / 3)} Assessment (${i})`;

    const newQuiz = await prisma.quiz.create({
      data: {
        title: quizTitle,
        description: template.desc,
        cover_image_url: template.banner,
        status: 'published',
        visibility: i % 5 === 0 ? 'organization' : 'public', // 80% Public, 20% Org
        difficulty: template.diff,
        question_count: template.questionsTemplate.length * 3,
        total_points: template.questionsTemplate.length * 3 * 10,
        created_by: creatorId,
        organization_id: orgId
      }
    });
    createdQuizIds.push(newQuiz.id);

    const questionsToInsert: any[] = [];
    for (let qLoop = 0; qLoop < 3; qLoop++) {
      template.questionsTemplate.forEach((qt, qIdx) => {
        questionsToInsert.push({
          quiz_id: newQuiz.id,
          question_text: qLoop === 0 ? qt.text : `${qt.text} (Case Study ${qIdx + 1} Part ${qLoop + 1})`,
          question_type: qt.type,
          points: 10,
          time_limit: 30,
          options_json: JSON.stringify(qt.opts),
          correct_answer: qt.ans
        });
      });
    }

    await prisma.question.createMany({ data: questionsToInsert });
  }

  console.log(`✅ 160 Production Quizzes created with ${createdQuizIds.length * 15} total questions.`);

  // 6. Create 25 Classrooms per Org (Total ~300 Active Classrooms)
  console.log('🏫 Creating 300 Active Classrooms & Enrolling Students...');

  const classroomTypes = [
    { title: 'CS-101: Web & Software Architecture', codePrefix: 'CS1' },
    { title: 'AI-402: Deep Learning & Neural Networks', codePrefix: 'AI4' },
    { title: 'AERO-301: Flight Dynamics & Spacecraft Systems', codePrefix: 'AER' },
    { title: 'CYBER-210: Ethical Hacking & Security', codePrefix: 'CYB' },
    { title: 'PHYS-201: Quantum Mechanics & Electrodynamics', codePrefix: 'PHY' },
    { title: 'BIO-305: Molecular Biotechnology', codePrefix: 'BIO' }
  ];

  let roomCounter = 1;

  for (let oIdx = 0; oIdx < orgConfigs.length; oIdx++) {
    const orgId = orgIds[oIdx];
    const orgSlug = orgConfigs[oIdx].slug.toUpperCase().slice(0, 3);

    for (let c = 1; c <= 20; c++) {
      const cls = classroomTypes[c % classroomTypes.length];
      const roomCode = `${cls.codePrefix}${c}${orgSlug}`.slice(0, 8);
      const creatorId = facultyUserIds[(oIdx * 20 + c) % facultyUserIds.length];

      const room = await prisma.room.upsert({
        where: { room_code: roomCode },
        update: {},
        create: {
          name: `${cls.title} (Section ${String.fromCharCode(65 + (c % 4))})`,
          room_code: roomCode,
          organization_id: orgId,
          banner_url: subjectCategories[c % subjectCategories.length].banner,
          status: 'active',
          created_by: creatorId
        }
      });
      roomCounter++;

      // Enroll 30 Students permanently in each room
      const memberInserts: any[] = [];
      const studentStartIndex = (oIdx * 150 + c * 5) % studentUserIds.length;
      for (let s = 0; s < 30; s++) {
        const sId = studentUserIds[(studentStartIndex + s) % studentUserIds.length];
        memberInserts.push({ room_id: room.id, user_id: sId });
      }
      if (c <= 10) memberInserts.push({ room_id: room.id, user_id: studentUser!.id });

      await prisma.roomMember.createMany({ data: memberInserts, skipDuplicates: true });

      // Create Stream Posts & Announcements
      const streamPost = await prisma.roomPost.create({
        data: {
          room_id: room.id,
          author_name: 'Prof. Marcus Vance',
          author_role: 'Faculty Instructor',
          content: `Welcome to ${cls.title}! Please complete your assigned Midterm Assessment quiz before the due date.`
        }
      });

      await prisma.roomComment.create({
        data: {
          post_id: streamPost.id,
          author_name: 'Alex Johnson',
          text: 'Thank you Professor! Ready for the assignment.'
        }
      });

      // Create Classroom Assignment
      const quizForAssignment = createdQuizIds[(roomCounter * 3) % createdQuizIds.length];
      const assignment = await prisma.classroomAssignment.create({
        data: {
          room_id: room.id,
          quiz_id: quizForAssignment,
          title: `Assignment: ${cls.title} Assessment`,
          instructions: 'Complete all questions in a single session. Single attempt policy applies.',
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          total_points: 100,
          max_attempts: 1,
          time_limit_minutes: 30,
          show_answers: true
        }
      });

      // Seed Student Submissions for analytics
      const subInserts: any[] = [];
      const attemptInserts: any[] = [];

      for (let s = 0; s < 20; s++) {
        const subStudentId = studentUserIds[(studentStartIndex + s) % studentUserIds.length];
        const studentName = `Student ${s + 1}`;
        const score = 70 + (s * 3) % 30;
        const percentage = Math.round((score / 100) * 100);

        subInserts.push({
          assignment_id: assignment.id,
          user_id: subStudentId,
          student_name: studentName,
          score,
          total_points: 100,
          percentage,
          time_taken_seconds: 450 + s * 20,
          status: 'submitted'
        });

        attemptInserts.push({
          quiz_id: quizForAssignment,
          user_id: subStudentId,
          student_name: studentName,
          score,
          total_points: 100,
          percentage,
          time_taken_seconds: 450 + s * 20
        });
      }

      await prisma.assignmentSubmission.createMany({ data: subInserts, skipDuplicates: true });
      await prisma.quizAttempt.createMany({ data: attemptInserts });
    }
  }

  console.log(`✅ 240 Active Classrooms seeded with Stream Posts, Assignments, and Student Marks Analytics!`);

  // 7. Seed Bookmarks for Users
  console.log('🔖 Seeding User Bookmarks...');
  const bookmarkInserts: any[] = [];
  for (let b = 0; b < 20; b++) {
    bookmarkInserts.push({
      user_id: studentUser!.id,
      quiz_id: createdQuizIds[b % createdQuizIds.length]
    });
    bookmarkInserts.push({
      user_id: facultyUser!.id,
      quiz_id: createdQuizIds[(b + 5) % createdQuizIds.length]
    });
  }
  await prisma.userBookmark.createMany({ data: bookmarkInserts, skipDuplicates: true });

  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.log(`🎉 Seed Completed Successfully in ${elapsed}s! Database is now packed with production data.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
