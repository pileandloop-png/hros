import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue, Timestamp } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

export const createOnboardingCase = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { applicationId, candidateId, startDate, durationMonths, department, role, supervisorId } = request.data;
  if (!applicationId || !candidateId) {
    throw new HttpsError('invalid-argument', 'Application ID and Candidate ID are required.');
  }

  const months = durationMonths || 4; // Default 4 months for Pile & Loop internship
  const start = startDate ? new Date(startDate) : new Date();
  const expectedEnd = new Date(start);
  expectedEnd.setMonth(expectedEnd.getMonth() + months);

  const onbRef = db.collection('onboardingCases').doc();
  await onbRef.set({
    onboardingId: onbRef.id,
    applicationId,
    candidateId,
    status: 'DOCUMENTS_PENDING',
    department: department || 'General',
    role: role || 'Intern',
    supervisorId: supervisorId || callerAuth.uid,
    startDate: Timestamp.fromDate(start),
    expectedEndDate: Timestamp.fromDate(expectedEnd),
    documentChecklist: [
      { type: 'CNIC_FRONT', name: 'CNIC Front', status: 'MISSING', watermarkStatus: 'UNKNOWN', isSensitive: true, required: true },
      { type: 'CNIC_BACK', name: 'CNIC Back', status: 'MISSING', watermarkStatus: 'UNKNOWN', isSensitive: true, required: true },
      { type: 'TRANSCRIPT', name: 'Degree / Transcript', status: 'MISSING', watermarkStatus: 'UNKNOWN', isSensitive: false, required: true },
      { type: 'SPEED_TEST', name: 'Internet Speed Test Screenshot', status: 'MISSING', isSensitive: false, required: true },
      { type: 'DEVICE_SPECS', name: 'PC / Laptop Specs Screenshot', status: 'MISSING', isSensitive: false, required: true },
      { type: 'AGREEMENT', name: 'Signed Internship Agreement', status: 'MISSING', watermarkStatus: 'UNKNOWN', isSensitive: false, required: true },
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
    createdBy: callerAuth.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, onboardingId: onbRef.id };
});

export const updateDocumentStatus = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { onboardingId, documentType, status, watermarkStatus, notes, storagePath } = request.data;
  if (!onboardingId || !documentType || !status) {
    throw new HttpsError('invalid-argument', 'Missing required document review parameters.');
  }

  const onbRef = db.collection('onboardingCases').doc(onboardingId);
  const snap = await onbRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Onboarding case not found.');
  }

  const data = snap.data()!;
  const checklist = data.documentChecklist || [];
  const targetDoc = checklist.find((d: any) => d.type === documentType);

  if (!targetDoc) {
    throw new HttpsError('not-found', `Document type ${documentType} not found in checklist.`);
  }

  targetDoc.status = status;
  if (watermarkStatus) targetDoc.watermarkStatus = watermarkStatus;
  if (notes !== undefined) targetDoc.notes = notes;
  if (storagePath) targetDoc.storagePath = storagePath;
  targetDoc.reviewedBy = callerAuth.uid;
  targetDoc.reviewedAt = new Date().toISOString();

  await onbRef.update({
    documentChecklist: checklist,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, updatedDocument: targetDoc };
});

export const completeOnboarding = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER' && callerRole !== 'HR_SUPERVISOR') {
    throw new HttpsError('permission-denied', 'Only HR Supervisors or Admins can complete onboarding.');
  }

  const { onboardingId } = request.data || {};
  if (!onboardingId) {
    throw new HttpsError('invalid-argument', 'Onboarding ID is required.');
  }

  const onbRef = db.collection('onboardingCases').doc(onboardingId);
  const onbSnap = await onbRef.get();
  if (!onbSnap.exists) {
    throw new HttpsError('not-found', 'Onboarding case not found.');
  }

  const onbData = onbSnap.data()!;
  const checklist = onbData.documentChecklist || [];

  // Check that all required docs are ACCEPTED
  const unacceptedDocs = checklist.filter((d: any) => d.required && d.status !== 'ACCEPTED');
  if (unacceptedDocs.length > 0) {
    throw new HttpsError(
      'failed-precondition',
      `Cannot complete onboarding. The following required documents are not accepted: ${unacceptedDocs.map((d: any) => d.name).join(', ')}`
    );
  }

  // Fetch candidate details
  const candSnap = await db.collection('candidates').doc(onbData.candidateId).get();
  const candData = candSnap.exists ? candSnap.data()! : {};

  // Atomic batch write
  const batch = db.batch();

  // 1. Update Onboarding Case
  batch.update(onbRef, {
    status: 'COMPLETED',
    completedAt: FieldValue.serverTimestamp(),
    completedBy: callerAuth.uid,
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 2. Update Application stage
  const appRef = db.collection('applications').doc(onbData.applicationId);
  batch.update(appRef, {
    currentStage: 'ONBOARDED',
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 3. Add to stageHistory
  const histRef = appRef.collection('stageHistory').doc();
  batch.set(histRef, {
    historyId: histRef.id,
    stage: 'ONBOARDED',
    changedFrom: 'DOCUMENTS_UNDER_REVIEW',
    changedBy: callerAuth.uid,
    reason: 'Onboarding documents verified and case completed.',
    changedAt: FieldValue.serverTimestamp(),
  });

  // 4. Create PeopleRecord
  const personRef = db.collection('people').doc();
  batch.set(personRef, {
    personId: personRef.id,
    candidateId: onbData.candidateId,
    applicationId: onbData.applicationId,
    onboardingId,
    fullName: candData.fullName || 'New Team Member',
    personalEmail: candData.personalEmail || '',
    phone: candData.phone || '',
    department: onbData.department || 'Creative / Marketing',
    jobTitle: onbData.role || 'Intern',
    workerType: 'INTERN',
    status: 'ACTIVE',
    managerId: onbData.supervisorId || callerAuth.uid,
    joiningDate: onbData.startDate || FieldValue.serverTimestamp(),
    expectedEndDate: onbData.expectedEndDate || null,
    actualEndDate: null,
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    expectedHoursPerDay: 5,
    coreHours: '09:00 - 16:00 PKT',
    leaveAllowanceDaysPerMonth: 3,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || 'Supervisor', email: callerAuth.token.email || '', role: callerRole },
    'ONBOARDING_APPROVED',
    'onboardingCases',
    onboardingId,
    { status: 'DOCUMENTS_UNDER_REVIEW' },
    { status: 'COMPLETED', personId: personRef.id },
    { candidateId: onbData.candidateId }
  );

  return { success: true, personId: personRef.id, message: 'Onboarding completed and PeopleRecord created.' };
});