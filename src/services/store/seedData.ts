export interface SeedCollectionMap {
  [collectionName: string]: Record<string, any>;
}

export const initialSeedData: SeedCollectionMap = {
  vacancies: {
    "vac-1": {
      id: "vac-1",
      title: "Full-Stack Developer Intern",
      department: "Engineering",
      employmentType: "Internship",
      location: "Lahore / Remote",
      status: "OPEN",
      openingsCount: 3,
      applicantsCount: 14,
      requirements: "Proficiency in React, TypeScript, Node.js, and modern CSS frameworks. Eagerness to build scalable internal tools.",
      responsibilities: "Collaborate with senior engineers to implement features, optimize database queries, and write clean unit tests.",
      createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    "vac-2": {
      id: "vac-2",
      title: "UI/UX Design Intern",
      department: "Design",
      employmentType: "Internship",
      location: "Lahore / Hybrid",
      status: "OPEN",
      openingsCount: 2,
      applicantsCount: 9,
      requirements: "Figma proficiency, strong aesthetic sense, understanding of component design systems and user journey maps.",
      responsibilities: "Create wireframes, high-fidelity prototypes, and design system components for web and mobile interfaces.",
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    "vac-3": {
      id: "vac-3",
      title: "HR Executive",
      department: "Human Resources",
      employmentType: "Full-Time",
      location: "Lahore / On-site",
      status: "OPEN",
      openingsCount: 1,
      applicantsCount: 6,
      requirements: "Experience in talent acquisition, employee relations, onboarding workflows, and HR metrics.",
      responsibilities: "Drive end-to-end recruitment pipelines, manage intern reviews, and oversee daily HR operations.",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    "vac-4": {
      id: "vac-4",
      title: "Growth & Content Intern",
      department: "Marketing",
      employmentType: "Internship",
      location: "Lahore / Remote",
      status: "OPEN",
      openingsCount: 2,
      applicantsCount: 5,
      requirements: "Creative copywriter with a strong understanding of B2B SaaS growth tactics and social media management.",
      responsibilities: "Draft engaging social campaigns, monitor growth metrics, and support employer branding initiatives.",
      createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  },
  candidates: {
    "cand-1": {
      id: "cand-1",
      fullName: "Bilal Khan",
      email: "bilal.khan@example.com",
      phone: "+92 300 1234567",
      vacancyId: "vac-1",
      vacancyTitle: "Full-Stack Developer Intern",
      stage: "NEW_APPLIED",
      rating: 4,
      source: "LinkedIn",
      appliedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
      notes: "Strong portfolio with 2 full-stack React + Node projects on GitHub.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    "cand-2": {
      id: "cand-2",
      fullName: "Ayesha Siddiqui",
      email: "ayesha.siddiqui@example.com",
      phone: "+92 321 9876543",
      vacancyId: "vac-2",
      vacancyTitle: "UI/UX Design Intern",
      stage: "SHORTLISTED",
      rating: 5,
      source: "Behance",
      appliedDate: new Date(Date.now() - 4 * 86400000).toISOString(),
      notes: "Exceptional visual hierarchy and typography skills in design system portfolio.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 86400000).toISOString()
    },
    "cand-3": {
      id: "cand-3",
      fullName: "Hamza Farooq",
      email: "hamza.farooq@example.com",
      phone: "+92 333 4567890",
      vacancyId: "vac-1",
      vacancyTitle: "Full-Stack Developer Intern",
      stage: "SCREENING",
      rating: 4,
      source: "University Portal",
      appliedDate: new Date(Date.now() - 6 * 86400000).toISOString(),
      notes: "Good CS fundamentals. Completed initial screening call successfully.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    "cand-4": {
      id: "cand-4",
      fullName: "Sara Ahmed",
      email: "sara.ahmed@example.com",
      phone: "+92 312 3456789",
      vacancyId: "vac-3",
      vacancyTitle: "HR Executive",
      stage: "ASSESSMENT",
      rating: 4,
      source: "Rozee.pk",
      appliedDate: new Date(Date.now() - 8 * 86400000).toISOString(),
      notes: "Currently completing the talent sourcing and onboarding scenario assignment.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    "cand-5": {
      id: "cand-5",
      fullName: "Daniyal Tariq",
      email: "daniyal.tariq@example.com",
      phone: "+92 345 6789012",
      vacancyId: "vac-1",
      vacancyTitle: "Full-Stack Developer Intern",
      stage: "INTERVIEWING",
      rating: 5,
      source: "Referral",
      appliedDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      notes: "Technical round scheduled for today at 3:00 PM PKT.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    "cand-6": {
      id: "cand-6",
      fullName: "Zainab Noor",
      email: "zainab.noor@example.com",
      phone: "+92 301 2345678",
      vacancyId: "vac-2",
      vacancyTitle: "UI/UX Design Intern",
      stage: "OFFERED",
      rating: 5,
      source: "LinkedIn",
      appliedDate: new Date(Date.now() - 12 * 86400000).toISOString(),
      notes: "Offer letter sent. Awaiting candidate signature.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 12 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    "cand-7": {
      id: "cand-7",
      fullName: "Usman Ali",
      email: "usman.ali@example.com",
      phone: "+92 302 3456789",
      vacancyId: "vac-1",
      vacancyTitle: "Full-Stack Developer Intern",
      stage: "HIRED",
      rating: 5,
      source: "Campus Drive",
      appliedDate: new Date(Date.now() - 15 * 86400000).toISOString(),
      notes: "Offer accepted. Successfully onboarded as active intern.",
      resumeUrl: "#",
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  },
  people: {
    "usr-admin": {
      id: "usr-admin",
      uid: "usr-admin",
      fullName: "Pile & Loop Super Admin",
      email: "pileandloop@gmail.com",
      password: "fourty420",
      role: "SUPER_ADMIN",
      department: "Management",
      designation: "Managing Director / Super Admin",
      status: "ACTIVE",
      joinDate: "2024-01-01",
      phone: "+92 300 0000001",
      createdAt: new Date(Date.now() - 365 * 86400000).toISOString()
    },
    "usr-super": {
      id: "usr-super",
      uid: "usr-super",
      fullName: "Kamran Raza",
      email: "supervisor@pileandloop.com",
      password: "fourty420",
      role: "HR_SUPERVISOR",
      department: "Human Resources",
      designation: "HR Supervisor",
      status: "ACTIVE",
      joinDate: "2024-06-01",
      phone: "+92 300 0000002",
      createdAt: new Date(Date.now() - 200 * 86400000).toISOString()
    },
    "usr-exec": {
      id: "usr-exec",
      uid: "usr-exec",
      fullName: "Fatima Sheikh",
      email: "executive@pileandloop.com",
      password: "fourty420",
      role: "HR_EXECUTIVE",
      department: "Human Resources",
      designation: "Senior HR Executive",
      status: "ACTIVE",
      joinDate: "2025-01-15",
      phone: "+92 300 0000003",
      createdAt: new Date(Date.now() - 150 * 86400000).toISOString()
    },
    "usr-intern": {
      id: "usr-intern",
      uid: "usr-intern",
      fullName: "Zeeshan Malik",
      email: "intern@pileandloop.com",
      password: "fourty420",
      role: "HR_INTERN",
      department: "Human Resources",
      designation: "HR Operations Intern",
      status: "ACTIVE",
      joinDate: "2026-06-01",
      internshipStartDate: "2026-06-01",
      internshipEndDate: "2026-09-30",
      phone: "+92 300 0000004",
      createdAt: new Date(Date.now() - 90 * 86400000).toISOString()
    },
    "usr-member": {
      id: "usr-member",
      uid: "usr-member",
      fullName: "Saad Qureshi",
      email: "member@pileandloop.com",
      password: "fourty420",
      role: "TEAM_MEMBER",
      department: "Engineering",
      designation: "Software Engineering Intern",
      status: "ACTIVE",
      joinDate: "2026-07-01",
      internshipStartDate: "2026-07-01",
      internshipEndDate: "2026-10-31",
      phone: "+92 300 0000005",
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString()
    }
  },
  userRequests: {
    "req-1": {
      id: "req-1",
      fullName: "Tariq Mahmood",
      email: "tariq.mahmood@pileandloop.com",
      requestedRole: "HR_EXECUTIVE",
      department: "Human Resources",
      status: "PENDING",
      reason: "Joining as Senior Talent Acquisition Specialist.",
      createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
    }
  },
  interviews: {
    "int-1": {
      id: "int-1",
      candidateId: "cand-5",
      candidateName: "Daniyal Tariq",
      vacancyTitle: "Full-Stack Developer Intern",
      interviewerId: "usr-admin",
      interviewerName: "Pile & Loop Admin",
      scheduledAt: new Date(Date.now() + 4 * 3600000).toISOString(),
      type: "Technical Interview",
      status: "SCHEDULED",
      meetingUrl: "https://meet.google.com/hros-tech-interview",
      notes: "Focus on React component state architecture, async data fetching, and API design.",
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  },
  hrTasks: {
    "task-1": {
      id: "task-1",
      title: "Review Q3 Intern Evaluations",
      description: "Perform quarterly progress rubrics for Engineering and Design cohorts.",
      priority: "HIGH",
      status: "IN_PROGRESS",
      assignedTo: "usr-super",
      assignedToName: "Kamran Raza",
      dueDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
    },
    "task-2": {
      id: "task-2",
      title: "Send Onboarding Kit to Usman Ali",
      description: "Dispatch welcome email, credentials checklist, and IT asset allocation form.",
      priority: "MEDIUM",
      status: "TODO",
      assignedTo: "usr-exec",
      assignedToName: "Fatima Sheikh",
      dueDate: new Date(Date.now() + 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    },
    "task-3": {
      id: "task-3",
      title: "Update cPanel IMAP Sync Filter",
      description: "Verify that incoming resumes from career portal are correctly categorized.",
      priority: "LOW",
      status: "COMPLETED",
      assignedTo: "usr-admin",
      assignedToName: "Pile & Loop Admin",
      dueDate: new Date(Date.now() - 1 * 86400000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
    }
  },
  emailTemplates: {
    "tmpl-1": {
      id: "tmpl-1",
      name: "Interview Invitation (Technical)",
      subject: "Invitation to Technical Interview ? Pile & Loop ({{vacancy_title}})",
      category: "INTERVIEW",
      body: "Dear {{candidate_name}},\n\nThank you for applying for the {{vacancy_title}} position at Pile & Loop.\n\nWe were impressed by your background and would like to invite you for a 45-minute technical interview. Please confirm your availability for the proposed time:\n\nDate & Time: {{interview_time}}\nGoogle Meet Link: {{meeting_link}}\n\nBest regards,\nPile & Loop HR Team",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    "tmpl-2": {
      id: "tmpl-2",
      name: "Assessment Task Assignment",
      subject: "Take-Home Assessment ? Pile & Loop ({{vacancy_title}})",
      category: "ASSESSMENT",
      body: "Dear {{candidate_name}},\n\nAs the next step in our recruitment process for {{vacancy_title}}, we have prepared a brief practical assessment to evaluate your hands-on problem-solving abilities.\n\nPlease find the project instructions attached. You will have 48 hours to complete and submit your GitHub repository link.\n\nBest regards,\nPile & Loop Engineering & HR",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    },
    "tmpl-3": {
      id: "tmpl-3",
      name: "Internship Offer Letter",
      subject: "Congratulations! Internship Offer from Pile & Loop",
      category: "OFFER",
      body: "Dear {{candidate_name}},\n\nWe are delighted to offer you the position of {{vacancy_title}} at Pile & Loop!\n\nPlease review the attached offer letter outlining your stipend, working hours (09:00 - 18:00 PKT), and starting date.\n\nKindly sign and return a copy within 3 business days.\n\nWarm regards,\nPile & Loop Leadership",
      createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
    }
  },
  leaveRequests: {
    "leave-1": {
      id: "leave-1",
      userId: "usr-member",
      userName: "Saad Qureshi",
      type: "CASUAL",
      startDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
      daysCount: 2,
      reason: "University semester final examination preparation",
      status: "PENDING",
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
    }
  },
  settings: {
    "company": {
      id: "company",
      companyName: "Pile & Loop",
      hrEmail: "hr@pileandloop.com",
      superAdminEmail: "pileandloop@gmail.com",
      timezone: "Asia/Karachi",
      workDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workHoursStart: "09:00",
      workHoursEnd: "18:00",
      lunchBreakMinutes: 60,
      annualLeaveQuota: 14,
      sickLeaveQuota: 8,
      casualLeaveQuota: 8,
      updatedAt: new Date().toISOString()
    }
  },
  auditLogs: {
    "audit-1": {
      id: "audit-1",
      action: "SUPER_ADMIN_INITIALIZED",
      actorId: "usr-admin",
      actorEmail: "pileandloop@gmail.com",
      actorRole: "SUPER_ADMIN",
      targetEntity: "System",
      details: "Super Admin account initialized for pileandloop@gmail.com.",
      timestamp: new Date(Date.now() - 1 * 3600000).toISOString()
    }
  }
};
