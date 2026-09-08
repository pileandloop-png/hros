import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue, Timestamp } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

export const createOffboardingCase = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { personId, reason, offboardingType, lastWorkingDate } = request.data;
  if (!personId || !offboardingType) {
    throw new HttpsError('invalid-argument', 'Person ID and offboarding type are required.');
  }

  const personRef = db.collection('people').doc(personId);
  const pSnap = await personRef.get();
  if (!pSnap.exists) {
    throw new HttpsError('not-found', 'Person record not found.');
  }

  const offbRef = db.collection('offboardingCases').doc();
  await offbRef.set({
    offboardingId: offbRef.id,
    personId,
    reason: reason || 'Internship completion',
    offboardingType,
    status: 'IN_PROGRESS',
    noticeDate: FieldValue.serverTimestamp(),
    lastWorkingDate: lastWorkingDate ? Timestamp.fromDate(new Date(lastWorkingDate)) : FieldValue.serverTimestamp(),
    accessRevocationChecklist: [
      { key: 'REVOKE_GDRIVE', label: 'Google Drive access removed', completed: false },
      { key: 'REVOKE_DISCORD', label: 'Discord access removed', completed: false },
      { key: 'DISABLE_EMAIL', label: 'Company email disabled / suspended', completed: false },
      { key: 'CONFIDENTIALITY', label: 'Confidentiality reminder acknowledged', completed: false },
    ],
    documentReturnChecklist: [
      { key: 'FILES_RETURNED', label: 'Company project files returned', completed: false },
      { key: 'ATTENDANCE_FINALIZED', label: 'Attendance record finalized', completed: false },
      { key: 'SUPERVISOR_EVALUATION', label: 'Final performance review completed', completed: false },
    ],
    completionEligibility: {
      isEligibleForCertificate: offboardingType === 'INTERNSHIP_COMPLETED',
      eligibilityReason: offboardingType === 'INTERNSHIP_COMPLETED' ? 'Completed 4-month program' : 'Early departure',
      certificateIssued: false,
      recommendationLetterIssued: false,
    },
    createdBy: callerAuth.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, offboardingId: offbRef.id };
});

export const completeOffboarding = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER' && callerRole !== 'HR_SUPERVISOR') {
    throw new HttpsError('permission-denied', 'Only HR Supervisors can complete offboarding.');
  }

  const { offboardingId, certificateStatus, recommendationLetterStatus, finalNotes } = request.data;
  if (!offboardingId) {
    throw new HttpsError('invalid-argument', 'Offboarding ID is required.');
  }

  const offbRef = db.collection('offboardingCases').doc(offboardingId);
  const offbSnap = await offbRef.get();
  if (!offbSnap.exists) {
    throw new HttpsError('not-found', 'Offboarding case not found.');
  }

  const offbData = offbSnap.data()!;
  const personId = offbData.personId;

  const batch = db.batch();

  // 1. Update Offboarding Case
  batch.update(offbRef, {
    status: 'COMPLETED',
    finalNotes: finalNotes || '',
    'completionEligibility.certificateIssued': certificateStatus === 'ISSUED',
    'completionEligibility.recommendationLetterIssued': recommendationLetterStatus === 'ISSUED',
    completedBy: callerAuth.uid,
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // 2. Update PeopleRecord
  const personRef = db.collection('people').doc(personId);
  batch.update(personRef, {
    status: 'OFFBOARDED',
    actualEndDate: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || 'Supervisor', email: callerAuth.token.email || '', role: callerRole },
    'OFFBOARDING_COMPLETED',
    'offboardingCases',
    offboardingId,
    { status: 'IN_PROGRESS' },
    { status: 'COMPLETED', personId },
    { certificateStatus, recommendationLetterStatus }
  );

  return { success: true, message: 'Offboarding finalized and person archived.' };
});