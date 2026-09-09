import { store } from './store';

// Helper: current PKT date string (YYYY-MM-DD)
function getPktDateString(): string {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pktTime = new Date(utc + (3600000 * 5)); // PKT is UTC+5
  return pktTime.toISOString().split('T')[0];
}

export async function bootstrapSuperAdmin(email: string, _bootstrapSecret?: string) {
  const people = store.getCollection('people');
  let adminPerson = Object.values(people).find(p => p.email.toLowerCase() === email.toLowerCase());
  
  if (!adminPerson) {
    adminPerson = {
      id: 'usr-admin',
      uid: 'usr-admin',
      fullName: 'Super Administrator',
      email,
      role: 'SUPER_ADMIN',
      department: 'Management',
      designation: 'System Owner / Super Admin',
      status: 'ACTIVE',
      createdAt: new Date().toISOString()
    };
    store.setDocument('people', 'usr-admin', adminPerson);
  }

  return { success: true, message: `Super Admin account verified for ${email}.` };
}

export async function createInternalUser(data: {
  email: string;
  password?: string;
  displayName: string;
  role: string;
  department?: string;
  jobTitle?: string;
}) {
  const id = 'usr-' + Date.now().toString(36);
  const newPerson = {
    id,
    uid: id,
    fullName: data.displayName,
    email: data.email,
    role: data.role,
    department: data.department || 'General',
    designation: data.jobTitle || 'Team Member',
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  store.setDocument('people', id, newPerson);
  return { success: true, user: newPerson };
}

export async function updateUserRole(targetUid: string, newRole: string) {
  store.updateDocument('people', targetUid, { role: newRole, updatedAt: new Date().toISOString() });
  return { success: true };
}

export async function disableInternalUser(targetUid: string, disabled: boolean) {
  store.updateDocument('people', targetUid, { 
    status: disabled ? 'INACTIVE' : 'ACTIVE',
    updatedAt: new Date().toISOString()
  });
  return { success: true };
}

export async function sendHrEmail(data: {
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  textBody?: string;
  htmlBody: string;
  threadId?: string;
  candidateId?: string;
  applicationId?: string;
  category?: string;
  idempotencyKey: string;
}) {
  // Attempt to call Vercel Serverless /api/email if deployed
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', ...data })
    });
    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch {
    // Fall back to local reactive storage
  }

  const threadId = data.threadId || ('thread-' + Date.now().toString(36));
  const messageId = 'msg-' + Date.now().toString(36);
  const now = new Date().toISOString();

  // Save email to store
  store.setDocument('emails', messageId, {
    id: messageId,
    threadId,
    to: [data.to],
    from: 'hr@pileandloop.com',
    subject: data.subject,
    html: data.htmlBody,
    text: data.textBody || data.subject,
    date: now,
    candidateId: data.candidateId,
    folder: 'Sent',
    createdAt: now
  });

  // Update or create thread
  store.setDocument('emailThreads', threadId, {
    id: threadId,
    subject: data.subject,
    candidateId: data.candidateId,
    lastMessageAt: now,
    lastMessageSnippet: data.subject,
    participants: ['hr@pileandloop.com', data.to],
    folder: 'Sent',
    unread: false,
    updatedAt: now
  }, true);

  return {
    success: true,
    threadId,
    messageId,
    sentAt: now
  };
}

export async function syncHrMailbox() {
  try {
    const res = await fetch('/api/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync' })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Local fallback
  }

  return { success: true, newMessagesCount: 0, syncErrors: [] };
}

