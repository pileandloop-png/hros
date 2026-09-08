import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, FieldValue, Timestamp } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

function getPktDateKey(): string {
  // Asia/Karachi is UTC+5
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const pktTime = new Date(utc + (3600000 * 5));
  const yyyy = pktTime.getFullYear();
  const mm = String(pktTime.getMonth() + 1).padStart(2, '0');
  const dd = String(pktTime.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const checkIn = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { plannedTasks } = request.data || {};
  const userId = callerAuth.uid;
  const dateKey = getPktDateKey();

  // Enforce single active open session
  const openSessionQuery = await db.collection('attendance')
    .where('userId', '==', userId)
    .where('status', 'in', ['CHECKED_IN', 'ON_BREAK'])
    .limit(1)
    .get();

  if (!openSessionQuery.empty) {
    throw new HttpsError('already-exists', 'You already have an active check-in session. Please check out first.');
  }

  const attendanceRef = db.collection('attendance').doc();
  await attendanceRef.set({
    attendanceId: attendanceRef.id,
    userId,
    userName: callerAuth.token.name || callerAuth.token.email,
    dateKey,
    checkInAt: FieldValue.serverTimestamp(),
    checkOutAt: null,
    status: 'CHECKED_IN',
    plannedTasks: plannedTasks || '',
    tasksCompleted: '',
    blockers: '',
    nextDayPlans: '',
    notes: '',
    workedMinutes: 0,
    breakMinutes: 0,
    netWorkedMinutes: 0,
    breaks: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, attendanceId: attendanceRef.id, dateKey };
});

export const startBreak = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = callerAuth.uid;
  const openSessionQuery = await db.collection('attendance')
    .where('userId', '==', userId)
    .where('status', '==', 'CHECKED_IN')
    .limit(1)
    .get();

  if (openSessionQuery.empty) {
    throw new HttpsError('failed-precondition', 'No active check-in session found.');
  }

  const sessionDoc = openSessionQuery.docs[0];
  const breaks = sessionDoc.data().breaks || [];
  breaks.push({
    startAt: Timestamp.now(),
    endAt: null,
  });

  await sessionDoc.ref.update({
    status: 'ON_BREAK',
    breaks,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, status: 'ON_BREAK' };
});

export const endBreak = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const userId = callerAuth.uid;
  const openSessionQuery = await db.collection('attendance')
    .where('userId', '==', userId)
    .where('status', '==', 'ON_BREAK')
    .limit(1)
    .get();

  if (openSessionQuery.empty) {
    throw new HttpsError('failed-precondition', 'No active break session found.');
  }

  const sessionDoc = openSessionQuery.docs[0];
  const breaks = sessionDoc.data().breaks || [];
  const currentBreak = breaks[breaks.length - 1];
  if (currentBreak && !currentBreak.endAt) {
    currentBreak.endAt = Timestamp.now();
    const durationMins = Math.round((currentBreak.endAt.toMillis() - currentBreak.startAt.toMillis()) / 60000);
    currentBreak.durationMinutes = durationMins;
  }

  const totalBreakMins = breaks.reduce((sum: number, b: any) => sum + (b.durationMinutes || 0), 0);

  await sessionDoc.ref.update({
    status: 'CHECKED_IN',
    breaks,
    breakMinutes: totalBreakMins,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true, status: 'CHECKED_IN', totalBreakMinutes: totalBreakMins };
});

export const checkOut = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { tasksCompleted, blockers, nextDayPlans, notes } = request.data || {};
  const userId = callerAuth.uid;

  const sessionQuery = await db.collection('attendance')
    .where('userId', '==', userId)
    .where('status', 'in', ['CHECKED_IN', 'ON_BREAK'])
    .limit(1)
    .get();

  if (sessionQuery.empty) {
    throw new HttpsError('not-found', 'No open check-in session found to check out from.');
  }

  const sessionDoc = sessionQuery.docs[0];
  const data = sessionDoc.data();
  const checkInTimestamp = data.checkInAt as Timestamp;
  const now = Timestamp.now();

  // If was on break, close open break
  const breaks = data.breaks || [];
  if (data.status === 'ON_BREAK' && breaks.length > 0) {
    const lastBreak = breaks[breaks.length - 1];
    if (!lastBreak.endAt) {
      lastBreak.endAt = now;
      lastBreak.durationMinutes = Math.round((now.toMillis() - lastBreak.startAt.toMillis()) / 60000);
    }
  }

  const totalBreakMins = breaks.reduce((sum: number, b: any) => sum + (b.durationMinutes || 0), 0);
  const totalDurationMins = Math.max(0, Math.round((now.toMillis() - checkInTimestamp.toMillis()) / 60000));
  const netWorkedMins = Math.max(0, totalDurationMins - totalBreakMins);

  await sessionDoc.ref.update({
    checkOutAt: now,
    status: 'CHECKED_OUT',
    tasksCompleted: tasksCompleted || '',
    blockers: blockers || '',
    nextDayPlans: nextDayPlans || '',
    notes: notes || '',
    breaks,
    breakMinutes: totalBreakMins,
    workedMinutes: totalDurationMins,
    netWorkedMinutes: netWorkedMins,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    totalWorkedMinutes: totalDurationMins,
    netWorkedMinutes: netWorkedMins,
    breakMinutes: totalBreakMins,
  };
});

export const correctAttendance = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER' && callerRole !== 'HR_SUPERVISOR') {
    throw new HttpsError('permission-denied', 'Only HR Supervisors can manually correct attendance.');
  }

  const { attendanceId, newNetWorkedMinutes, newStatus, reason } = request.data as {
    attendanceId: string;
    newNetWorkedMinutes: number;
    newStatus?: string;
    reason: string;
  };

  if (!attendanceId || newNetWorkedMinutes === undefined || !reason) {
    throw new HttpsError('invalid-argument', 'Attendance ID, new minutes, and correction reason are required.');
  }

  const attRef = db.collection('attendance').doc(attendanceId);
  const snap = await attRef.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'Attendance record not found.');
  }

  const beforeData = snap.data()!;
  const updates: Record<string, any> = {
    netWorkedMinutes: newNetWorkedMinutes,
    workedMinutes: newNetWorkedMinutes + (beforeData.breakMinutes || 0),
    isCorrected: true,
    correctionReason: reason,
    correctedBy: callerAuth.uid,
    correctedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (newStatus) {
    updates.status = newStatus;
  }

  await attRef.update(updates);

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || 'Supervisor', email: callerAuth.token.email || '', role: callerRole },
    'ATTENDANCE_CORRECTED',
    'attendance',
    attendanceId,
    { netWorkedMinutes: beforeData.netWorkedMinutes, status: beforeData.status },
    { netWorkedMinutes: newNetWorkedMinutes, status: newStatus || beforeData.status },
    { reason }
  );

  return { success: true, message: 'Attendance record updated successfully.' };
});