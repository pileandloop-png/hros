import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

const HIGH_IMPACT_STAGES = [
  'SELECTED',
  'NOT_HIRED',
  'DISQUALIFIED',
  'WITHDRAWN',
  'ONBOARDED',
  'OFFBOARDED'
];

export const transitionApplicationStage = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  const { applicationId, newStage, reason } = request.data as {
    applicationId: string;
    newStage: string;
    reason?: string;
  };

  if (!applicationId || !newStage) {
    throw new HttpsError('invalid-argument', 'Application ID and new stage are required.');
  }

  if (HIGH_IMPACT_STAGES.includes(newStage)) {
    if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER' && callerRole !== 'HR_SUPERVISOR') {
      throw new HttpsError('permission-denied', `Only HR Supervisors or Admins can transition to ${newStage}.`);
    }
  }

  const appRef = db.collection('applications').doc(applicationId);
  const appSnap = await appRef.get();
  if (!appSnap.exists) {
    throw new HttpsError('not-found', 'Application not found.');
  }

  const appData = appSnap.data()!;
  const oldStage = appData.currentStage || 'NEW_APPLICATION';

  // 1. Record stage history
  const histRef = appRef.collection('stageHistory').doc();
  await histRef.set({
    historyId: histRef.id,
    stage: newStage,
    changedFrom: oldStage,
    changedBy: callerAuth.uid,
    reason: reason || 'Stage updated via recruitment workflow',
    changedAt: FieldValue.serverTimestamp(),
  });

  // 2. Update Application
  await appRef.update({
    currentStage: newStage,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 3. Auto-initialize Onboarding Case if Selected / Onboarding Documents Pending
  if (newStage === 'SELECTED' || newStage === 'ONBOARDING_DOCUMENTS_PENDING') {
    const existingCase = await db.collection('onboardingCases')
      .where('applicationId', '==', applicationId)
      .limit(1)
      .get();

    if (existingCase.empty) {
      const onbRef = db.collection('onboardingCases').doc();
      await onbRef.set({
        onboardingId: onbRef.id,
        applicationId,
        candidateId: appData.candidateId,
        vacancyId: appData.vacancyId || null,
        status: 'DOCUMENTS_PENDING',
        startDate: null,
        expectedEndDate: null,
        documentChecklist: [
          { type: 'CNIC_FRONT', name: 'CNIC Front', status: 'MISSING', isSensitive: true, required: true },
          { type: 'CNIC_BACK', name: 'CNIC Back', status: 'MISSING', isSensitive: true, required: true },
          { type: 'TRANSCRIPT', name: 'Transcript or Degree', status: 'MISSING', isSensitive: false, required: true },
          { type: 'SPEED_TEST', name: 'Internet Speed Test', status: 'MISSING', isSensitive: false, required: true },
          { type: 'DEVICE_SPECS', name: 'PC / Laptop Specs', status: 'MISSING', isSensitive: false, required: true },
          { type: 'AGREEMENT', name: 'Signed Internship Agreement', status: 'MISSING', isSensitive: false, required: true },
        ],
        accessChecklist: [
          { key: 'COMPANY_ACCOUNT', label: 'Official company account prepared', completed: false },
          { key: 'DISCORD_SENT', label: 'Discord invitation sent', completed: false },
          { key: 'DISCORD_JOINED', label: 'Discord joined', completed: false },
          { key: 'GDRIVE_ACCESS', label: 'Google Drive access provided', completed: false },
          { key: 'CALENDAR_ACCESS', label: 'Calendar access prepared', completed: false },
          { key: 'ONBOARDING_GUIDE', label: 'Onboarding Guide provided', completed: false },
          { key: 'ORIENTATION_COMPLETED', label: 'Orientation completed', completed: false },
        ],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  // 4. Log audit event
  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || 'HR Staff', email: callerAuth.token.email || '', role: callerRole },
    'APPLICATION_STAGE_CHANGED',
    'applications',
    applicationId,
    { currentStage: oldStage },
    { currentStage: newStage },
    { reason }
  );

  return { success: true, oldStage, newStage };
});

export const closeVacancy = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER' && callerRole !== 'HR_SUPERVISOR') {
    throw new HttpsError('permission-denied', 'Only HR Supervisors can close a vacancy.');
  }

  const { vacancyId } = request.data || {};
  if (!vacancyId) {
    throw new HttpsError('invalid-argument', 'Vacancy ID is required.');
  }

  const vacancyRef = db.collection('vacancies').doc(vacancyId);
  const vacancySnap = await vacancyRef.get();
  if (!vacancySnap.exists) {
    throw new HttpsError('not-found', 'Vacancy not found.');
  }

  // Aggregate all applications for this vacancy
  const appsSnap = await db.collection('applications').where('vacancyId', '==', vacancyId).get();

  let totalApplications = appsSnap.size;
  let contacted = 0;
  let responses = 0;
  let noResponses = 0;
  let screened = 0;
  let interviewsScheduled = 0;
  let interviewsCompleted = 0;
  let noShows = 0;
  let selected = 0;
  let withdrawn = 0;
  let rejected = 0;
  let onboarded = 0;

  const sourceCounts: Record<string, number> = {};
  const candidateOutcomes: any[] = [];

  for (const doc of appsSnap.docs) {
    const data = doc.data();
    const stage = data.currentStage || 'NEW_APPLICATION';
    const source = data.source || 'Unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;

    if (data.initialEmailSentAt) contacted++;
    if (data.lastCandidateReplyAt) responses++;
    if (stage.includes('SCREENING')) screened++;
    if (stage === 'INTERVIEW_SCHEDULED') interviewsScheduled++;
    if (stage === 'INTERVIEW_COMPLETED') interviewsCompleted++;
    if (stage === 'INTERVIEW_NO_SHOW') noShows++;
    if (stage === 'SELECTED') selected++;
    if (stage === 'WITHDRAWN') withdrawn++;
    if (stage === 'NOT_HIRED' || stage === 'DISQUALIFIED') rejected++;
    if (stage === 'ONBOARDED' || stage === 'ACTIVE_INTERN') onboarded++;

    candidateOutcomes.push({
      applicationId: doc.id,
      candidateId: data.candidateId,
      position: data.positionAppliedFor,
      finalStage: stage,
      source,
    });
  }

  noResponses = Math.max(0, contacted - responses);

  const closeoutReport = {
    closedAt: FieldValue.serverTimestamp(),
    closedBy: callerAuth.uid,
    totalApplications,
    contacted,
    responses,
    noResponses,
    screened,
    interviewsScheduled,
    interviewsCompleted,
    noShows,
    selected,
    withdrawn,
    rejected,
    onboarded,
    sourceBreakdown: sourceCounts,
    candidateOutcomes,
  };

  await vacancyRef.update({
    status: 'CLOSED',
    closeDate: FieldValue.serverTimestamp(),
    closeoutReport,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || 'HR Supervisor', email: callerAuth.token.email || '', role: callerRole },
    'VACANCY_CLOSED',
    'vacancies',
    vacancyId,
    null,
    { status: 'CLOSED', totalApplications, onboarded }
  );

  return { success: true, closeoutReport };
});