export async function generateHrEmailDraft(data: {
  candidateId?: string;
  applicationId?: string;
  threadId?: string;
  userInstruction: string;
  draftType?: string;
}) {
  // Attempt to call Vercel Serverless /api/gemini
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'draft', ...data })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to client-side smart generation
  }

  // Find candidate info if available
  const candidates = store.getCollection('candidates');
  const cand = data.candidateId ? candidates[data.candidateId] : null;
  const candidateName = cand?.fullName || 'Candidate';
  const vacancyTitle = cand?.vacancyTitle || 'Position';

  let subject = `Update regarding your application for ${vacancyTitle} at Pile & Loop`;
  let body = '';

  const lower = (data.userInstruction + ' ' + (data.draftType || '')).toLowerCase();

  if (lower.includes('interview')) {
    subject = `Interview Invitation ? Pile & Loop (${vacancyTitle})`;
    body = `<p>Dear ${candidateName},</p>
<p>Thank you for your interest in joining Pile & Loop as a <strong>${vacancyTitle}</strong>.</p>
<p>We were very impressed by your background and would like to invite you for a virtual interview with our team.</p>
<p><strong>Proposed Timing:</strong> Please let us know if you are available this week between 2:00 PM and 5:00 PM PKT.</p>
<p><strong>Meeting Link:</strong> <a href="https://meet.google.com/hros-interview">https://meet.google.com/hros-interview</a></p>
<p>Looking forward to speaking with you!</p>
<p>Best regards,<br/><strong>Pile & Loop HR Team</strong></p>`;
  } else if (lower.includes('assessment') || lower.includes('task')) {
    subject = `Technical Assessment ? Pile & Loop (${vacancyTitle})`;
    body = `<p>Dear ${candidateName},</p>
<p>As the next step in our selection process for the <strong>${vacancyTitle}</strong> role, we would like you to complete a brief practical assessment.</p>
<p>Please review the task brief and submit your work within 48 hours.</p>
<p>Best regards,<br/><strong>Pile & Loop Engineering & HR</strong></p>`;
  } else if (lower.includes('offer')) {
    subject = `Offer of Internship / Employment ? Pile & Loop`;
    body = `<p>Dear ${candidateName},</p>
<p>We are thrilled to extend an offer for the position of <strong>${vacancyTitle}</strong> at Pile & Loop!</p>
<p>Please find the official details of your role, stipend, and working hours in the attached agreement.</p>
<p>Kindly sign and return a copy at your earliest convenience.</p>
<p>Welcome to the team!</p>
<p>Warm regards,<br/><strong>Pile & Loop Leadership</strong></p>`;
  } else if (lower.includes('reject')) {
    subject = `Application Status ? Pile & Loop (${vacancyTitle})`;
    body = `<p>Dear ${candidateName},</p>
<p>Thank you for taking the time to apply and interview for the <strong>${vacancyTitle}</strong> position at Pile & Loop.</p>
<p>After careful evaluation of all applications, we have decided to proceed with other candidates whose experience more closely aligns with our current requirements.</p>
<p>We truly appreciate your interest and wish you the absolute best in your career pursuits.</p>
<p>Sincerely,<br/><strong>Pile & Loop HR Team</strong></p>`;
  } else {
    body = `<p>Dear ${candidateName},</p>
<p>${data.userInstruction}</p>
<p>Please let us know if you have any questions.</p>
<p>Best regards,<br/><strong>Pile & Loop HR Team</strong></p>`;
  }

  return {
    success: true,
    draft: { subject, body },
    generationId: 'draft-' + Date.now().toString(36)
  };
}

export async function summarizeEmailThread(threadId: string) {
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'summarize', threadId })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fall back to local summary
  }

  return {
    success: true,
    summary: {
      summary: "Email thread covering interview coordination, candidate confirmation, and meeting link dispatch.",
      keyPoints: [
        "Candidate confirmed availability for technical interview.",
        "HR sent Google Meet link and interview guidelines.",
        "Status: Ready for interview."
      ],
      suggestedNextAction: "Conduct interview and record scorecard."
    }
  };
}

export async function importCandidateCsv(rows: any[], isDryRun: boolean, defaultVacancyId?: string) {
  const candidates = store.getCollection('candidates');
  const existingEmails = new Set(Object.values(candidates).map(c => (c.email || '').toLowerCase().trim()));
  
  const created: any[] = [];
  const duplicates: any[] = [];
  const errors: any[] = [];

  rows.forEach((row, idx) => {
    const email = (row.email || row.Email || '').toLowerCase().trim();
    const fullName = row.fullName || row['Full Name'] || row.name || row.Name;
    const phone = row.phone || row.Phone || '';

    if (!fullName || !email) {
      errors.push({ row: idx + 1, error: 'Missing required full name or email address' });
      return;
    }

    if (existingEmails.has(email)) {
      duplicates.push({ row: idx + 1, email, fullName, reason: 'Duplicate email address found' });
      if (!isDryRun) {
        // Record in duplicate review queue
        const reviewId = 'dup-' + Date.now().toString(36) + '-' + idx;
        store.setDocument('duplicateReviewQueue', reviewId, {
          id: reviewId,
          newCandidate: { fullName, email, phone, vacancyId: defaultVacancyId },
          status: 'PENDING',
          createdAt: new Date().toISOString()
        });
      }
    } else {
      const candId = 'cand-' + Date.now().toString(36) + '-' + idx;
      const newCand = {
        id: candId,
        fullName,
        email,
        phone,
        vacancyId: defaultVacancyId || 'vac-1',
        vacancyTitle: 'Full-Stack Developer Intern',
        stage: 'NEW_APPLIED',
        rating: 3,
        source: 'CSV Import',
        appliedDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      created.push(newCand);
      if (!isDryRun) {
        store.setDocument('candidates', candId, newCand);
        existingEmails.add(email);
      }
    }
  });

  return {
    success: true,
    isDryRun,
    result: {
      totalRows: rows.length,
      importedCount: created.length,
      duplicateCount: duplicates.length,
      errorCount: errors.length,
      duplicates,
      errors
    }
  };
}

export async function reviewDuplicateCandidate(reviewId: string, action: 'MERGE' | 'KEEP_SEPARATE' | 'IGNORE', _targetCandidateId?: string) {
  store.updateDocument('duplicateReviewQueue', reviewId, {
    status: action === 'MERGE' ? 'RESOLVED_MERGED' : action === 'KEEP_SEPARATE' ? 'RESOLVED_SEPARATE' : 'IGNORED',
    resolvedAt: new Date().toISOString()
  });
  return { success: true };
}

export async function transitionApplicationStage(applicationId: string, newStage: string, reason?: string) {
  const cand = store.getCollection('candidates')[applicationId];
  const oldStage = cand?.stage || 'NEW_APPLIED';
  
  store.updateDocument('candidates', applicationId, {
    stage: newStage,
    updatedAt: new Date().toISOString(),
    lastStageChangeReason: reason || null
  });

  // Log in stageHistory
  const histId = 'hist-' + Date.now().toString(36);
  store.setDocument('stageHistory', histId, {
    id: histId,
    candidateId: applicationId,
    fromStage: oldStage,
    toStage: newStage,
    reason: reason || '',
    timestamp: new Date().toISOString()
  });

  return { success: true, oldStage, newStage };
}

export async function closeVacancy(vacancyId: string) {
  store.updateDocument('vacancies', vacancyId, {
    status: 'CLOSED',
    closedAt: new Date().toISOString()
  });

  return {
    success: true,
    closeoutReport: {
      vacancyId,
      status: 'CLOSED',
      closedAt: new Date().toISOString()
    }
  };
}

// Attendance Services
export async function checkIn(plannedTasks?: string) {
  const dateKey = getPktDateString();
  const activeUser = JSON.parse(localStorage.getItem('hros_active_user') || '{"uid":"usr-admin","displayName":"Staff Member"}');
  const attendanceId = `att-${activeUser.uid}-${dateKey}`;
  const now = new Date().toISOString();

  store.setDocument('attendance', attendanceId, {
    id: attendanceId,
    userId: activeUser.uid,
    userName: activeUser.displayName,
    date: dateKey,
    checkInTime: now,
    status: 'PRESENT',
    plannedTasks: plannedTasks || '',
    breakMinutes: 0,
    netWorkedMinutes: 0,
    createdAt: now,
    updatedAt: now
  });

  return { success: true, attendanceId, dateKey };
}

export async function startBreak() {
  const dateKey = getPktDateString();
  const activeUser = JSON.parse(localStorage.getItem('hros_active_user') || '{"uid":"usr-admin"}');
  const attendanceId = `att-${activeUser.uid}-${dateKey}`;
  const now = new Date().toISOString();

  store.updateDocument('attendance', attendanceId, {
    status: 'ON_BREAK',
    currentBreakStart: now,
    updatedAt: now
  });

  return { success: true, status: 'ON_BREAK' };
}

export async function endBreak() {
  const dateKey = getPktDateString();
  const activeUser = JSON.parse(localStorage.getItem('hros_active_user') || '{"uid":"usr-admin"}');
  const attendanceId = `att-${activeUser.uid}-${dateKey}`;
  const current = store.getCollection('attendance')[attendanceId];
  const now = new Date();

  let additionalBreakMinutes = 15;
  if (current?.currentBreakStart) {
    const diffMs = now.getTime() - new Date(current.currentBreakStart).getTime();
    additionalBreakMinutes = Math.max(1, Math.round(diffMs / 60000));
  }

  const totalBreakMinutes = (current?.breakMinutes || 0) + additionalBreakMinutes;

  store.updateDocument('attendance', attendanceId, {
    status: 'PRESENT',
    breakMinutes: totalBreakMinutes,
    currentBreakStart: null,
    updatedAt: now.toISOString()
  });

  return { success: true, status: 'PRESENT', totalBreakMinutes };
}

export async function checkOut(data: {
  tasksCompleted?: string;
  blockers?: string;
  nextDayPlans?: string;
  notes?: string;
}) {
  const dateKey = getPktDateString();
  const activeUser = JSON.parse(localStorage.getItem('hros_active_user') || '{"uid":"usr-admin"}');
  const attendanceId = `att-${activeUser.uid}-${dateKey}`;
  const current = store.getCollection('attendance')[attendanceId];
  const now = new Date();

  const checkInTime = current?.checkInTime ? new Date(current.checkInTime) : new Date(now.getTime() - 8 * 3600000);
  const totalWorkedMinutes = Math.max(0, Math.round((now.getTime() - checkInTime.getTime()) / 60000));
  const breakMinutes = current?.breakMinutes || 0;
  const netWorkedMinutes = Math.max(0, totalWorkedMinutes - breakMinutes);

  store.updateDocument('attendance', attendanceId, {
    status: 'CHECKED_OUT',
    checkOutTime: now.toISOString(),
    totalWorkedMinutes,
    netWorkedMinutes,
    tasksCompleted: data.tasksCompleted || '',
    blockers: data.blockers || '',
    nextDayPlans: data.nextDayPlans || '',
    updatedAt: now.toISOString()
  });

  return { success: true, totalWorkedMinutes, netWorkedMinutes, breakMinutes };
}

export async function correctAttendance(attendanceId: string, newNetWorkedMinutes: number, newStatus: string | undefined, reason: string) {
  store.updateDocument('attendance', attendanceId, {
    netWorkedMinutes: newNetWorkedMinutes,
    status: newStatus || 'PRESENT',
    correctionReason: reason,
    correctedAt: new Date().toISOString()
  });
  return { success: true };
}

export async function createOnboardingCase(data: {
  applicationId: string;
  candidateId: string;
  startDate?: string;
  durationMonths?: number;
  department?: string;
  role?: string;
  supervisorId?: string;
}) {
  const id = 'onb-' + Date.now().toString(36);
  const cand = store.getCollection('candidates')[data.candidateId];

  const newCase = {
    id,
    candidateId: data.candidateId,
    candidateName: cand?.fullName || 'New Hire',
    candidateEmail: cand?.email || '',
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    durationMonths: data.durationMonths || 3,
    department: data.department || cand?.department || 'Engineering',
    role: data.role || cand?.vacancyTitle || 'Intern',
    supervisorId: data.supervisorId || 'usr-super',
    status: 'IN_PROGRESS',
    documents: {
      cnic: { status: 'PENDING' },
      resume: { status: 'VERIFIED' },
      contract: { status: 'PENDING' }
    },
    checklist: {
      itSetup: false,
      orientationCompleted: false,
      slackAdded: false,
      emailCreated: false
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  store.setDocument('onboarding', id, newCase);
  return { success: true, onboardingId: id };
}

export async function updateDocumentStatus(data: {
  onboardingId: string;
  documentType: string;
  status: string;
  watermarkStatus?: string;
  notes?: string;
  storagePath?: string;
}) {
  const current = store.getCollection('onboarding')[data.onboardingId];
  if (current) {
    const docs = current.documents || {};
    docs[data.documentType] = {
      status: data.status,
      watermarkStatus: data.watermarkStatus || 'VERIFIED',
      notes: data.notes || '',
      updatedAt: new Date().toISOString()
    };
    store.updateDocument('onboarding', data.onboardingId, { documents: docs });
  }
  return { success: true };
}

export async function completeOnboarding(onboardingId: string) {
  const onb = store.getCollection('onboarding')[onboardingId];
  const personId = 'usr-' + Date.now().toString(36);

  if (onb) {
    store.updateDocument('onboarding', onboardingId, {
      status: 'COMPLETED',
      completedAt: new Date().toISOString()
    });

    // Create People record
    store.setDocument('people', personId, {
      id: personId,
      uid: personId,
      fullName: onb.candidateName,
      email: onb.candidateEmail,
      role: 'TEAM_MEMBER',
      department: onb.department,
      designation: onb.role,
      status: 'ACTIVE',
      joinDate: onb.startDate,
      internshipStartDate: onb.startDate,
      internshipEndDate: new Date(new Date(onb.startDate).getTime() + onb.durationMonths * 30 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toISOString()
    });
  }

  return { success: true, personId, message: 'Onboarding completed and Employee profile created successfully.' };
}

export async function createOffboardingCase(data: {
  personId: string;
  reason: string;
  offboardingType: string;
  lastWorkingDate?: string;
}) {
  const id = 'offb-' + Date.now().toString(36);
  const person = store.getCollection('people')[data.personId];

  store.setDocument('offboarding', id, {
    id,
    personId: data.personId,
    personName: person?.fullName || 'Staff Member',
    reason: data.reason,
    offboardingType: data.offboardingType,
    lastWorkingDate: data.lastWorkingDate || new Date().toISOString().split('T')[0],
    status: 'IN_PROGRESS',
    createdAt: new Date().toISOString()
  });

  return { success: true, offboardingId: id };
}

export async function completeOffboarding(data: {
  offboardingId: string;
  certificateStatus: string;
  recommendationLetterStatus: string;
  finalNotes?: string;
}) {
  const offb = store.getCollection('offboarding')[data.offboardingId];
  if (offb) {
    store.updateDocument('offboarding', data.offboardingId, {
      status: 'COMPLETED',
      certificateStatus: data.certificateStatus,
      recommendationLetterStatus: data.recommendationLetterStatus,
      finalNotes: data.finalNotes || '',
      completedAt: new Date().toISOString()
    });

    if (offb.personId) {
      store.updateDocument('people', offb.personId, {
        status: 'ALUMNI',
        exitDate: new Date().toISOString().split('T')[0]
      });
    }
  }

  return { success: true };
}
